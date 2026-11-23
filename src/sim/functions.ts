// Simulated Rayfin functions with app-identity connections, and a simulated lakehouse Files folder
// in OneLake that a function writes through the ADLS Gen2 create / append / flush calls. For the
// contrast in "Files, two ways" and "Ask in plain words": the signed-in person calls the function,
// but its external calls run as the app.
//
// Functions (https://rayfin.ai/docs/functions, https://rayfin.ai/docs/functions/connections):
// - Registered with `udf.func(name, handler, [])`. Rayfin supplies every parameter annotated
//   `RayfinContext`, wherever it is declared, and the caller passes the rest (installed
//   @microsoft/fabric-user-data-functions 2.0.0, userDataFunctions.js: the arguments are built per
//   declared parameter; the real caller sends them by name in a JSON body, here they are positional).
//   A function without a RayfinContext parameter gets none. Audiences are declared on the context
//   type (`RayfinContext<AppSchema, AudienceType.Storage>`); since type arguments don't exist at run
//   time, the real CLI writes them, and the parameter list, to runtime metadata at build time. Here
//   the caller passes them to `register()`, which plays that metadata.
// - The third argument of `udf.func()`: keep it `[]` in new code (#rules), but connections passed
//   there still work: generic ones (an audience type or custom audience) are unioned with the
//   annotated audiences, and an invalid custom audience makes every invocation fail with
//   UserDataFunctionInternalError (installed userDataFunctions.js, func). Alias connections bind
//   FabricItem parameters, which are not simulated: they are accepted and ignored here.
// - `AudienceType` has exactly Sql, Storage, Fabric, AzureAI and ADO (#supported-audiences). A
//   custom audience is an application ID (GUID) or an https:// or api:// resource URI
//   (functions/connections#custom-audiences; installed types/connection.js, isValidCustomAudience).
// - `ctx.Tokens.<Audience>` holds tokens for the Fabric app identity: "For current Fabric apps, that
//   identity is the owner of the Fabric app item" (#declare-audiences-in-rayfincontext,
//   https://rayfin.ai/docs/functions#understand-the-two-identities). `ctx.user.id` is the signed-in
//   caller's subject id (https://rayfin.ai/docs/functions#understand-the-two-identities).
// - Custom audiences: THE SOURCES DISAGREE on whose token it is. The installed package
//   (userDataFunctions.d.ts, connection()) says it is "issued to the function item's own identity";
//   the installed guide (rayfin-guide functions/connections/index.md, Custom audiences) says "the
//   token is issued to the app identity". Here it is minted like the others, for the app identity.
// - During `rayfin dev`, the tokens belong to the account the local Functions host signs in with
//   (#local-token-identity), so a call that works locally can fail once deployed
//   (https://rayfin.ai/docs/auth/delegated-access#function-connections-run-as-the-app). Mode 'local'.
// - A declared audience with no token throws UserDataFunctionInvalidInputError (errorCode
//   'InvalidInput') with the documented message (#tokens-are-typed-and-bounded; installed
//   types/rayfinContext.js, buildTokenView).
// - Declaring an audience grants nothing: the resource must grant the app identity (#tokens-are-typed-and-bounded).
// - Limits (https://learn.microsoft.com/fabric/data-engineering/user-data-functions/user-data-functions-service-limits):
//   request parameters 4 MB combined, 240 s run time, a 30 MB response. The response check and its
//   message are the installed package's (ensureFormattedReturnType.js: 30 MiB of JSON, errorCode
//   'ResponseTooLarge'; here measured on the return value only). NOT DOCUMENTED: whether 4 MB is
//   1000- or 1024-based (1024 here), and the error for the request and time limits (playground
//   wording). THE SOURCES DISAGREE on the time limit: Learn says 240 seconds; the installed guide
//   (functions/invoking-from-frontend.md) says the host aborts at 250 seconds. 240 s here.
//
// OneLake Files: the installed guide says "Read and write files in a Lakehouse's OneLake storage
// using AudienceType.Storage" (rayfin-guide functions/connections/add-fabric-resource.md), with the
// URL https://onelake.dfs.fabric.microsoft.com/<workspaceId>/<itemId>/Files/<path>, but its example
// only reads (https://rayfin.ai/docs/functions/connections#call-onelake-files). OneLake accepts the
// ADLS Gen2 APIs (https://learn.microsoft.com/fabric/onelake/onelake-access-api), so the write calls
// are mirrored from the ADLS Gen2 REST reference:
// - Create: PUT ?resource=file, 201; the destination is overwritten by default; with
//   If-None-Match: "*" an existing path fails with 409 PathAlreadyExists
//   (https://learn.microsoft.com/rest/api/storageservices/datalakestoragegen2/path/create).
// - Append: PATCH ?action=append&position=<n> with the bytes, 202; uploaded data is not flushed yet.
//   Flush: PATCH ?action=flush&position=<length> with no body, 200; the data must be contiguous and
//   position equal to the file's length after all data, else 400 InvalidFlushPosition; a body on a
//   flush is 400 ContentLengthMustBeZero; x-ms-content-type is stored on flush
//   (https://learn.microsoft.com/rest/api/storageservices/datalakestoragegen2/path/update).
// - Read: GET, 200, or 404 PathNotFound. Errors come as { error: { code, message } }.
// - Who can read and write: workspace Admin, Member and Contributor can do both. A Viewer reads
//   only through a OneLake security role with Read (DefaultReader gives Read to users with ReadAll)
//   and writes only through a role with ReadWrite
//   (https://learn.microsoft.com/fabric/onelake/security/get-started-security#grant-access-with-workspace-roles,
//   https://learn.microsoft.com/fabric/onelake/security/best-practices-secure-data-in-onelake). Here
//   a OneLake role covers the whole item; folder-scoped roles are not simulated.
// NOT DOCUMENTED, chosen here: the status and code for a missing or wrong-audience token (here 401,
// with playground wording), and anything outside Files/ (refused here: not simulated).

