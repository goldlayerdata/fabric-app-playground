// Runs inside the sandboxed preview iframe (sandbox="allow-scripts", no same-origin).
// Receives the project's compiled files (System modules) from the editor, links them, and draws the
// default export of src/App.tsx with React 19. The Rayfin packages here are simulated: the client is
// real-shaped, and executeQuery asks the parent page, which holds the saved results and the query log.
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot, type Root } from 'react-dom/client';

type ExecuteQueryInput = { query: string; resultSetRowCountLimit?: number };

type RunMessage = {
  type: 'run';
  runId: number;
  files: Record<string, string>;
  entry: string;
  installed: string[];
  connectors: string[];
  env: Record<string, string>;
};
type FromParent =
  | RunMessage
  | { type: 'outline'; on: boolean }
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
    // Sign-in is simulated: the page behaves as if the user were signed in.
    browserSession: () => () => ({ signOut: async () => {} }),
  };

  const SEMANTIC_MODEL_RUNTIME = Symbol('fabricSemanticModel');
  const connectorPackage = {
    fabricSemanticModel: () => ({ operations: { executeQuery: {} }, [SEMANTIC_MODEL_RUNTIME]: true }),
  };

  const rayfinConnectors = {
    connectorsService(options: { configs?: Record<string, { connector?: string }>; runtime?: Record<string, Record<symbol, unknown>> }) {
      return () => {
        const api: Record<string, unknown> = {};
        for (const [name, config] of Object.entries(options?.configs ?? {})) {
          api[name] = {
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
              if (!options.runtime?.[name]?.[SEMANTIC_MODEL_RUNTIME]) {
                return Promise.reject(
                  simulated(
                    `No runtime registered for "${name}". Rayfin 2.0 would then return the raw payload instead of a SemanticModelQueryResult. Add runtime: { ${name}: fabricSemanticModel() }.`,
                  ),
                );
              }
              if (!input || typeof input.query !== 'string') {
                return Promise.reject(new TypeError('executeQuery expects { query: string }'));
              }
              const id = nextQueryId++;
              post({ type: 'query', runId: currentRun, id, query: input.query, limit: input.resultSetRowCountLimit });
              return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
            },
          };
        }
        return api;
      };
    },
  };

  return {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    '@microsoft/rayfin-client': rayfinClient,
    '@microsoft/rayfin-auth': rayfinAuth,
    '@microsoft/rayfin-connectors': rayfinConnectors,
    '@microsoft/rayfin-connector-fabric-semanticmodel': connectorPackage,
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

function link(run: RunMessage): Record<string, unknown> {
  const packages = makePackages(run);
  const cache = new Map<string, Record<string, unknown>>();
  const env = { ...run.env, MODE: 'development', DEV: true, PROD: false, BASE_URL: '/' } as Record<string, any>;

  const resolve = (from: string, spec: string) => {
    if (!spec.startsWith('.')) return spec;
    const parts = from.split('/').slice(0, -1);
    for (const p of spec.split('/')) {
      if (p === '..') parts.pop();
      else if (p !== '.') parts.push(p);
    }
    const base = parts.join('/');
    for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) if (run.files[base + ext] !== undefined) return base + ext;
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

  return load(run.entry);
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
  let Page: unknown;
  try {
    Page = link(msg).default;
  } catch (e) {
    post({ type: 'runtimeError', message: String((e as Error)?.message ?? e) });
    return;
  }
  if (typeof Page !== 'function') {
    post({ type: 'runtimeError', message: `${msg.entry} needs a default export: export default function App() { ... }` });
    return;
  }
  const Component = Page as React.ComponentType;
  root.render(
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>,
  );
  post({ type: 'ran', runId: msg.runId });
}

window.addEventListener('message', (e: MessageEvent<FromParent>) => {
  if (e.source !== parent) return;
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'run') run(msg);
  if (msg.type === 'outline') document.body.classList.toggle('outline-cells', msg.on);
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
