// Simulated Rayfin functions with app-identity connections, and a simulated lakehouse Files folder
// in OneLake that a function writes through the ADLS Gen2 create / append / flush calls. For the
// contrast in "Files, two ways" and "Ask in plain words": the signed-in person calls the function,
// but its external calls run as the app.
//
// Functions (https://rayfin.ai/docs/functions, https://rayfin.ai/docs/functions/connections):
// - Registered with `udf.func(name, handler, [])`; Rayfin supplies the RayfinContext argument and the
//   caller passes the rest. Audiences are declared on the context type
//   (`RayfinContext<AppSchema, AudienceType.Storage>`); since type arguments don't exist at run time,
//   the real CLI writes them to runtime metadata at build time (installed
//   @microsoft/fabric-user-data-functions 2.0.0, userDataFunctions.d.ts). Here the caller passes them
//   to `register()`, which plays that metadata.
// - `AudienceType` has exactly Sql, Storage, Fabric, AzureAI and ADO (#supported-audiences).
// - `ctx.Tokens.<Audience>` holds tokens for the Fabric app identity: "For current Fabric apps, that
//   identity is the owner of the Fabric app item" (#declare-audiences-in-rayfincontext,
//   https://rayfin.ai/docs/functions#understand-the-two-identities). `ctx.user.id` is the signed-in
//   caller's subject id (https://rayfin.ai/docs/functions#understand-the-two-identities).
// - During `rayfin dev`, the tokens belong to the account the local Functions host signs in with
//   (#local-token-identity), so a call that works locally can fail once deployed
//   (https://rayfin.ai/docs/auth/delegated-access#function-connections-run-as-the-app). Mode 'local'.
// - A declared audience with no token throws, with the documented message (#tokens-are-typed-and-bounded).
// - Declaring an audience grants nothing: the resource must grant the app identity (#tokens-are-typed-and-bounded).
//
// OneLake Files (writing is NOT DOCUMENTED in Rayfin: the docs show only a read, with
// AudienceType.Storage and the URL https://onelake.dfs.fabric.microsoft.com/<workspaceId>/<itemId>/Files/<path>,
// https://rayfin.ai/docs/functions/connections#call-onelake-files). OneLake accepts the ADLS Gen2 APIs
// (https://learn.microsoft.com/fabric/onelake/onelake-access-api). Mirrored from the ADLS Gen2 REST
// reference:
// - Create: PUT ?resource=file, 201; the destination is overwritten by default; with
//   If-None-Match: "*" an existing path fails with 409 PathAlreadyExists
//   (https://learn.microsoft.com/rest/api/storageservices/datalakestoragegen2/path/create).
// - Append: PATCH ?action=append&position=<n> with the bytes, 202; uploaded data is not flushed yet.
//   Flush: PATCH ?action=flush&position=<length> with no body, 200; the data must be contiguous and
//   position equal to the file's length after all data, else 400 InvalidFlushPosition; a body on a
//   flush is 400 ContentLengthMustBeZero; x-ms-content-type is stored on flush
//   (https://learn.microsoft.com/rest/api/storageservices/datalakestoragegen2/path/update).
// - Read: GET, 200, or 404 PathNotFound. Errors come as { error: { code, message } }.
// - Who can write: workspace Admin, Member and Contributor; a Viewer can't read OneLake data without a
//   OneLake security role (https://learn.microsoft.com/fabric/onelake/security/get-started-security#grant-access-with-workspace-roles).
// NOT DOCUMENTED, chosen here: the status and code for a missing or wrong-audience token (here 401,
// with playground wording), and anything outside Files/ (refused here: not simulated).

import { pg } from './playground';

// ---------------------------------------------------------------- identities and tokens

/** AudienceType of @microsoft/fabric-user-data-functions 2.0.0 (a string enum). */
export const AudienceType = { Sql: 'Sql', Storage: 'Storage', Fabric: 'Fabric', AzureAI: 'AzureAI', ADO: 'ADO' } as const;
export type Audience = (typeof AudienceType)[keyof typeof AudienceType] | `https://${string}` | `api://${string}`;

/** A person (or the app's owner) in the simulation. Made-up values only. */
export type Identity = { sub: string; name: string; email?: string };

/** 'deployed': tokens are the app owner's. 'local' (`rayfin dev`): tokens are the developer's. */
export type HostMode = 'deployed' | 'local';

export type TokenInfo = { audience: string; identity: Identity };