import { pg } from './playground';

// ---------------------------------------------------------------- identities and tokens

/** AudienceType of @microsoft/fabric-user-data-functions 2.0.0 (a string enum). */
export const AudienceType = { Sql: 'Sql', Storage: 'Storage', Fabric: 'Fabric', AzureAI: 'AzureAI', ADO: 'ADO' } as const;
/** An AudienceType member, or a custom audience: an application ID (GUID), or an https:// or api:// resource URI. */
export type Audience =
  | (typeof AudienceType)[keyof typeof AudienceType]
  | `https://${string}`
  | `api://${string}`
  | `${string}-${string}-${string}-${string}-${string}`;

/** UDFExceptionCodes of the installed package (errors/udfErrors.js). */
export const UDFExceptionCodes = {
  INVALID_INPUT: 'InvalidInput',
  MISSING_INPUT: 'MissingInput',
  USER_THROWN: 'UserThrown',
  INTERNAL_ERROR: 'InternalError',
  RESPONSE_TOO_LARGE: 'ResponseTooLarge',
} as const;

/** The package's base error: an `errorCode`, a message and `properties`. */
export class UserDataFunctionError extends Error {
  readonly errorCode: string;
  readonly properties: Record<string, unknown>;
  constructor(errorCode: string, message = 'Known User Data Function Exception Thrown', properties: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.errorCode = errorCode;
    this.properties = { ...properties };
  }
}
export class UserDataFunctionInvalidInputError extends UserDataFunctionError {
  constructor(
    message = "Something went wrong when parsing an input to this function. This could be because the provided data couldn't be constructed as the data type provided, or the provided data isn't valid JSON.",
    properties: Record<string, unknown> = {},
  ) {
    super(UDFExceptionCodes.INVALID_INPUT, message, properties);
  }
}
export class UserDataFunctionInternalError extends UserDataFunctionError {
  constructor(message = 'An internal execution error occured during function execution', properties: Record<string, unknown> = {}) {
    super(UDFExceptionCodes.INTERNAL_ERROR, message, properties);
  }
}

/** The installed package's isValidCustomAudience (types/connection.js). */
export function isValidCustomAudience(audience: unknown): boolean {
  if (typeof audience !== 'string' || audience.length === 0 || audience.length > 512 || audience.includes('*') || /[\s\u0000-\u001f\u007f]/.test(audience)) {
    return false;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(audience)) return true;
  let uri: URL;
  try {
    uri = new URL(audience);
  } catch {
    return false;
  }
  if (audience.toLowerCase().endsWith('/.default') || audience.includes('?') || audience.includes('#') || uri.username || uri.password) return false;
  const scheme = uri.protocol.toLowerCase();
  return scheme === 'https:' || scheme === 'api:';
}

/** The package's message when a function declares an invalid custom audience (userDataFunctions.js). */
export const INVALID_CONNECTION_AUDIENCE_MESSAGE = 'This function declares a connection with an invalid custom audience, so it cannot run. Fix the audience and deploy again.';

/** Options of `udf.connection()`, as in the package. */
export type ConnectionOptions = { audienceType: string } | { audience: string } | { alias: string; argName?: string };

