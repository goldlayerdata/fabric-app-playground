// Runs inside the sandboxed preview iframe (sandbox="allow-scripts", no same-origin).
// Receives the project's compiled files (System modules) from the editor, links them, and draws the
// default export of packages/frontend/src/App.tsx with React 19. The Rayfin packages here are simulated: the client is
// real-shaped, and executeQuery asks the parent page, which holds the saved results and the query log.
// Connectors are found by name as Rayfin 2.0 finds them (src/connectors-sim.mjs).
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot, type Root } from 'react-dom/client';
import { checkClaimsResult } from './app-data.mjs';
import { connectorsError, createConnectorsApi } from './connectors-sim.mjs';
import { WORKSPACE_MODULES } from './workspace.mjs';

type ExecuteQueryInput = { query: string; resultSetRowCountLimit?: number };

/** Who the playground's "Signed in as" switch says is signing in. */
type Persona = { userId: string; email: string };
/** How sign-in works in this project: the claims function, when rayfin.yml turns dynamic claims on. */
type SignIn = { persona: Persona; claimsFile?: string; contract?: { name: string; type: string }[] };

type RunMessage = {
  type: 'run';
  runId: number;
  files: Record<string, string>;
  entry: string;
  installed: string[];
  connectors: string[];
  env: Record<string, string>;
  signIn: SignIn;
};
type FromParent =
  | RunMessage
  | { type: 'outline'; on: boolean }
  | { type: 'signIn'; runId: number; signIn: SignIn }
  | { type: 'queryResult'; runId: number; id: number; result?: unknown; thrown?: string };

const post = (msg: Record<string, unknown>) => parent.postMessage({ source: 'playground-preview', ...msg }, '*');
const simulated = (text: string) => new Error(`Playground: ${text}`);

let currentRun = 0;
let nextQueryId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

// ---------------------------------------------------------------- simulated Rayfin packages
function makePackages(run: RunMessage): Record<string, unknown> {
  const rayfinClient = {
    RayfinClient: {
      create(config: { baseUrl?: string; publishableKey?: string; auth?: Function; services?: Record<string, Function> }) {
        if (!config?.publishableKey) {
          // The real message (rayfin-lib ApiClient). An empty baseUrl is valid there: same-origin.
          throw new Error('publishableKey is required. Please provide a valid publishable key in the ApiClient configuration.');
        }
        const http = {};
        const lifecycle = { onDispose() {} };
        const client: Record<string, unknown> = { dispose() {} };
        const auth = config.auth?.(http, lifecycle);
        if (auth) client.auth = auth;
        for (const [name, factory] of Object.entries(config.services ?? {})) client[name] = factory(http, lifecycle);
        return client;
      },
    },
    suppliedToken: () => () => undefined,
  };

  const rayfinAuth = {
    // Sign-in is simulated: the session is whoever the playground's switch says, with the claims the
    // project's claims function returned (run here, in this sandbox).
    browserSession: () => () => auth,
  };

  const connectorPackage = {
    fabricSemanticModel: () => ({ operations: { executeQuery: {} }, [SEMANTIC_MODEL_RUNTIME]: true }),
  };

  const rayfinConnectors = {
    // Simulated: the real Source() stores the schema, table and key on the class for @entity() to read.
    Source: () => class {},
    connectorsService(options: { configs?: Record<string, ConnectorConfigLike>; runtime?: Record<string, Record<symbol, unknown>> }) {
      // Each connector's client is made on first use, under its configured key; `runtime` is the entry under
      // that exact key, or undefined (as in Rayfin 2.0, a key that differs only by case is never found).
      return () =>
        createConnectorsApi(options?.configs ?? {}, options?.runtime, (name: string, config: ConnectorConfigLike, runtime?: Record<symbol, unknown>) =>
          ENTITY_CONNECTORS.includes(String(config?.connector)) ? entityConnector(run, name, config) : semanticConnector(run, name, config, runtime),
        );
    },
  };

  // Decorators record metadata for the Rayfin CLI; in the page they change nothing, so here they do nothing.
  const decorator = () => () => undefined;
  const rayfinCore = Object.fromEntries(
    ['entity', 'role', 'authenticated', 'anonymous', 'uuid', 'int', 'decimal', 'text', 'email', 'date', 'boolean', 'set'].map((n) => [n, decorator]),
  );

  // The functions package, as a claims function sees it: `authClaims` records the handler for sign-in.
  const userDataFunctions = {
    AudienceType: { Sql: 'Sql', Storage: 'Storage', Fabric: 'Fabric', AzureAI: 'AzureAI', ADO: 'ADO' },
    UserDataFunctions: class {
      func() {}
      authClaims(handler: ClaimsHandler) {
        if (claimsHandler) throw new Error('At most one udf.authClaims per app: a second registration fails.');
        claimsHandler = handler;
      }
    },
  };

  return {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    '@microsoft/rayfin-client': rayfinClient,
    '@microsoft/rayfin-auth': rayfinAuth,
    '@microsoft/rayfin-connectors': rayfinConnectors,
    '@microsoft/rayfin-connector-fabric-semanticmodel': connectorPackage,
    '@microsoft/rayfin-core': rayfinCore,
    '@microsoft/rayfin-data': { dataService: () => () => dataApi() },
    '@microsoft/fabric-user-data-functions': userDataFunctions,
    // Types only: the package has no runtime code.
    '@microsoft/rayfin-connector-fabric-graphql': {},
  };
}