/** The documented message for a declared audience that produced no token. */
const missingToken = (audience: string) => `No token available for audience '${audience}'. Ensure a connection with this audience is declared.`;

// ---------------------------------------------------------------- the function host

export type FunctionContext = {
  readonly user: Readonly<{ id: string }>;
  readonly Tokens: Readonly<Record<string, string>>;
};

export type Handler = (ctx: FunctionContext, ...args: any[]) => unknown;

export type FunctionEvent = {
  name: string;
  /** Who called it: the signed-in person. */
  caller: string | null;
  /** Whose tokens its connections used: the app's owner when deployed, the developer locally. */
  tokensAs: string | null;
  audiences: readonly string[];
  ok: boolean;
  error?: string;
};

export type FunctionHostOptions = {
  /** The owner of the Fabric app item: the app identity. */
  appOwner: Identity;
  /** Who runs `rayfin dev`, for mode 'local'. Defaults to the app owner. */
  developer?: Identity;
  /** The signed-in person, or null. Read at each call. */
  getCaller: () => Identity | null;
  mode?: () => HostMode;
  /** Audiences that are declared but produce no token (to show the documented error). */
  unminted?: readonly string[];
  onEvent?: (event: FunctionEvent) => void;
};

export interface FunctionHost {
  /** Registers a function, as `udf.func(name, handler, [])` with the audiences of its context type. */
  register(name: string, handler: Handler, audiences?: readonly string[]): void;
  /** Calls it as the signed-in person; Rayfin supplies the context, the caller passes the rest. */
  invoke(name: string, ...args: unknown[]): Promise<unknown>;
  /** Which identity and audience a token stands for (what a resource would check). */
  tokenInfo(token: string): TokenInfo | undefined;
  names(): string[];
}

export function createFunctionHost(options: FunctionHostOptions): FunctionHost {
  const registry = new Map<string, { handler: Handler; audiences: readonly string[] }>();
  const tokens = new Map<string, TokenInfo>();

  const mint = (audience: string, identity: Identity) => {
    // Playground: an opaque made-up value. Real tokens are Entra ID access tokens.
    const token = `playground-token.${audience}.${crypto.randomUUID()}`;
    tokens.set(token, { audience, identity });
    return token;
  };

  return {
    register(name, handler, audiences = []) {
      if (registry.has(name)) throw new Error(pg(`a function named "${name}" is already registered.`));
      registry.set(name, { handler, audiences: [...audiences] });
    },
    async invoke(name, ...args) {
      const fn = registry.get(name);
      const caller = options.getCaller();
      const local = (options.mode?.() ?? 'deployed') === 'local';
      const tokenOwner = local ? (options.developer ?? options.appOwner) : options.appOwner;
      const base = { name, caller: caller?.sub ?? null, tokensAs: fn?.audiences.length ? tokenOwner.sub : null, audiences: fn?.audiences ?? [] };
      try {
        if (!fn) throw new Error(pg(`no function named "${name}" is registered (registered: ${[...registry.keys()].join(', ') || 'none'}).`));
        if (!caller) throw new Error(pg('nobody is signed in; functions are called with the signed-in session.'));
        const view: Record<string, string> = {};
        for (const audience of fn.audiences) {
          if (options.unminted?.includes(audience)) {
            // As in the package: a declared audience that did not mint is a throwing, non-enumerable accessor.
            Object.defineProperty(view, audience, {
              enumerable: false,
              get() {
                throw new Error(missingToken(audience));
              },
            });
          } else {
            view[audience] = mint(audience, tokenOwner);
          }
        }
        const ctx: FunctionContext = Object.freeze({ user: Object.freeze({ id: caller.sub }), Tokens: Object.freeze(view) });
        const value = await fn.handler(ctx, ...args);
        options.onEvent?.({ ...base, ok: true });
        return value;
      } catch (e) {
        options.onEvent?.({ ...base, ok: false, error: String((e as Error)?.message ?? e) });
        throw e;
      }
    },
    tokenInfo: (token) => tokens.get(token),
    names: () => [...registry.keys()],
  };
}

/**
 * The module the preview can serve as '@microsoft/fabric-user-data-functions': `new UserDataFunctions()`
 * and `udf.func(name, handler, [])` register on `host`. `audiencesOf(name)` stands in for the runtime
 * metadata the CLI writes from each context annotation (the playground's checker can read them from
 * the TypeScript it already compiles).
 */