/** The package's Connection (types/connection.js): generic connections carry an audience; alias connections bind a FabricItem parameter. */
export class Connection {
  readonly alias?: string;
  readonly argName?: string;
  readonly audienceType?: string;
  readonly audience?: string;
  /** The custom audience when it is not valid (recorded, not thrown, as in the package). */
  readonly invalidAudience?: string;
  constructor(options: ConnectionOptions) {
    if ('alias' in options) {
      this.alias = options.alias;
      this.argName = options.argName ?? options.alias;
    } else if ('audience' in options) {
      if (isValidCustomAudience(options.audience)) this.audience = options.audience;
      else this.invalidAudience = String(options.audience);
    } else {
      this.audienceType = options.audienceType;
    }
  }
  get isGeneric(): boolean {
    return this.audienceType !== undefined || this.audience !== undefined;
  }
  get tokenKey(): string | undefined {
    return this.audience ?? this.audienceType;
  }
}

/** Limits from Learn (user-data-functions-service-limits). */
export const REQUEST_LIMIT_BYTES = 4 * 1024 * 1024;
export const RESPONSE_LIMIT_BYTES = 30 * 1024 * 1024;
export const TIMEOUT_MS = 240_000;
const jsonBytes = (value: unknown) => {
  const text = value === undefined ? '' : JSON.stringify(value);
  return text === undefined ? 0 : new TextEncoder().encode(text).byteLength;
};

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

/** A function body. Its RayfinContext parameter, if any, sits where `contextAt` says. */
export type Handler = (...args: any[]) => unknown;

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
  /** The run-time limit in milliseconds (default 240 s, Learn's limit). */
  timeoutMs?: number;
  onEvent?: (event: FunctionEvent) => void;
};

/** What the CLI's runtime metadata says about one function: its context audiences and where its RayfinContext parameter is. */
export type FunctionMetadata = {
  audiences?: readonly string[];
  /** Index of the RayfinContext parameter among the handler's parameters; null when it has none. Default 0. */
  contextAt?: number | null;
};

export type RegisterOptions = {
  contextAt?: number | null;
  /** Makes every invocation fail with this error, as the package's failing route does. */
  failWith?: () => Error;
};

export interface FunctionHost {
  /** Registers a function, as `udf.func(name, handler, [])` with the audiences of its context type. */
  register(name: string, handler: Handler, audiences?: readonly string[], options?: RegisterOptions): void;
  /** Calls it as the signed-in person; Rayfin supplies the context, the caller passes the rest (in parameter order). */
  invoke(name: string, ...args: unknown[]): Promise<unknown>;
  /** Which identity and audience a token stands for (what a resource would check). */
  tokenInfo(token: string): TokenInfo | undefined;
  names(): string[];
}

type Registered = { handler: Handler; audiences: readonly string[]; contextAt: number | null; failWith?: () => Error };