// ---------------------------------------------------------------- semantic model connectors (Category B)
const SEMANTIC_MODEL_RUNTIME = Symbol.for('playground:fabricSemanticModel');

/**
 * `client.connectors.<name>` for a semantic model. With its runtime (`fabricSemanticModel()`), executeQuery
 * resolves with a result: a `status`, then a table or an error. Without one, it resolves with the raw payload
 * the transport received, undecoded, and nothing throws: Rayfin 2.0's operation proxy hands the transport's
 * result back as it is when no decoder is registered (rayfin-connectors SemanticConnectorClient.js).
 */
function semanticConnector(run: RunMessage, name: string, config: ConnectorConfigLike, runtime?: Record<symbol, unknown>) {
  return {
    // Simulated: the course never uses `connection`. A real semantic model connector is
    // delegated, so its status comes from the signed-in user's connection.
    connection: {
      status: async () => ({ connector: name, status: 'NotRequired' }),
      connect: async () => ({ connector: name, status: 'NotRequired' }),
    },
    executeQuery(input: ExecuteQueryInput): Promise<unknown> {
      if (!run.connectors.includes(name)) {
        return Promise.reject(simulated(`rayfin/rayfin.yml has no connector named "${name}" (it has: ${run.connectors.join(', ') || 'none'}).`));
      }
      if (config?.connector !== 'fabric-semanticmodel') {
        return Promise.reject(simulated(`The "${name}" config is not a semantic model connector.`));
      }
      // Semantic model connectors run as the signed-in person (delegated only): with no session, no query.
      if (!session.isAuthenticated) {
        return Promise.reject(simulated('Nobody is signed in, and a semantic model query runs as the signed-in person (delegated).'));
      }
      if (!input || typeof input.query !== 'string') {
        return Promise.reject(new TypeError('executeQuery expects { query: string }'));
      }
      const id = nextQueryId++;
      const decoded = Boolean(runtime?.[SEMANTIC_MODEL_RUNTIME]);
      post({ type: 'query', runId: currentRun, id, connector: name, decoded, query: input.query, limit: input.resultSetRowCountLimit });
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
  };
}

// ---------------------------------------------------------------- the app's own data (client.data)
// Each call goes to the parent page, which answers as the app's data API would, as the person signed in:
// it checks the entity's permission rules against their claims (Playground: on Fabric, the data API
// does this on the server, and the real client sends GraphQL).
type DataState = { select?: string[]; where?: unknown; orderBy?: Record<string, string>; first?: number; after?: string };

function sendData(msg: Record<string, unknown>): Promise<unknown> {
  const id = nextQueryId++;
  post({ type: 'data', runId: currentRun, id, ...msg });
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function dataApi() {
  const cache = new Map<string, unknown>();
  return new Proxy(
    {},
    {
      get(_t, entity) {
        if (typeof entity !== 'string' || entity === 'then') return undefined;
        if (!cache.has(entity)) cache.set(entity, entityData(entity));
        return cache.get(entity);
      },
    },
  );
}

function entityData(entity: string): Record<string, unknown> {
  const read = (state: DataState, kind: 'execute' | 'paged' | 'first') => sendData({ entity, op: 'read', kind, state });
  const builder = (state: DataState): Record<string, unknown> => ({
    select: (fields: string[]) => builder({ ...state, select: [...fields] }),
    where: (where: unknown) => builder({ ...state, where }),
    orderBy: (orderBy: Record<string, string>) => builder({ ...state, orderBy }),
    first: (first: number) => builder({ ...state, first }),
    after: (after: string) => builder({ ...state, after }),
    execute: () => read(state, 'execute'),
    executePaginated: () => read(state, 'paged'),
    findFirst: () => read({ ...state, first: 1 }, 'first'),
  });
  return {
    ...builder({}),
    // These return only the primary key (rayfin.ai: Querying).
    findMany: (filter?: unknown) => read({ where: filter }, 'execute'),
    findFirst: (filter?: unknown) => read({ where: filter, first: 1 }, 'first'),
    findById: (id: string) => read({ where: { id: { eq: id } }, first: 1 }, 'first'),
    create: (input: Record<string, unknown>) => sendData({ entity, op: 'create', input }),
    update: (where: { id: string }, input: Record<string, unknown>) => sendData({ entity, op: 'update', recordId: where?.id, input }),
    delete: (where: { id: string }) => sendData({ entity, op: 'delete', recordId: where?.id }),
  };
}

// ---------------------------------------------------------------- sign-in (simulated)
type Session = { user: { id: string; email: string } | null; isAuthenticated: boolean; isAnonymous: boolean; expiresAt?: Date };
type ClaimsHandler = (ctx: unknown) => unknown;

const signedOut: Session = { user: null, isAuthenticated: false, isAnonymous: false };
let session: Session = signedOut;
let claims: Record<string, unknown> = {};
let claimsHandler: ClaimsHandler | undefined;
let loadModule: ((id: string) => Record<string, unknown>) | undefined;
const listeners = new Set<(s: Session | null) => void>();

/** The real Auth SDK's error: a code and a message (rayfin.ai: Dynamic auth claims, handle sign-in errors). */
function authError(code: string, message: string) {
  const e = new Error(message) as Error & { code: string };
  e.name = 'AuthError';
  e.code = code;
  return e;
}

const auth = {
  getSession: () => session,
  onSessionChange(cb: (s: Session | null) => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  // Tokens carry every app-defined claim as a string, so the browser gets strings (rayfin.ai: read claims in the browser).
  async getClaims() {
    if (!session.isAuthenticated) throw authError('NO_SESSION', 'No one is signed in.');
    return Object.fromEntries(Object.entries(claims).map(([k, v]) => [k, String(v)]));
  },
  async refreshSession() {
    if (!session.isAuthenticated) throw authError('NO_SESSION', 'No one is signed in.');
    return { accessToken: 'simulated', tokenType: 'Bearer', expiresIn: 3600 };
  },
  async signOut() {
    setSession(signedOut, {});
  },
};

function setSession(next: Session, nextClaims: Record<string, unknown>) {
  session = next;
  claims = nextClaims;
  for (const cb of [...listeners]) cb(next.isAuthenticated ? next : null);
}

class SignInDenied extends Error {}

/**
 * Sign in the switch's person: the base claims, plus the claims function's result when rayfin.yml turns
 * dynamic claims on. Fails closed, as Rayfin's docs describe: a denial, a throw or a bad result means no
 * session. Tells the parent page who is signed in, for the Log and the permission checks.
 */
async function signIn(runId: number, s: SignIn) {
  // `role`: as @microsoft/rayfin-auth types a signed-in person's role (roles.d.ts: 'Anonymous' | 'Authenticated').
  const base = { sub: s.persona.userId, email: s.persona.email, role: 'Authenticated' };
  let error: { code: string; message: string } | undefined;
  let extra: Record<string, unknown> = {};
  if (s.claimsFile) {
    try {
      if (!claimsHandler && loadModule) loadModule(s.claimsFile);
      if (!claimsHandler) throw new Error('The claims function is not registered: no udf.authClaims(...) ran.');
      const ctx = Object.freeze({
        auth: Object.freeze({ userId: s.persona.userId, email: s.persona.email }),
        getSecret: () => undefined,
        denySignIn: (reason?: string): never => {
          throw new SignInDenied(String(reason ?? 'Sign-in was denied by the app.').trim().slice(0, 256));
        },
      });
      const result = await Promise.race([
        Promise.resolve().then(() => (claimsHandler as ClaimsHandler)(ctx)),
        new Promise((_, reject) => setTimeout(() => reject(authError('AUTH_CLAIMS_UNAVAILABLE', 'The claims function did not answer within 10 seconds.')), 10_000)),
      ]);
      const bad = checkClaimsResult(result, s.contract);
      if (bad) error = { code: 'AUTH_CLAIMS_INVALID_OUTPUT', message: `The claims function returned claims that don't match the rules: ${bad}.` };
      else extra = result as Record<string, unknown>;
    } catch (e) {
      error =
        e instanceof SignInDenied
          ? { code: 'SIGN_IN_DENIED', message: e.message }
          : (e as { code?: string }).code === 'AUTH_CLAIMS_UNAVAILABLE'
            ? { code: 'AUTH_CLAIMS_UNAVAILABLE', message: (e as Error).message }
            : { code: 'AUTH_CLAIMS_FAILED', message: `The claims function threw: ${(e as Error)?.message ?? e}` };
    }
  }
  if (runId !== currentRun) return;
  if (error) setSession(signedOut, {});
  else {
    setSession(
      { user: { id: s.persona.userId, email: s.persona.email }, isAuthenticated: true, isAnonymous: false, expiresAt: new Date(Date.now() + 3_600_000) },
      { ...base, ...extra },
    );
  }
  post({ type: 'identity', runId, signedIn: !error, claims: error ? {} : { ...base, ...extra }, error });
}

// ---------------------------------------------------------------- simulated entity connectors (Category A)
type ConnectorConfigLike = { connector?: string; operations?: readonly string[]; entities?: Record<string, unknown> };
const ENTITY_CONNECTORS = ['fabric-sqlanalytics', 'fabric-warehouse', 'fabric-sqldatabase'];

// @microsoft/rayfin-connectors 2.0.0: the methods each operation allows (ConnectorsSchema METHODS_FOR_CRUD_OPERATION).
const METHODS_FOR_CRUD_OPERATION: Record<string, string[]> = {
  read: ['select', 'where', 'orderBy', 'first', 'groupBy', 'aggregate', 'findMany', 'findFirst', 'findByKey'],
  create: ['create'],
  update: ['update'],
  delete: ['delete'],
};

type ReadState = { select?: string[]; where?: unknown; orderBy?: Record<string, string>; first?: number; after?: string };

/** `client.connectors.<name>`: one client per entity, reached by name, gated by the connector's operations. */
function entityConnector(run: RunMessage, name: string, config: ConnectorConfigLike) {
  const disallowed = new Set<string>();
  if (config.operations) {
    for (const [verb, methods] of Object.entries(METHODS_FOR_CRUD_OPERATION)) {
      if (!config.operations.includes(verb)) methods.forEach((m) => disallowed.add(m));
    }
  }
  const cache = new Map<string, unknown>();
  return new Proxy(
    {},
    {
      get(_target, entity) {
        if (typeof entity !== 'string' || entity === 'then') return undefined;
        if (!cache.has(entity)) cache.set(entity, gate(entityClient(run, name, entity, config), name, entity, disallowed));
        return cache.get(entity);
      },
    },
  );
}

function gate(client: Record<string, unknown>, name: string, entity: string, disallowed: Set<string>) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && disallowed.has(prop)) {
        return () => {
          throw connectorsError(`Operation "${prop}" on connector "${name}" entity "${entity}" is not in the connector's allowed operations.`, 'OPERATION_NOT_ALLOWED');
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function entityClient(run: RunMessage, name: string, entity: string, config: ConnectorConfigLike): Record<string, unknown> {
  const send = (state: ReadState, kind: 'execute' | 'paged' | 'first'): Promise<unknown> => {
    if (!run.connectors.includes(name)) {
      return Promise.reject(simulated(`rayfin/rayfin.yml has no connector named "${name}" (it has: ${run.connectors.join(', ') || 'none'}).`));
    }
    if (!state.select?.length) return Promise.reject(connectorsError('A read requires an explicit .select([...]).', 'SELECTION_REQUIRED'));
    const id = nextQueryId++;
    post({ type: 'read', runId: currentRun, id, connector: name, entity, kind, state });
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  const builder = (state: ReadState): Record<string, unknown> => ({
    select: (fields: string[]) => builder({ ...state, select: [...fields] }),
    where: (where: unknown) => builder({ ...state, where }),
    orderBy: (orderBy: Record<string, string>) => builder({ ...state, orderBy }),
    first: (first: number) => builder({ ...state, first }),
    after: (after: string) => builder({ ...state, after }),
    execute: () => send(state, 'execute'),
    executePaginated: () => send(state, 'paged'),
    findFirst: () => send({ ...state, first: 1 }, 'first'),
  });
  // Reads without a selection use the connector's registered columns, when it lists them.
  const registered = () => (Array.isArray(config.entities?.[entity]) ? [...(config.entities![entity] as string[])] : undefined);
  const notSimulated = (what: string) => () => Promise.reject(simulated(`${what} is not simulated here: the lakehouse connector only reads.`));
  return {
    ...builder({}),
    findMany: (fields?: unknown, filter?: unknown) =>
      Array.isArray(fields) ? send({ select: fields, where: filter }, 'execute') : send({ select: registered(), where: fields }, 'execute'),
    findFirst: (fields?: unknown, filter?: unknown) =>
      Array.isArray(fields) ? send({ select: fields, where: filter, first: 1 }, 'first') : send({ select: registered(), where: fields, first: 1 }, 'first'),
    findByKey: () => Promise.reject(simulated(`${entity} has no primary key here, so it has no findByKey.`)),
    create: notSimulated('create'),
    update: notSimulated('update'),
    delete: notSimulated('delete'),
  };
}

// ---------------------------------------------------------------- linking the project's modules
type Registration = {
  deps: string[];
  declare: (
    exp: (name: string | Record<string, unknown>, value?: unknown) => unknown,
    ctx: { id: string; meta: { env: Record<string, string>; url: string } },
  ) => { setters: ((m: unknown) => void)[]; execute?: () => void };
};

function link(run: RunMessage): (id: string) => Record<string, unknown> {
  const packages = makePackages(run);
  const cache = new Map<string, Record<string, unknown>>();
  const env = { ...run.env, MODE: 'development', DEV: true, PROD: false, BASE_URL: '/' } as Record<string, any>;

  const resolve = (from: string, spec: string) => {
    // npm workspaces link @rayfin-app/* by name: the package's src.
    if (WORKSPACE_MODULES[spec] && run.files[WORKSPACE_MODULES[spec]] !== undefined) return WORKSPACE_MODULES[spec];
    if (!spec.startsWith('.')) return spec;
    const parts = from.split('/').slice(0, -1);
    for (const p of spec.split('/')) {
      if (p === '..') parts.pop();
      else if (p !== '.') parts.push(p);
    }
    const base = parts.join('/');
    // A file imported as text, as Vite does with `?raw`: the editor sends it as it is, under `<path>?raw`.
    if (base.endsWith('?raw')) {
      if (run.files[base] !== undefined) return base;
      throw simulated(`Cannot find "${spec}", imported from ${from}.`);
    }
    const noJs = base.replace(/\.js$/, '');
    for (const b of [base, noJs]) for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) if (run.files[b + ext] !== undefined) return b + ext;
    throw simulated(`Cannot find "${spec}", imported from ${from}.`);
  };

  const load = (id: string): Record<string, unknown> => {
    const cached = cache.get(id);
    if (cached) return cached;
    if (run.files[id] === undefined) {
      if (!(id in packages)) throw simulated(`"${id}" is not simulated here.`);
      const installedName = id.startsWith('react') ? 'react' : id;
      if (!run.installed.includes(installedName)) {
        throw simulated(`Cannot load "${id}": it isn't installed in this project yet. Run the npm install from the lesson.`);
      }
      return packages[id] as Record<string, unknown>;
    }
    if (id.endsWith('?raw')) {
      const text = { __esModule: true, default: run.files[id] };
      cache.set(id, text);
      return text;
    }
    const exportsObj: Record<string, unknown> = {};
    cache.set(id, exportsObj);
    let reg: Registration | undefined;
    const System = { register: (deps: string[], declare: Registration['declare']) => (reg = { deps, declare }) };
    // TypeScript's System output with jsx: react-jsx calls _jsx, _jsxs and _Fragment but binds the
    // jsx-runtime import under another name (checked with TypeScript 5.9.3), so supply them here.
    new Function('System', '_jsx', '_jsxs', '_Fragment', `${run.files[id]}\n//# sourceURL=${id}`)(
      System,
      jsxRuntime.jsx,
      jsxRuntime.jsxs,
      jsxRuntime.Fragment,
    );
    if (!reg) throw simulated(`${id} did not compile to a module.`);
    const exp = (name: string | Record<string, unknown>, value?: unknown) => {
      if (typeof name === 'object') Object.assign(exportsObj, name);
      else exportsObj[name] = value;
      return value;
    };
    const decl = reg.declare(exp, { id, meta: { env, url: id } });
    reg.deps.forEach((d, i) => decl.setters[i]?.(load(resolve(id, d))));
    decl.execute?.();
    return exportsObj;
  };

  return load;
}

// ---------------------------------------------------------------- drawing
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    post({ type: 'runtimeError', message: String(error?.message ?? error) });
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

let root: Root | undefined;
const mount = document.getElementById('page')!;

function run(msg: RunMessage) {
  currentRun = msg.runId;
  for (const p of pending.values()) p.reject(new Error('Superseded by a newer run'));
  pending.clear();
  root?.unmount();
  root = createRoot(mount);

  if (!msg.files[msg.entry]?.trim()) {
    post({ type: 'empty', runId: msg.runId });
    return;
  }
  listeners.clear();
  claimsHandler = undefined;
  try {
    loadModule = link(msg);
  } catch (e) {
    post({ type: 'runtimeError', message: String((e as Error)?.message ?? e) });
    return;
  }
  // Sign in first, so the page draws with a session (as the template's sign-in does before showing the app).
  void signIn(msg.runId, msg.signIn).then(() => {
    if (msg.runId !== currentRun) return;
    let Page: unknown;
    try {
      Page = loadModule!(msg.entry).default;
    } catch (e) {
      post({ type: 'runtimeError', message: String((e as Error)?.message ?? e) });
      return;
    }
    if (typeof Page !== 'function') {
      post({ type: 'runtimeError', message: `${msg.entry} needs a default export: export default function App() { ... }` });
      return;
    }
    const Component = Page as React.ComponentType;
    root!.render(
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>,
    );
    post({ type: 'ran', runId: msg.runId });
  });
}

window.addEventListener('message', (e: MessageEvent<FromParent>) => {
  if (e.source !== parent) return;
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'run') run(msg);
  if (msg.type === 'outline') document.body.classList.toggle('outline-cells', msg.on);
  if (msg.type === 'signIn' && msg.runId === currentRun) void signIn(msg.runId, msg.signIn);
  if (msg.type === 'queryResult' && msg.runId === currentRun) {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.thrown) p.reject(new Error(msg.thrown));
    else p.resolve(msg.result);
  }
});

// Browser extensions can inject scripts into the preview too; their errors are not the page's.
const fromExtension = (text: string | undefined) => /(chrome|moz|safari-web)-extension:\/\//.test(text ?? '');

window.addEventListener('error', (e) => {
  if (fromExtension(e.filename) || fromExtension((e.error as Error | undefined)?.stack)) return;
  post({ type: 'runtimeError', message: e.message });
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason as Error | undefined;
  if (reason?.message === 'Superseded by a newer run') return;
  if (fromExtension(reason?.stack)) return;
  post({ type: 'runtimeError', message: `Unhandled promise rejection: ${reason?.message ?? String(e.reason)}` });
});

post({ type: 'ready' });