export function userDataFunctionsPackage(host: FunctionHost, audiencesOf: (name: string) => readonly string[]) {
  class UserDataFunctions {
    func(name: string, fn: Handler, connections: readonly unknown[] = []) {
      if (connections.length) {
        throw new Error(pg('keep the third argument of udf.func() as [] (https://rayfin.ai/docs/functions/connections#rules); connection objects are not simulated.'));
      }
      host.register(name, fn, audiencesOf(name));
    }
  }
  return { UserDataFunctions, AudienceType };
}

// ---------------------------------------------------------------- simulated OneLake Files

export type WorkspaceRole = 'Admin' | 'Member' | 'Contributor' | 'Viewer';

export type OneLakeItem = { itemId: string; displayName: string };

export type OneLakeOptions = {
  workspaceId: string;
  items: readonly OneLakeItem[];
  /** Workspace roles by identity `sub`. */
  roles: Record<string, WorkspaceRole>;
  /** Resolves a bearer token (a function host's tokenInfo). */
  resolveToken: (token: string) => TokenInfo | undefined;
  onEvent?: (event: { method: string; path: string; status: number; by: string | null; code?: string }) => void;
  now?: () => Date;
};

export type OneLakeFile = { item: string; path: string; size: number; contentType: string; writtenBy: string; updatedAt: string; uncommittedBytes: number };

export interface OneLakeSim {
  /** A fetch for function code: only https://onelake.dfs.fabric.microsoft.com/... is answered. */
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  /** The ContosoLake / Files panel: committed files (and how much is appended but not flushed). */
  files(): OneLakeFile[];
  reset(): void;
}

export const ONELAKE_DFS_HOST = 'onelake.dfs.fabric.microsoft.com';

type LakeFile = { committed: Uint8Array; chunks: Map<number, Uint8Array>; contentType: string; writtenBy: string; updatedAt: string };

const WRITERS: readonly WorkspaceRole[] = ['Admin', 'Member', 'Contributor'];