export function createFunctionHost(options: FunctionHostOptions): FunctionHost {
  const registry = new Map<string, Registered>();
  const tokens = new Map<string, TokenInfo>();

  const mint = (audience: string, identity: Identity) => {
    // Playground: an opaque made-up value. Real tokens are Entra ID access tokens.
    const token = `playground-token.${audience}.${crypto.randomUUID()}`;
    tokens.set(token, { audience, identity });
    return token;
  };

  /** Runs the handler within the time limit. NOT DOCUMENTED: what a caller sees at the limit (playground wording). */
  function withinTimeLimit<T>(name: string, run: Promise<T>): Promise<T> {
    const ms = options.timeoutMs ?? TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(pg(`"${name}" ran longer than ${ms / 1000} seconds, the run-time limit of a function (Learn: 240 seconds; the Rayfin guide: 250).`))),
        ms,
      );
    });
    return Promise.race([run, limit]).finally(() => clearTimeout(timer));
  }

  return {
    register(name, handler, audiences = [], opts = {}) {
      if (registry.has(name)) throw new Error(pg(`a function named "${name}" is already registered.`));
      registry.set(name, { handler, audiences: [...new Set(audiences)], contextAt: opts.contextAt === undefined ? 0 : opts.contextAt, failWith: opts.failWith });
    },
    async invoke(name, ...args) {
      const fn = registry.get(name);
      const caller = options.getCaller();
      const local = (options.mode?.() ?? 'deployed') === 'local';
      const tokenOwner = local ? (options.developer ?? options.appOwner) : options.appOwner;
      const base = { name, caller: caller?.sub ?? null, tokensAs: fn?.audiences.length ? tokenOwner.sub : null, audiences: fn?.audiences ?? [] };
      try {
        if (!fn) throw new Error(pg(`no function named "${name}" is registered (registered: ${[...registry.keys()].join(', ') || 'none'}).`));
        if (fn.failWith) throw fn.failWith();
        if (!caller) throw new Error(pg('nobody is signed in; functions are called with the signed-in session.'));
        const requestBytes = jsonBytes(args);
        if (requestBytes > REQUEST_LIMIT_BYTES) {
          throw new Error(pg(`the parameters of "${name}" are ${requestBytes} bytes; a function takes at most 4 MB of parameters combined.`));
        }
        const callArgs = [...args];
        if (fn.contextAt !== null) {
          const view: Record<string, string> = {};
          for (const audience of fn.audiences) {
            if (options.unminted?.includes(audience)) {
              // As in the package: a declared audience that did not mint is a throwing, non-enumerable accessor.
              Object.defineProperty(view, audience, {
                enumerable: false,
                get() {
                  throw new UserDataFunctionInvalidInputError(missingToken(audience));
                },
              });
            } else {
              view[audience] = mint(audience, tokenOwner);
            }
          }
          const ctx: FunctionContext = Object.freeze({ user: Object.freeze({ id: caller.sub }), Tokens: Object.freeze(view) });
          // Rayfin fills the RayfinContext parameter wherever it is declared; the caller's values fill the rest in order.
          callArgs.splice(Math.min(fn.contextAt, callArgs.length), 0, ctx);
        }
        const value = await withinTimeLimit(name, Promise.resolve().then(() => fn.handler(...callArgs)));
        if (jsonBytes(value) > RESPONSE_LIMIT_BYTES) {
          throw new UserDataFunctionError(UDFExceptionCodes.RESPONSE_TOO_LARGE, "Function's response size is larger than the 30 megabyte limit.");
        }
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
 * and `udf.func(name, handler, [])` register on `host`. `metadataOf(name)` stands in for the runtime
 * metadata the CLI writes from each function's parameters and context annotation (the playground's
 * checker can read them from the TypeScript it already compiles).
 */
export function userDataFunctionsPackage(host: FunctionHost, metadataOf: (name: string) => FunctionMetadata) {
  class UserDataFunctions {
    /** Kept for compatibility; new code declares audiences on the RayfinContext type instead. */
    connection(options: ConnectionOptions): Connection {
      return new Connection(options);
    }
    func(name: string, fn: Handler, connections: readonly unknown[] = []) {
      const meta = metadataOf(name);
      const conns = connections as readonly Partial<Connection>[];
      if (conns.some((c) => c?.invalidAudience !== undefined)) {
        host.register(name, fn, [], { contextAt: meta.contextAt, failWith: () => new UserDataFunctionInternalError(INVALID_CONNECTION_AUDIENCE_MESSAGE) });
        return;
      }
      // Generic connections are unioned with the annotated audiences; alias connections are not simulated.
      const audiences = [...(meta.audiences ?? [])];
      for (const c of conns) {
        if (c?.isGeneric && c.tokenKey && !audiences.includes(c.tokenKey)) audiences.push(c.tokenKey);
      }
      host.register(name, fn, audiences, { contextAt: meta.contextAt });
    }
  }
  return {
    UserDataFunctions,
    AudienceType,
    Connection,
    UDFExceptionCodes,
    UserDataFunctionError,
    UserDataFunctionInvalidInputError,
    UserDataFunctionInternalError,
  };
}

// ---------------------------------------------------------------- simulated OneLake Files

export type WorkspaceRole = 'Admin' | 'Member' | 'Contributor' | 'Viewer';

/** The permission of a OneLake security role (Learn: data-access-control-model). */
export type OneLakePermission = 'Read' | 'ReadWrite';

export type OneLakeItem = { itemId: string; displayName: string };

export type OneLakeOptions = {
  workspaceId: string;
  items: readonly OneLakeItem[];
  /** Workspace roles by identity `sub`. */
  roles: Record<string, WorkspaceRole>;
  /** OneLake security roles by identity `sub`, on the whole item (they matter only for Viewers). */
  oneLakeRoles?: Record<string, OneLakePermission>;
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
    const lakeRole = role === 'Viewer' ? options.oneLakeRoles?.[info.identity.sub] : undefined;
    const write = method !== 'GET' && method !== 'HEAD';
    const writer = role !== undefined && WRITERS.includes(role);
    const allowed = writer || (write ? lakeRole === 'ReadWrite' : lakeRole !== undefined);
    if (!allowed) {
      const who = info.identity.name;
      const why = !role
        ? `${who} has no role in this workspace. Admin, Member and Contributor read and write OneLake data; a Viewer needs a OneLake security role.`
        : write
          ? `${who} has the Viewer role${lakeRole ? ` and a OneLake security role with ${lakeRole}` : ''}. Writing OneLake data needs Admin, Member or Contributor, or a OneLake security role with ReadWrite.`
          : `${who} has the Viewer role and no OneLake security role on this item. Reading OneLake data needs Admin, Member or Contributor, or a OneLake security role with Read or ReadWrite (DefaultReader gives Read to users with ReadAll).`;
      return out(fail(403, 'AuthorizationFailure', `This request is not authorized to perform this operation. ${pg(why)}`));
    }

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