export function createOneLakeSim(options: OneLakeOptions): OneLakeSim {
  const now = options.now ?? (() => new Date());
  const store = new Map<string, LakeFile>();

  function fail(status: number, code: string, message: string) {
    return new Response(JSON.stringify({ error: { code, message } }), { status, headers: { 'Content-Type': 'application/json' } });
  }

  async function handle(method: string, url: URL, headers: Headers, body: Uint8Array): Promise<{ res: Response; by: string | null; key: string }> {
    // /<workspaceId>/<itemId>/Files/<path>
    const [, ws, itemId, area, ...rest] = url.pathname.split('/').map(decodeURIComponent);
    const key = `${itemId}/${rest.join('/')}`;
    const auth = headers.get('Authorization') ?? '';
    const token = /^Bearer (.+)$/.exec(auth)?.[1];
    const info = token ? options.resolveToken(token) : undefined;
    const by = info?.identity.sub ?? null;
    const out = (res: Response) => ({ res, by, key });
    if (!info) return out(fail(401, 'InvalidAuthenticationInfo', pg('no valid bearer token. A function gets one from ctx.Tokens.Storage.')));
    if (info.audience !== AudienceType.Storage) {
      return out(fail(401, 'InvalidAuthenticationInfo', pg(`this token is for audience '${info.audience}'; OneLake files take AudienceType.Storage.`)));
    }
    if (ws !== options.workspaceId) return out(fail(404, 'FilesystemNotFound', 'The specified filesystem does not exist.'));
    if (!options.items.some((i) => i.itemId === itemId)) return out(fail(404, 'ResourceNotFound', 'The specified resource does not exist.'));
    if (area !== 'Files' || rest.length === 0 || rest.some((s) => !s)) {
      return out(fail(400, 'InvalidUri', pg('only files under Files/ are simulated here.')));
    }
    const role = options.roles[info.identity.sub];
    const write = method !== 'GET' && method !== 'HEAD';
    if (!role || role === 'Viewer') {
      return out(
        fail(403, 'AuthorizationFailure', `This request is not authorized to perform this operation. ${pg(`${info.identity.name} has ${role ? 'the Viewer role' : 'no role'} in this workspace; ${write ? 'writing' : 'reading'} OneLake data needs Admin, Member or Contributor.`)}`),
      );
    }
    if (write && !WRITERS.includes(role)) return out(fail(403, 'AuthorizationFailure', 'This request is not authorized to perform this operation.'));

    const q = url.searchParams;
    const file = store.get(key);
    const stamp = now().toISOString();
    if (method === 'PUT') {
      if (q.get('resource') !== 'file') return out(fail(400, 'InvalidQueryParameterValue', pg('this simulation creates files only: PUT ?resource=file.')));
      if (headers.get('If-None-Match') === '*' && file) return out(fail(409, 'PathAlreadyExists', 'The specified path already exists.'));
      store.set(key, { committed: new Uint8Array(), chunks: new Map(), contentType: 'application/octet-stream', writtenBy: info.identity.sub, updatedAt: stamp });
      return out(new Response(null, { status: 201 }));
    }
    if (method === 'PATCH') {
      const action = q.get('action');
      const posText = q.get('position');
      if (!file) return out(fail(404, 'PathNotFound', 'The specified path does not exist.'));
      if (action !== 'append' && action !== 'flush') return out(fail(400, 'InvalidQueryParameterValue', pg('only action=append and action=flush are simulated.')));
      if (posText === null) return out(fail(400, 'MissingRequiredQueryParameter', "A query parameter that's mandatory for this request is not specified."));
      const position = Number(posText);
      if (!Number.isInteger(position) || position < 0) return out(fail(400, 'InvalidQueryParameterValue', 'Value for one of the query parameters specified in the request URI is invalid.'));
      if (action === 'append') {
        file.chunks.set(position, body);
        return out(new Response(null, { status: 202 }));
      }
      if (body.byteLength > 0) return out(fail(400, 'ContentLengthMustBeZero', 'The Content-Length request header must be zero.'));
      // Contiguous from the committed length up to `position`.
      let length = file.committed.byteLength;
      const parts: Uint8Array[] = [file.committed];
      while (length < position) {
        const next = file.chunks.get(length);
        if (!next || next.byteLength === 0) break;
        parts.push(next);
        length += next.byteLength;
      }
      if (length !== position) {
        return out(fail(400, 'InvalidFlushPosition', 'The uploaded data is not contiguous or the position query parameter value is not equal to the length of the file after appending the uploaded data.'));
      }
      const merged = new Uint8Array(length);
      let at = 0;
      for (const p of parts) {
        merged.set(p, at);
        at += p.byteLength;
      }
      file.committed = merged;
      file.chunks.clear(); // retainUncommittedData defaults to false.
      file.contentType = headers.get('x-ms-content-type') ?? file.contentType;
      file.writtenBy = info.identity.sub;
      file.updatedAt = stamp;
      return out(new Response(null, { status: 200 }));
    }
    if (method === 'GET') {
      if (!file) return out(fail(404, 'PathNotFound', 'The specified path does not exist.'));
      return out(new Response(file.committed.slice() as BodyInit, { status: 200, headers: { 'Content-Type': file.contentType, 'Content-Length': String(file.committed.byteLength) } }));
    }
    if (method === 'DELETE') {
      if (!file) return out(fail(404, 'PathNotFound', 'The specified path does not exist.'));
      store.delete(key);
      return out(new Response(null, { status: 200 }));
    }
    return out(fail(405, 'UnsupportedHttpVerb', "The resource doesn't support the specified HTTP verb."));
  }

  return {
    async fetch(input, init) {
      const request = new Request(input as RequestInfo, init);
      const url = new URL(request.url);
      if (url.hostname !== ONELAKE_DFS_HOST) {
        throw new TypeError(pg(`functions here can reach only the simulated OneLake (${ONELAKE_DFS_HOST}), not ${url.hostname}.`));
      }
      const body = new Uint8Array(await request.arrayBuffer());
      const { res, by, key } = await handle(request.method.toUpperCase(), url, request.headers, body);
      let code: string | undefined;
      if (!res.ok) code = ((await res.clone().json()) as { error?: { code?: string } }).error?.code;
      options.onEvent?.({ method: request.method.toUpperCase(), path: key, status: res.status, by, code });
      return res;
    },
    files() {
      return [...store.entries()].map(([key, f]) => {
        const [item, ...path] = key.split('/');
        return {
          item: options.items.find((i) => i.itemId === item)?.displayName ?? item,
          path: `Files/${path.join('/')}`,
          size: f.committed.byteLength,
          contentType: f.contentType,
          writtenBy: f.writtenBy,
          updatedAt: f.updatedAt,
          uncommittedBytes: [...f.chunks.values()].reduce((n, c) => n + c.byteLength, 0),
        };
      });
    },
    reset() {
      store.clear();
    },
  };
}
