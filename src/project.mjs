// The learner's project and the simulated terminal. Pure functions: the app and
// tools/check-lessons.mjs both use them, so the checker builds the course exactly as a reader would.
//
// A project is { cwd, appDir, files: { path: text }, packages: [names], dev, devFunctions, history: [lines] }.
// Paths are relative to the app folder. `cwd` is null in the starting folder, or the app folder's name.
//
// What the simulated CLI writes comes from real sources (see each command). Wording the real CLI
// prints that we could not check is not imitated: those lines start with "Playground:".
import lakehouse from '../data/lakehouse.json' with { type: 'json' };
import { claimsContract, claimsTypesFile, dataService, emptyDb, planApply, unlimitedText } from './app-data.mjs';
import { CONNECTORS_KIT, WIRING } from './wiring-fixtures.mjs';
import { DATA_KIT_INDEX, DATA_KIT_ITEM, FUNCTIONS_KIT_APP, FUNCTIONS_KIT_PACKAGE, SHARED_KIT_INDEX } from './pack-kits.mjs';
import { WORKSPACE_MODULES } from './workspace.mjs';

export { WORKSPACE_MODULES };

// ---------------------------------------------------------------- the default template: Universal App (Rayfin CLI 2.0.0)
// `--template blankapp` is the Universal App (rayfin-guide: getting-started/create-app-with-cli.md, cli/templates.md;
// rayfin-tools-common templates/scaffolding.js, addBundledTemplateAliases). From @microsoft/rayfin-cli 2.0.0
// templates/universal-app (MIT, Microsoft Corporation): the four package.json files' scripts and dependencies verbatim
// (the root's description, license, author and template fields left out); rayfin/rayfin.yml verbatim but for `id` and
// `name`, which `rayfin init --from-template` sets from the app's name (commands/init.js, applyRayfinYmlIdentityEdits);
// packages/frontend/src/vite-env.d.ts verbatim. The root package.json `name` is the app's slug (templates/scaffolding.js,
// customizeTemplateFiles); member package names never change (rayfin-guide project-structure.md). The `finley` feature
// overlay is not applied by default, so create removes it (templates/engine/features.js). App names are limited to the
// slug's shape, so all names are the folder name. Most of the template's other files, and the agent files the CLI adds
// after creating it, are locked placeholders (TEMPLATE_PLACEHOLDERS), one or two lines each, written for the playground.
// Two files are stand-ins with working code, written for the playground and locked: the template's client
// (packages/frontend/src/lib/rayfin-client.ts) and, once the analytics pack adds it, its query hook.
export const FE = 'packages/frontend';
const ROOT_PACKAGE = {
  private: true,
  version: '0.0.0',
  type: 'module',
  engines: { node: '>=22.13.0' },
  workspaces: ['packages/*'],
  scripts: {
    dev: 'rayfin dev',
    'dev:frontend': 'npm run -w @rayfin-app/frontend dev',
    build: 'npm run -w @rayfin-app/shared build && npm run -w @rayfin-app/data build && npm run -w @rayfin-app/frontend build',
    'build:fabric': 'npm run -w @rayfin-app/shared build && npm run -w @rayfin-app/data build && npm run -w @rayfin-app/frontend build:fabric',
    lint: 'npm run -w @rayfin-app/frontend lint',
    preview: 'npm run -w @rayfin-app/frontend preview',
    test: 'npm run -w @rayfin-app/frontend test',
    'test:watch': 'npm run -w @rayfin-app/frontend test:watch',
    typecheck: 'tsc -b',
    'pack:add': 'node scripts/scaffold.mjs',
    'test:template': 'node scripts/run-template-tests.mjs',
    'rayfin:up': 'rayfin up',
  },
  devDependencies: { '@microsoft/rayfin-cli': '^2.0.0', '@microsoft/rayfin-guide': '^2.0.0', typescript: '~6.0.2' },
};
const FRONTEND_PACKAGE = {
  name: '@rayfin-app/frontend',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    prebuild: 'rayfin env --framework vite',
    'prebuild:fabric': 'rayfin env --framework vite',
    dev: 'vite',
    build: 'tsc -b --noCheck && vite build',
    'build:fabric': 'tsc -b --noCheck && vite build',
    lint: 'eslint .',
    preview: 'vite preview',
    test: 'vitest run',
    'test:watch': 'vitest',
  },
  dependencies: {
    '@microsoft/rayfin-auth': '^2.0.0',
    '@microsoft/rayfin-auth-provider-fabric': '^2.0.0',
    '@microsoft/rayfin-client': '^2.0.0',
    '@microsoft/rayfin-data': '^2.0.0',
    '@microsoft/rayfin-lib': '^2.0.0',
    '@rayfin-app/shared': '*',
    '@tailwindcss/vite': '^4.3.0',
    clsx: '^2.1.1',
    'framer-motion': '^12.40.0',
    'lucide-react': '^1.17.0',
    react: '^19.2.7',
    'react-dom': '^19.2.7',
    'react-error-boundary': '^6.1.2',
    'tailwind-merge': '^3.6.0',
    tailwindcss: '^4.3.0',
  },
  devDependencies: {
    '@eslint/js': '^9.21.0',
    '@microsoft/rayfin-local-dev': '^2.0.0',
    '@testing-library/dom': '^10.4.1',
    '@testing-library/jest-dom': '^6.9.1',
    '@testing-library/react': '^16.3.2',
    '@types/react': '^19.2.17',
    '@types/react-dom': '^19.2.3',
    '@vitejs/plugin-react-swc': '^4.3.1',
    eslint: '^10.4.1',
    'eslint-plugin-react-hooks': '^7.1.1',
    'eslint-plugin-react-refresh': '^0.5.2',
    globals: '^17.6.0',
    jsdom: '^29.1.1',
    'rollup-plugin-license': '^3.7.1',
    typescript: '~6.0.2',
    'typescript-eslint': '^8.38.0',
    vite: '^8.0.16',
    vitest: '^4.1.8',
  },
};
const DATA_PACKAGE = {
  name: '@rayfin-app/data',
  private: true,
  version: '0.0.0',
  type: 'module',
  exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
  scripts: { build: 'tsc -b' },
  dependencies: { '@microsoft/rayfin-core': '^2.0.0', '@rayfin-app/shared': '*' },
  devDependencies: { '@types/node': '^20.4.2', typescript: '~6.0.2' },
};
const SHARED_PACKAGE = {
  name: '@rayfin-app/shared',
  private: true,
  version: '0.0.0',
  type: 'module',
  exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
  scripts: { build: 'tsc -b' },
  devDependencies: { typescript: '~6.0.2' },
};
const json = (o) => `${JSON.stringify(o, null, 2)}\n`;
/** The workspace packages, by the name `npm install -w` takes. */
export const WORKSPACES = { '@rayfin-app/frontend': FE, '@rayfin-app/data': 'packages/data', '@rayfin-app/shared': 'packages/shared' };

const TEMPLATE_RAYFIN_YML = `id: universal-app
name: Universal App
version: 1.0.0
services:
  auth:
    enabled: true
    fabric:
      enabled: true
      externalEntraExchange: true
    password:
      enabled: false
    allowedRedirectUris:
      - http://localhost:5173
  data:
    enabled: false
    path: packages/data
    buildCommand: npm run build
  staticHosting:
    enabled: true
    path: packages/frontend
    folder: dist
    buildCommand: npm run build:fabric
    indexDocument: index.html
    assetAccess: protected
    embedded:
      only: false
`;

// packages/shared/src/index.ts and packages/data/src/index.ts: the template's code, with our own one-line comments
// (the template's are longer). Editable: the app-data lessons add to them.
export const TEMPLATE_SHARED_INDEX = `// The record types the data package and the browser share (empty until the app owns data).
export type UniversalAppSchema = Record<string, never>;
`;
export const TEMPLATE_DATA_INDEX = `// The app's data schema: its entities, registered in \`schema\` (none until the app owns data).
export type { UniversalAppSchema } from '@rayfin-app/shared';

export const schema = [];
`;

// The template's client, as a working stand-in (locked). Same exported function as the real one, getRayfinClient().
export const CLIENT_STANDIN = `// Playground: a stand-in for the template's client, shortened: the same getRayfinClient(). The real one also resolves
// the app's settings at run time (rayfin.config.json) and says which ones are missing.
import { RayfinClient } from '@microsoft/rayfin-client';
import { browserSession } from '@microsoft/rayfin-auth';
import { dataService } from '@microsoft/rayfin-data';
import type { UniversalAppSchema } from '@rayfin-app/shared';

function createClient() {
  return RayfinClient.create({
    baseUrl: import.meta.env.VITE_RAYFIN_API_URL ?? '',
    publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? '',
    auth: browserSession({ storage: true }),
    services: { data: dataService<UniversalAppSchema>() },
  });
}

export type AppClient = ReturnType<typeof createClient>;
let client: AppClient | undefined;

// Async in the template: wait for it, then use .data, .auth or (with the connectors pack) .connectors.
export async function getRayfinClient(): Promise<AppClient> {
  client ??= createClient();
  return client;
}
`;
// The same, as the connectors pack replaces it (kit/rayfin-client.ts): connectors composed from ./connectors.
export const CLIENT_STANDIN_CONNECTORS = `// Playground: a stand-in for the client the connectors pack installs, shortened: the same getRayfinClient(), now with
// connectors. It reads the connectors from ./connectors, which \`rayfin connector add\` keeps up to date.
import { RayfinClient } from '@microsoft/rayfin-client';
import { browserSession } from '@microsoft/rayfin-auth';
import { connectorsService } from '@microsoft/rayfin-connectors';
import { dataService } from '@microsoft/rayfin-data';
import type { UniversalAppSchema } from '@rayfin-app/shared';
import { connectorConfigs, connectorRuntimes, type AppConnectorsSchema } from './connectors';

function createClient() {
  return RayfinClient.create({
    baseUrl: import.meta.env.VITE_RAYFIN_API_URL ?? '',
    publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY ?? '',
    auth: browserSession({ storage: true }),
    services: {
      data: dataService<UniversalAppSchema>(),
      connectors: connectorsService<AppConnectorsSchema>({
        configs: connectorConfigs,
        runtime: connectorRuntimes,
      }),
    },
  });
}

export type AppClient = ReturnType<typeof createClient>;
let client: AppClient | undefined;

// Async in the template: wait for it, then use .data, .auth or .connectors.
export async function getRayfinClient(): Promise<AppClient> {
  client ??= createClient();
  return client;
}
`;
// The same, as the functions pack replaces it (connectors/kit/rayfin-client.with-functions.ts, chosen because the
// connectors pack is applied): it also adds a functions service. No lesson calls a function from the page, so the
// stand-in names it in a comment instead of importing its types.
export const CLIENT_STANDIN_FUNCTIONS = CLIENT_STANDIN_CONNECTORS
  .replace('a stand-in for the client the connectors pack installs, shortened', 'a stand-in for the client the connectors and functions packs install, shortened')
  .replace('    services: {\n', '    services: {\n      // Playground: the functions pack also adds functions: functionsService<AppFunctionsSchema>() here (not shown).\n');
// The analytics pack's hook (kit/hooks/use-semantic-model-query.ts), as a working stand-in (locked).
export const HOOK_STANDIN = `// Playground: a stand-in for the analytics pack's use-semantic-model-query.ts, shortened: the same inputs and outputs.
// The real hook also keeps only the newest answer when queries overlap, and has refetch().
import { useEffect, useState } from 'react';
import type { SemanticModelQueryResult } from '@microsoft/rayfin-connector-fabric-semanticmodel';
import { getRayfinClient } from '../lib/rayfin-client';

type ExecuteQueryClient = { executeQuery(input: { query: string }): Promise<SemanticModelQueryResult> };

// Runs one DAX query through the connector named \`connection\` in rayfin/rayfin.yml. Two ways to fail, kept apart:
// data.status === 'error' when the model rejects the query; error when the call itself throws.
export function useSemanticModelQuery({ connection, query }: { connection: string; query: string }) {
  const [state, setState] = useState<{ data?: SemanticModelQueryResult; isLoading: boolean; error?: Error }>({ isLoading: true });

  useEffect(() => {
    let live = true;
    setState((s) => ({ data: s.data, isLoading: true, error: undefined }));
    getRayfinClient()
      .then((client) => (client.connectors as unknown as Record<string, ExecuteQueryClient>)[connection].executeQuery({ query }))
      .then((data) => live && setState({ data, isLoading: false, error: undefined }))
      .catch((e: unknown) => live && setState({ data: undefined, isLoading: false, error: e instanceof Error ? e : new Error(String(e)) }));
    return () => {
      live = false;
    };
  }, [connection, query]);

  return state;
}
`;

const PG_JSON = (text) => `${JSON.stringify({ _playground: `Playground: ${text}` }, null, 2)}\n`;
const SKILLS = {
  analytics: 'reading an existing Power BI semantic model: the analytics pack, its query hook, and .dax query files',
  'app-deployment': 'checking and deploying the app with the Rayfin CLI',
  'app-design': 'laying out and styling the app\'s pages and components',
  'app-validation': 'the checks to run, in a browser too, before calling the app done',
  'capability-router': 'where to start: which packs and skills a request needs',
  connectors: 'connecting existing Fabric data (a warehouse, SQL database, lakehouse SQL endpoint or semantic model)',
  'crud-ui': 'pages that list, add, edit and delete the app\'s own records',
  'data-modeling': 'storing the app\'s own data: entities, the database, row-level access',
  'dax-authoring': 'writing and testing DAX queries against a semantic model',
  'external-api-workflows': 'calling outside APIs from a server-side function',
  'fabric-data-agent': 'calling a published Fabric data agent from a function',
  'fabric-sdk': 'querying Fabric data at run time through the Rayfin connectors client',
  'functions-capability': 'adding server-side functions (the functions pack)',
  observability: 'telemetry and Application Insights',
  'query-design': 'what to work out in DAX and what in TypeScript',
  'schema-discovery': 'exploring a semantic model\'s tables, columns and measures',
  storage: 'storing files: uploads, images, documents',
  visuals: 'charts and grids with VegaVisual and DataGrid (the visuals pack)',
};
// The skills the Rayfin CLI adds after creating the app (rayfin-cli, services/agent-files/descriptors.js).
const RAYFIN_SKILLS = {
  rayfin: 'any task with Rayfin: data models, sign-in, storage, deploying, its commands and the client',
  'rayfin-functions': 'user-defined functions, calling them from the page, and the functions commands',
  'rayfin-connectors': 'connecting existing Fabric data (lakehouse, warehouse, SQL database, semantic model, KQL database) to the app',
  'rayfin-storage': 'file and blob storage',
  'rayfin-auth-claims': 'dynamic auth claims',
};
const TEST_LINE = 'No tests run here.';
export const TEMPLATE_PLACEHOLDERS = {
  '.gitignore': '# Playground: what Git leaves out (logs, node_modules, build output). The CLI writes it from the template\'s .gitignore.template, and Rayfin\'s init adds its own lines (rayfin/.env*, rayfin/.deployments.json, rayfin/.temp/ and temporary files).\n',
  'README.md': 'Playground: the template\'s README: how to run the app, the workspace\'s packages, and how to add capabilities with npm run pack:add.\n',
  'AGENTS.md': 'Playground: the template\'s instructions for coding agents: start with the capability-router skill, which picks the packs and skills a request needs. Read the real one in a project you create.\n',
  LICENSE: 'Playground: the template\'s licence: MIT, Microsoft Corporation.\n',
  'SECURITY.md': 'Playground: the template\'s page on how to report a security issue to Microsoft.\n',
  'CODE_OF_CONDUCT.md': 'Playground: the template\'s pointer to the Microsoft Open Source Code of Conduct.\n',
  'tsconfig.base.json': PG_JSON('the TypeScript settings every package shares.'),
  'tsconfig.json': PG_JSON('the root TypeScript project: it lists the three packages, for npm run typecheck.'),
  '.mcp.json': PG_JSON('added by the Rayfin CLI after creating the app: the Rayfin MCP server entry for coding agents (npx @microsoft/rayfin-mcp start). Not used here.'),
  'rayfin/.gitignore': '# Playground: what Git leaves out of the rayfin folder (its .temp folder). The CLI writes it from the template\'s .gitignore.template.\n',
  'rayfin/tsconfig.json': PG_JSON('TypeScript settings for the rayfin folder (connectors, functions), built on the root settings.'),
  'rayfin/.lockfile.json': PG_JSON('written by the Rayfin CLI: which CLI version installed its agent files, and a record of each, so it can update them later.'),
  'scripts/scaffold.mjs': '// Playground: what npm run pack:add runs: it copies a pack\'s files into the app, turns on its services in rayfin.yml, adds its packages and installs them. The playground simulates the packs the lessons use.\n',
  ...Object.fromEntries(Object.entries(SKILLS).map(([n, w]) => [`.agents/skills/${n}/SKILL.md`, `Playground: one of the template's skills for coding agents, on ${w}. Read the real one in a project you create.\n`])),
  ...Object.fromEntries(Object.entries(RAYFIN_SKILLS).map(([n, w]) => [`.agents/skills/${n}/SKILL.md`, `Playground: added by the Rayfin CLI after creating the app: a Rayfin skill for coding agents, on ${w}.\n`])),
  [`${FE}/components.json`]: PG_JSON('settings for shadcn/ui, which the template\'s components are set up with. Not used here.'),
  [`${FE}/eslint.config.js`]: '// Playground: the frontend\'s lint rules (ESLint, with TypeScript and React hooks checks). Not run here.\n',
  [`${FE}/index.html`]: '<!-- Playground: the page the browser opens: one empty div that src/main.tsx draws the app into. The preview here draws App directly. -->\n',
  [`${FE}/tsconfig.json`]: PG_JSON('the frontend\'s TypeScript settings, with the @/ shortcut for src/. The playground\'s editor follows relative paths only.'),
  [`${FE}/vite.config.ts`]: '// Playground: the settings Vite builds the frontend with: React, Tailwind CSS, Rayfin\'s local dev, and the @/ shortcut for src/. The playground builds the preview itself.\n',
  [`${FE}/vitest.config.ts`]: `// Playground: the settings for the frontend's tests (Vitest). ${TEST_LINE}\n`,
  [`${FE}/src/main.tsx`]: '// Playground: the app\'s entry point: it signs the person in and draws Root. The preview here draws App directly.\n',
  [`${FE}/src/Root.tsx`]: '// Playground: the template\'s frame around App: the error boundary, the sign-in gate and the theme.\n',
  [`${FE}/src/Welcome.tsx`]: '// Playground: the template\'s welcome screen, the first thing a new app shows.\n',
  [`${FE}/src/Welcome.css`]: '/* Playground: the welcome screen\'s styles. */\n',
  [`${FE}/src/Welcome.activity.ts`]: '// Playground: part of the template\'s welcome screen.\n',
  [`${FE}/src/EmptyStatePreview.tsx`]: '// Playground: the template\'s starting view, which its App.tsx shows until you replace it. Our App.tsx starts empty instead.\n',
  [`${FE}/src/FabricAppMark.tsx`]: '// Playground: the Fabric app mark the welcome screen shows.\n',
  [`${FE}/src/ErrorFallback.tsx`]: '// Playground: what the template shows when the app crashes.\n',
  [`${FE}/src/global.css`]: '/* Playground: the template\'s styles: Tailwind CSS and its colour tokens, light and dark. The preview here loads Tailwind CSS itself. */\n',
  [`${FE}/src/App.spec.tsx`]: `// Playground: the template's test for App. ${TEST_LINE}\n`,
  [`${FE}/src/Root.spec.tsx`]: `// Playground: the template's test for Root. ${TEST_LINE}\n`,
  [`${FE}/src/Welcome.spec.tsx`]: `// Playground: the template's test for the welcome screen. ${TEST_LINE}\n`,
  [`${FE}/src/components/auth-gate.component.tsx`]: '// Playground: the template\'s sign-in gate: a loading screen until the person is signed in, then the app.\n',
  [`${FE}/src/hooks/auth.context.ts`]: '// Playground: the template\'s sign-in state (useAuth), which its components read.\n',
  [`${FE}/src/hooks/use-auth.tsx`]: '// Playground: the template\'s sign-in provider: inside Fabric, it gets the person\'s session from the Fabric host.\n',
  [`${FE}/src/hooks/theme.context.ts`]: '// Playground: the template\'s light or dark theme, which its components read.\n',
  [`${FE}/src/hooks/use-theme.ts`]: '// Playground: the template\'s hook that follows the light or dark setting and switches it.\n',
  [`${FE}/src/hooks/use-theme.spec.ts`]: `// Playground: the template's tests for use-theme.ts. ${TEST_LINE}\n`,
  [`${FE}/src/lib/rayfin-client.spec.ts`]: `// Playground: the template's tests for its client. ${TEST_LINE}\n`,
  [`${FE}/src/lib/utils.ts`]: '// Playground: cn(), which merges Tailwind CSS class names. Our components write their classes out in full.\n',
  [`${FE}/src/services/rayfin-auth.service.ts`]: '// Playground: the template\'s Fabric sign-in, which uses getRayfinClient(). No sign-in happens here: the playground simulates who is signed in.\n',
  [`${FE}/src/services/rayfin-auth.service.spec.ts`]: `// Playground: the template's tests for its sign-in. ${TEST_LINE}\n`,
  [`${FE}/src/test/setup.ts`]: `// Playground: setup for the template's tests (Testing Library's extra checks). ${TEST_LINE}\n`,
  [`${FE}/src/test/stage3-decorator-fixture.ts`]: `// Playground: part of the template's tests. ${TEST_LINE}\n`,
  [`${FE}/src/test/stage3-decorator.spec.ts`]: `// Playground: part of the template's tests. ${TEST_LINE}\n`,
  'packages/data/tsconfig.json': PG_JSON('the data package\'s TypeScript settings.'),
  'packages/shared/tsconfig.json': PG_JSON('the shared package\'s TypeScript settings.'),
};
/** Folders of placeholders only, folded in the file list until opened. */
export const FOLDED_AT_START = ['.agents', 'scripts', `${FE}/src/services`, `${FE}/src/test`];

const TEMPLATE_VITE_ENV = `/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Rayfin API base URL (e.g. http://localhost:5168). */
  readonly VITE_RAYFIN_API_URL?: string;
  /** Rayfin publishable key (pk-...). */
  readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
  /** Fabric workspace ID — maps to FabricAuthOptions.workspaceId. */
  readonly VITE_FABRIC_WORKSPACE_ID?: string;
  /** Fabric/Rayfin item ID — maps to FabricAuthOptions.projectId. */
  readonly VITE_FABRIC_ITEM_ID?: string;
  /** Fabric portal base URL (e.g. https://app.fabric.microsoft.com/). */
  readonly VITE_FABRIC_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`;

/** The page file the preview draws: its default export. */
export const PAGE_FILE = 'packages/frontend/src/App.tsx';
/** The file a step is about: the one it names, or the one its first edit changes (the page, when neither says). */
export const stepFile = (step) => step?.file ?? step?.edits?.[0]?.file ?? (step?.edits || step?.find ? PAGE_FILE : undefined);

/** Values `rayfin dev` would write to .env.local. Made up, and marked as such. */
export const SIMULATED_ENV = {
  VITE_RAYFIN_API_URL: 'https://simulated.rayfin.invalid',
  VITE_RAYFIN_PUBLISHABLE_KEY: 'pk-simulated',
};

/** Placeholder ids the lessons use: not real Fabric ids. */
export const PLACEHOLDER = {
  workspaceId: '00000000-0000-0000-0000-00000000c0de',
  itemId: '00000000-0000-0000-0000-0000c0d50000',
  /** The second semantic model (Two semantic models): the Pareto model. */
  paretoId: '00000000-0000-0000-0000-00000000a080',
  /** The lakehouse, as `connector search` lists it. */
  lakehouseId: '00000000-0000-0000-0000-00000001a4e0',
  /** Its SQL analytics endpoint: `connector add` writes this id to rayfin.yml instead. */
  lakehouseEndpointId: '00000000-0000-0000-0000-00000001a4e5',
};

/** The Fabric items `connector search` can find here: the course's three sources. */
const SOURCES = [
  {
    workspaceId: PLACEHOLDER.workspaceId,
    workspaceName: 'Contoso',
    itemId: PLACEHOLDER.lakehouseId,
    itemType: 'Lakehouse',
    displayName: lakehouse.displayName,
    connectorType: 'fabric-sqlanalytics',
  },
  {
    workspaceId: PLACEHOLDER.workspaceId,
    workspaceName: 'Contoso',
    itemId: PLACEHOLDER.itemId,
    itemType: 'SemanticModel',
    displayName: 'Contoso measures',
    connectorType: 'fabric-semanticmodel',
  },
  {
    workspaceId: PLACEHOLDER.workspaceId,
    workspaceName: 'Contoso',
    itemId: PLACEHOLDER.paretoId,
    itemType: 'SemanticModel',
    displayName: 'Contoso pareto',
    connectorType: 'fabric-semanticmodel',
  },
];

// The packages whose code and types the playground provides once "installed".
const CONNECTOR_PACKAGES = [
  '@microsoft/rayfin-connector-fabric-semanticmodel',
  '@microsoft/rayfin-connectors',
  '@microsoft/rayfin-connector-fabric-graphql',
];
/** The functions package's own dependency (packages/functions/package.json), installed with the workspace. */
const FUNCTIONS_PACKAGE = '@microsoft/fabric-user-data-functions';
/** Everything `npm install` installs at the workspace root: every package's dependencies. */
const TEMPLATE_INSTALL = [
  ...Object.keys(ROOT_PACKAGE.devDependencies),
  ...Object.keys(FRONTEND_PACKAGE.dependencies),
  ...Object.keys(FRONTEND_PACKAGE.devDependencies),
  ...Object.keys(DATA_PACKAGE.dependencies),
  ...Object.keys(DATA_PACKAGE.devDependencies),
];
const KNOWN_PACKAGES = new Set([
  ...TEMPLATE_INSTALL,
  ...CONNECTOR_PACKAGES,
  FUNCTIONS_PACKAGE,
]);

export function emptyProject() {
  return { cwd: null, appDir: null, files: {}, packages: [], dev: false, history: [], db: emptyDb() };
}

const clone = (p) => JSON.parse(JSON.stringify(p));

/** Is a file generated by the CLI (and read-only here)? metadata.json is never edited by hand (rayfin.ai). package.json files
 * change through npm and the packs here. The connector wiring carries the CLI's own @generated marker. */
/** Is a file one of the template's placeholders (TEMPLATE_PLACEHOLDERS)? */
export const isPlaceholder = (text = '') => /^(?:\/\/|#|\/\*|<!--)?\s*Playground:/.test(text) || /^\{\s*"_playground"/.test(text);

export const isGenerated = (path, text = '') =>
  /^\/\/ @generated/.test(text) ||
  isPlaceholder(text) ||
  path.endsWith('package.json') ||
  path === 'package.json' || path.endsWith('.yml') || path.endsWith('/metadata.json') || path.endsWith('.generated.d.ts');

// ---------------------------------------------------------------- the terminal
/** Split a command line into words, keeping '…' and "…" together. */
function words(line) {
  const out = [];
  const re = /'([^']*)'|"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** The same command, however it was spaced. Used to tell whether a step's command was run. */
export const normCommand = (line) => words(line.trim()).join(' ').replace(/^(npm|npx)\.cmd\b/, '$1');

function flags(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') continue;
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (args[i + 1] !== undefined && !args[i + 1].startsWith('-')) out[k] = args[++i];
      else out[k] = true;
    } else if (a === '-y') out.yes = true;
    else out._.push(a);
  }
  return out;
}

const PG = (s) => `Playground: ${s}`;
// Before the project exists, nothing but `npm create` can work: say so, with the command.
const NO_PROJECT = [
  PG('There is no project yet, so there is nothing to open, list or install.'),
  PG('It is created in the lesson "Create the project", with:'),
  '  npm create @microsoft/rayfin@latest contoso-app -- --template blankapp',
];
const SIMULATED = PG('Simulated. The real command prints more; these are the parts that matter here.');

/**
 * Run one command line. `answer(connector, query)` gives a saved query result (for `connector invoke`).
 * Returns { project, lines, ok }: a new project, the lines to print, and whether it succeeded.
 */
export function runCommand(start, line, answer) {
  const p = clone(start);
  const text = line.trim();
  if (!text) return { project: p, lines: [], ok: true };
  p.history.push(text);
  const w = words(text);
  const cmd = w[0]?.replace(/\.cmd$/, '');
  const fail = (...lines) => ({ project: p, lines, ok: false });
  const done = (...lines) => ({ project: p, lines, ok: true });
  const inApp = () => p.cwd && p.cwd === p.appDir;

  if (cmd === 'help') {
    return done(
      PG('Commands simulated here, as in a real Rayfin 2.0 project:'),
      '  npm create @microsoft/rayfin@latest <app-name> -- --template blankapp',
      '  cd <app-name>          npm install          npx rayfin login',
      '  npx rayfin connector add --type fabric-semanticmodel --workspace-id <id> --item-id <id> --name <name>',
      '  npx rayfin connector add --type fabric-sqlanalytics --workspace-id <id> --item-id <id> --name <name> --operations read',
      '  npx rayfin connector search --workspace-id <id> --type <type> --json',
      '  npx rayfin connector inspect --name <name> --entity <schema.table> --rows <n>',
      '  npx rayfin up connector apply --name <name>',
      '  npx rayfin connector list          npx rayfin connector invoke <name> executeQuery --input \'{"query":"…"}\'',
      '  npx rayfin up db apply [--force]          npx rayfin up status',
      '  npm run pack:add -- connectors | analytics | data-modeling | functions',
      '  npm run dev          npx rayfin up          ls          clear',
      ...(p.appDir ? [] : [PG('There is no project yet: the first one, `npm create …`, makes it, in the lesson "Create the project".')]),
    );
  }
  if (cmd === 'clear' || cmd === 'cls') return done();
  if (cmd === 'pwd') return done(p.cwd ? `~/${p.cwd}` : '~');
  if (cmd === 'ls' || cmd === 'dir') {
    if (!p.appDir) return done(PG('An empty folder: no project yet.'), ...NO_PROJECT.slice(1));
    if (!p.cwd) return done(p.appDir);
    // Names starting with a dot (.gitignore, .agents) are listed too, as PowerShell's ls does.
    const top = [...new Set(Object.keys(p.files).map((f) => f.split('/')[0]))].sort();
    return done(top.join('  '));
  }
  if (cmd === 'cd') {
    const to = w[1];
    if (!to || to === '~' || to === '..') {
      p.cwd = null;
      return done();
    }
    if (p.appDir && to.replace(/[/\\]$/, '') === p.appDir) {
      p.cwd = p.appDir;
      return done();
    }
    if (!p.appDir) return fail(...NO_PROJECT);
    return fail(PG(`No folder named ${to} here. The project folder is ${p.appDir}.`));
  }

  // npm create @microsoft/rayfin@latest <name> -- --template blankapp   (rayfin-guide: cli/templates.md)
  if (cmd === 'npm' && (w[1] === 'create' || w[1] === 'init') && /^@microsoft\/rayfin(@latest)?$/.test(w[2] ?? '')) {
    const f = flags(w.slice(3));
    const name = f._[0];
    if (p.cwd) return fail(PG('Create the app from your starting folder: run `cd ..` first.'));
    if (!name) return fail(PG('Give the app a folder name: npm create @microsoft/rayfin@latest <app-name> -- --template blankapp'));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return fail(PG('Use a lower-case name of letters, digits and single hyphens, such as contoso-app.'));
    if (p.appDir) return fail(PG(`This playground holds one app, and ${p.appDir} already exists. Restart the playground to start over.`));
    if (f.template === undefined) {
      return fail(
        PG('The real command asks which template to start from; its default is "Use default template" (blankapp).'),
        PG('The playground skips the question: add -- --template blankapp.'),
      );
    }
    if (f.template !== 'blankapp') return fail(PG(`Only the default template, blankapp, is simulated here (you asked for ${f.template}).`));
    p.appDir = name;
    for (const pkg of TEMPLATE_INSTALL) if (!p.packages.includes(pkg)) p.packages.push(pkg);
    p.files = {
      ...TEMPLATE_PLACEHOLDERS,
      'package.json': json({ name, ...ROOT_PACKAGE }),
      'rayfin/rayfin.yml': TEMPLATE_RAYFIN_YML.replace('id: universal-app\nname: Universal App\n', `id: ${name}\nname: ${name}\n`),
      [`${FE}/package.json`]: json(FRONTEND_PACKAGE),
      [`${FE}/src/vite-env.d.ts`]: TEMPLATE_VITE_ENV,
      [`${FE}/src/lib/rayfin-client.ts`]: CLIENT_STANDIN,
      [PAGE_FILE]: '',
      'packages/data/package.json': json(DATA_PACKAGE),
      'packages/data/src/index.ts': TEMPLATE_DATA_INDEX,
      'packages/shared/package.json': json(SHARED_PACKAGE),
      'packages/shared/src/index.ts': TEMPLATE_SHARED_INDEX,
    };
    return done(
      SIMULATED,
      PG(`Created ${name}/ from the default template, blankapp (the Universal App): an npm workspace of three packages.`),
      PG('Written as the template has them: the package.json files, rayfin/rayfin.yml and packages/frontend/src/vite-env.d.ts.'),
      PG(`The root package.json and rayfin.yml get the app's name, ${name}, as the real command does.`),
      PG('packages/frontend/src/App.tsx starts empty: the lessons write it. The template\'s own App.tsx shows a welcome view.'),
      PG('Most of the template\'s other files are shown locked, as placeholders that say what the real file does.'),
      PG('Creating it does not sign you in.'),
      PG('It also ran npm install for you, as the real command does (unless told to skip it).'),
      PG(`Next: cd ${name}`),
    );
  }

  // npm install [packages]
  if (cmd === 'npm' && (w[1] === 'install' || w[1] === 'i')) {
    if (!p.appDir) return fail(...NO_PROJECT);
    if (!inApp()) return fail(PG(`No package.json here. Move into the project first: cd ${p.appDir}`));
    const wIdx = w.findIndex((a) => a === '-w' || a === '--workspace');
    const workspace = wIdx > 0 ? w[wIdx + 1] : undefined;
    const named = w.slice(2).filter((a, i) => !a.startsWith('-') && i + 2 !== wIdx + 1);
    if (!named.length) {
      const missing = TEMPLATE_INSTALL.filter((pkg) => !p.packages.includes(pkg));
      for (const pkg of missing) p.packages.push(pkg);
      if (!missing.length) return done(SIMULATED, PG('Up to date: the packages of all three workspace packages are installed already (npm create ran npm install).'));
      return done(SIMULATED, PG('Installed the packages of all three workspace packages, React and the Rayfin client among them.'));
    }
    if (workspace !== undefined && !WORKSPACES[workspace]) return fail(PG(`No workspace named ${workspace}. This app's are ${Object.keys(WORKSPACES).join(', ')}.`));
    const pkgFile = workspace ? `${WORKSPACES[workspace]}/package.json` : 'package.json';
    const pkg = JSON.parse(p.files[pkgFile]);
    pkg.dependencies ??= {};
    const added = [];
    for (const spec of named) {
      const name = spec.replace(/(?<=.)@[^@/]+$/, '');
      if (!KNOWN_PACKAGES.has(name)) return fail(PG(`${name} is not simulated here. The lessons need only the packages they name.`));
      // npm saves with its default ^ prefix unless --save-exact.
      const asked = spec.slice(name.length + 1) || '2.0.0';
      const version = /^[\d]/.test(asked) && !w.includes('--save-exact') ? `^${asked}` : asked;
      pkg.dependencies[name] = version;
      if (!p.packages.includes(name)) p.packages.push(name);
      added.push(`${name}@${version}`);
    }
    pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
    p.files[pkgFile] = json(pkg);
    return done(SIMULATED, ...added.map((a) => PG(`added ${a} to ${pkgFile}`)));
  }

  // npm run pack:add -- <pack>
  if (cmd === 'npm' && w[1] === 'run' && w[2] === 'pack:add') {
    if (!p.appDir) return fail(...NO_PROJECT);
    if (!inApp()) return fail(PG(`Run it from the project folder. Move into it first: cd ${p.appDir}`));
    const pack = w[3] === '--' ? w[4] : w[3];
    return packAdd(p, pack, done, fail);
  }

  // npx rayfin …
  const rayfin = cmd === 'npx' && w[1] === 'rayfin' ? w.slice(2) : cmd === 'rayfin' ? w.slice(1) : null;
  if (rayfin) {
    if (!p.appDir) return fail(...NO_PROJECT);
    if (!inApp()) return fail(PG(`Run Rayfin commands from the project folder. Move into it first: cd ${p.appDir}`));
    const [sub, sub2] = rayfin;
    if (sub === 'login') {
      return done(PG('Sign-in skipped. A real `npx rayfin login` opens your browser for Microsoft Entra ID sign-in.'));
    }
    if (sub === 'dev') return runDev(p, done);
    if (sub === 'init') return initRerun(p, fail);
    if (sub === 'up' && sub2 === 'db' && rayfin[2] === 'apply') return dbApply(p, flags(rayfin.slice(3)), done, fail);
    if (sub === 'up' && sub2 === 'status') return upStatus(p, done, fail);
    if (sub === 'functions' && sub2 === 'init') return functionsInit(p, flags(rayfin.slice(2)), done, fail);
    // `npx rayfin up connector apply [--name <name>]` (rayfin.ai: CLI reference, up connector apply; Preview).
    if (sub === 'up' && sub2 === 'connector' && rayfin[2] === 'apply') {
      const f = flags(rayfin.slice(3));
      const name = typeof f.name === 'string' ? f.name.toLowerCase() : undefined;
      if (name && !connectorNames(p).includes(name)) return fail(PG(`No connector named ${name} in rayfin/rayfin.yml.`));
      return done(
        SIMULATED,
        PG('A real `npx rayfin up connector apply` (Preview) generates the Data API Builder configuration of the entity'),
        PG('connectors from their entity files, checks their entity names, and sends it to the deployed app. It needs a'),
        PG('prior `npx rayfin up`. Semantic model connectors are skipped: they have no such configuration. Nothing is sent from here.'),
      );
    }
    if (sub === 'up') {
      return done(
        SIMULATED,
        PG('A real `npx rayfin up` builds the app and deploys it to your Fabric workspace, connectors included,'),
        PG('then `npx rayfin up status` prints its address. Nothing is deployed from here, and there is no address.'),
      );
    }
    if (sub === 'connector' && sub2 === 'add') {
      const f = flags(rayfin.slice(2));
      return f.type === 'fabric-sqlanalytics' ? sqlAnalyticsAdd(p, f, done, fail) : connectorAdd(p, f, done, fail);
    }
    if (sub === 'connector' && sub2 === 'search') return connectorSearch(flags(rayfin.slice(2)), done, fail);
    if (sub === 'connector' && sub2 === 'inspect') return connectorInspect(p, flags(rayfin.slice(2)), done, fail);
    if (sub === 'connector' && sub2 === 'list') {
      const names = connectorNames(p);
      return done(...(names.length ? names.map((n) => PG(`${n}  (${connectorType(p, n)})`)) : [PG('No connectors yet.')]));
    }
    if (sub === 'connector' && sub2 === 'invoke') return connectorInvoke(p, rayfin.slice(2), answer, done, fail);
    return fail(PG(`\`rayfin ${rayfin.join(' ')}\` is not simulated here. Try \`help\`.`));
  }
  if (cmd === 'npm' && w[1] === 'run' && w[2] === 'dev') {
    if (!p.appDir) return fail(...NO_PROJECT);
    if (!inApp()) return fail(PG(`No package.json here. Move into the project first: cd ${p.appDir}`));
    return runDev(p, done);
  }
  return fail(PG(`Not simulated here: ${text}. Try \`help\`.`));
}

function runDev(p, done) {
  if (!p.packages.includes('@microsoft/rayfin-client')) {
    return { project: p, lines: [PG('Run `npm install` first: the dev server needs the template\'s packages.')], ok: false };
  }
  const claims = generateClaimTypes(p);
  p.dev = true;
  // The function host and its type watcher start with the loop, if Functions are on by then.
  p.devFunctions = functionsEnabled(p) && p.files[FUNCTION_APP] !== undefined;
  return done(
    SIMULATED,
    ...claims.lines,
    PG('A real `rayfin dev` provisions (or reuses) the app\'s Fabric backend, writes RAYFIN_PUBLIC_* values to'),
    PG('rayfin/.env and VITE_* values to the frontend\'s .env.local, and serves the page on http://localhost:5173. It keeps'),
    PG('running, so real projects open a second terminal for the next commands.'),
    PG('One thing differs in a real project: rayfin dev does not wire connectors (connector queries work'),
    PG('once the app is deployed with `npx rayfin up`).'),
    PG('Here: the page runs in the preview on the right, its queries answered from saved results.'),
  );
}

/** Connector names in rayfin.yml. */
export function connectorNames(p) {
  const yml = p.files['rayfin/rayfin.yml'] ?? '';
  const block = yml.split(/^connectors:\s*$/m)[1] ?? '';
  return [...block.matchAll(/^  - name: (\S+)$/gm)].map((m) => m[1]);
}

/** A connector's type in rayfin.yml. */
export function connectorType(p, name) {
  const yml = p.files['rayfin/rayfin.yml'] ?? '';
  return yml.match(new RegExp(`^  - name: ${name}\\n    type: (\\S+)$`, 'm'))?.[1];
}

/** A connector's `auth.type` in rayfin.yml: `delegated` or `application`. */
export function connectorAuth(p, name) {
  const yml = p.files['rayfin/rayfin.yml'] ?? '';
  const entry = yml.split(/^ {2}- name: /m).find((e) => e.startsWith(`${name}\n`)) ?? '';
  return entry.match(/^ {4}auth:\n {6}type: (\S+)$/m)?.[1];
}

/** The connector-type catalog of Rayfin CLI 2.0.0, for the entity connector type simulated here (rayfin-tools-common config/connectors.js). */
const CATALOG = {
  'fabric-sqlanalytics': { allowedOperations: ['read'], defaultAuth: 'application', allowedAuthTypes: ['delegated', 'application'] },
};

// `npx rayfin connector search` (rayfin.ai: CLI reference, connector search; Adding a connector, Find a source)
function connectorSearch(f, done, fail) {
  const query = typeof f.query === 'string' ? f.query : f._[0];
  const types = typeof f.type === 'string' ? f.type.split(',') : undefined;
  if (f['workspace-id'] && !types) return fail(PG('Give --type with --workspace-id, for example --type fabric-sqlanalytics.'));
  if (f['all-workspaces'] && !types) return fail(PG('Give --type with --all-workspaces, for example --type fabric-sqlanalytics.'));
  if (!f['workspace-id'] && !f['all-workspaces']) {
    return fail(PG('Without a scope, the real command searches the workspaces this project was deployed to, and it never was.'), PG('Search one workspace: --workspace-id <id> --type <type> --json'));
  }
  if (f['workspace-id'] && f['workspace-id'] !== PLACEHOLDER.workspaceId) {
    return fail(PG(`The playground has one workspace, ${PLACEHOLDER.workspaceId}. Search that one.`));
  }
  const sources = SOURCES.filter(
    (s) => (!types || types.includes(s.connectorType)) && (!query || s.displayName.toLowerCase().includes(String(query).toLowerCase())),
  ).map((s) => {
    const suggestedName = sanitizeName(s.displayName);
    return { ...s, suggestedName, addCommand: `rayfin connector add --type ${s.connectorType} --workspace-id ${s.workspaceId} --item-id ${s.itemId} --name ${suggestedName}` };
  });
  const result = {
    status: 'ok',
    query: query ?? null,
    scope: f['workspace-id'] ? { workspaceId: f['workspace-id'] } : { allWorkspaces: true },
    count: sources.length,
    sources,
  };
  return done(
    SIMULATED,
    ...(f.json ? [] : [PG('Without --json the real command opens a picker. Shown here as --json prints it.')]),
    PG('In the documented --json shape; the items and ids are the playground\'s.'),
    ...JSON.stringify(result, null, 2).split('\n'),
  );
}

/** How the real CLI turns an item's display name into a connector name. */
const sanitizeName = (displayName) =>
  displayName.toLowerCase().replace(/[^a-z0-9\-_]/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');

/** The placeholder schema.ts `connector add` writes for an entity connector (Rayfin CLI 2.0.0, connector-add.js). */
export const sqlPlaceholder = (name, type) =>
  [
    `// Source: ${name} (${type})`,
    '// Placeholder — entity files are generated from metadata.json.',
    '// Overwrite this file with the aggregate that re-exports the',
    '// generated entities and exports a connectorConfig value.',
    '',
    'export const schema = [];',
    '',
  ].join('\n');

// `npx rayfin connector add --type fabric-sqlanalytics …` (rayfin.ai: Adding a connector, Generating entity
// files, CLI reference; Microsoft Learn: Connect Fabric Apps to Fabric data). The messages that are not
// `Playground:` lines are the Rayfin CLI 2.0.0's own (commands/connector/connector-add.js,
// services/connector-schema-discovery.js); the item check and the schema discovery are simulated.
function sqlAnalyticsAdd(p, f, done, fail) {
  const type = 'fabric-sqlanalytics';
  const meta = CATALOG[type];
  let operations = meta.allowedOperations;
  if (typeof f.operations === 'string') {
    const requested = f.operations.split(',').map((s) => s.trim()).filter(Boolean);
    const invalid = requested.filter((op) => !meta.allowedOperations.includes(op));
    if (invalid.length) {
      return fail(`Invalid --operations [${invalid.join(', ')}] for connector type "${type}". Allowed: [${meta.allowedOperations.join(', ')}].`);
    }
    operations = meta.allowedOperations.filter((op) => requested.includes(op));
  }
  let auth = meta.defaultAuth;
  if (f.auth !== undefined) {
    if (!meta.allowedAuthTypes.includes(String(f.auth))) {
      return fail(`Invalid --auth "${f.auth}" for connector type "${type}". Allowed: [${meta.allowedAuthTypes.join(', ')}].`);
    }
    auth = String(f.auth);
  }
  if (!f['workspace-id'] || f['workspace-id'] === true) return fail(`Connector "${type}" requires --workspace-id.`);
  if (!f['item-id'] || f['item-id'] === true) return fail(`Connector "${type}" requires --item-id.`);
  const source = SOURCES.find((s) => s.workspaceId === f['workspace-id'] && s.itemId === f['item-id']);
  if (!source) return fail('Item not found. Verify the workspace ID and artifact ID are correct.');
  if (source.connectorType !== type) {
    return fail(PG(`That id is the ${source.itemType}. For ${type}, use the lakehouse's id from \`connector search\`.`));
  }
  const lines = [SIMULATED, `✅ Verified item: "${source.displayName}" (${source.itemType})`];
  let name = typeof f.name === 'string' ? f.name : undefined;
  if (!name) {
    name = sanitizeName(source.displayName);
    lines.push(`Using derived name: "${name}". Override with --name <name>.`);
  }
  if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
    return fail(`Connector name "${name.toLowerCase()}" contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.`);
  }
  if (name !== name.toLowerCase()) lines.push(`Using normalized connector name "${name.toLowerCase()}" (from "${name}").`);
  name = name.toLowerCase();
  const exists = connectorNames(p).includes(name);
  // Rayfin CLI 2.0.0 (connector-add.js): an existing connector is overwritten after a yes to its question, or with --yes.
  if (exists && !f.yes) lines.push(`Connector "${name}" already exists.`, PG('The real CLI asks "Overwrite?" here (default No). The playground answers Yes, as the step says.'));

  // Schema discovery resolves a lakehouse to its SQL analytics endpoint and writes that id back.
  const entry = [
    `  - name: ${name}`,
    `    type: ${type}`,
    '    config:',
    `      workspaceId: ${f['workspace-id']}`,
    `      itemId: ${PLACEHOLDER.lakehouseEndpointId}`,
    '    auth:',
    `      type: ${auth}`,
    '    operations:',
    ...operations.map((op) => `      - name: ${op}`),
  ].join('\n');
  let yml = p.files['rayfin/rayfin.yml'];
  if (exists) yml = yml.replace(new RegExp(`  - name: ${name}\\n(    .*\\n?)*`), `${entry}\n`);
  else yml = /^connectors:\s*$/m.test(yml) ? `${yml.trimEnd()}\n${entry}\n` : `${yml.trimEnd()}\nconnectors:\n${entry}\n`;
  p.files['rayfin/rayfin.yml'] = yml;
  lines.push(`✅ Connector "${name}" added to rayfin.yml`, `   Use it in app code as client.connectors.${name}.`);

  const dir = `rayfin/connectors/${name}`;
  if (p.files[`${dir}/schema.ts`] !== undefined && !f.yes) {
    lines.push(`⚠️  ${dir}/schema.ts already exists — skipping to avoid overwriting manual edits. Pass --yes to overwrite.`);
  } else {
    p.files[`${dir}/schema.ts`] = sqlPlaceholder(name, type);
    lines.push(`📁 Created ${dir}/schema.ts`);
  }
  const metadata = { ...lakehouse.metadata, source: name };
  p.files[`${dir}/metadata.json`] = JSON.stringify(metadata, null, 2);
  const tables = metadata.schemas.reduce((n, s) => n + s.tables.length, 0);
  return done(
    ...lines,
    '',
    '🔍 Discovering schema...',
    `✅ Discovered ${tables} tables across ${metadata.schemas.length} schemas`,
    PG(`Wrote ${dir}/metadata.json. A lakehouse's id resolves to its SQL analytics endpoint, so rayfin.yml now holds the endpoint's id.`),
    PG('The real CLI also adds its connector skill for agents. It writes no entity files: they are generated from metadata.json.'),
    ...wireConnectors(p),
    '',
    '📦 Install the packages this connector needs:',
    '   npm install @microsoft/rayfin-connector-fabric-graphql@2.0.0 @microsoft/rayfin-connectors@2.0.0',
  );
}

// `npx rayfin connector inspect --name <name> [--entity <schema.table>] [--rows <n>]` (rayfin.ai: CLI reference,
// connector inspect). Read-only, straight to the source: no entity files and no deploy needed.
function connectorInspect(p, f, done, fail) {
  const name = typeof f.name === 'string' ? f.name.toLowerCase() : undefined;
  if (!name) return fail(PG('Give --name <connector> (the direct --workspace-id/--item-id form is not simulated).'));
  if (!connectorNames(p).includes(name)) return fail(PG(`No connector named ${name} in rayfin/rayfin.yml.`));
  const type = connectorType(p, name);
  if (type !== 'fabric-sqlanalytics') return fail(PG(`\`connector inspect\` is simulated for the lakehouse connector only (${name} is ${type}).`));
  const metadata = JSON.parse(p.files[`rayfin/connectors/${name}/metadata.json`] ?? 'null');
  if (!metadata) return fail(PG(`No metadata for ${name}: re-run connector add.`));
  const all = metadata.schemas.flatMap((s) => s.tables.map((t) => `${s.schemaName}.${t.tableName}`));
  if (f.entity === undefined) {
    return done(SIMULATED, PG('Entity listing (the real command reads INFORMATION_SCHEMA.TABLES):'), ...all.map((t) => `  ${t}`));
  }
  const entity = String(f.entity).includes('.') ? String(f.entity) : `dbo.${f.entity}`;
  if (!all.includes(entity)) return fail(PG(`No table ${entity} in this lakehouse. Its tables: ${all.join(', ')}.`));
  const n = f.rows === undefined ? 10 : Number(f.rows);
  if (!Number.isInteger(n) || n < 1 || n > 100) return fail(PG('--rows takes a whole number from 1 to 100.'));
  const data = lakehouse.rows[entity.split('.')[1]];
  const rows = data.rows.slice(0, n).map((r) => r.map(String));
  const widths = data.columns.map((c, i) => Math.max(c.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => `  ${cells.map((c, i) => c.padEnd(widths[i])).join('  ')}`;
  return done(
    SIMULATED,
    PG(`SELECT TOP(${n}) * FROM ${entity}`),
    PG('Laid out as a table here; the real output looks different.'),
    line(data.columns),
    ...rows.map(line),
  );
}

// ---------------------------------------------------------------- capability packs (npm run pack:add -- <pack>)
// From templates/universal-app/.agents/skills/<pack>/pack.json and scripts/scaffold.mjs (Rayfin CLI 2.0.0): the rayfin.yml
// service settings each pack writes (writeServiceProperty: a new service block goes right under `services:`, a new
// property at the end of its block, strings quoted), the root scripts it adds or composes, the packages it pins in its
// package.json ("match:@microsoft/rayfin-core" is the app's own core range, ^2.0.0), the files it copies (a seed file only
// over the template's own version), and the pack it records in the root package.json's `rayfinPacks`. The console
// lines are scaffold.mjs's own, in its order; it then runs npm install, unless the pack declares no packages.
const PACKS = {
  connectors: {
    description: 'Adds the frontend connector SDK and composable client wiring for existing Fabric sources; source declarations remain owned by `rayfin connector add`.',
    packageJson: `${FE}/package.json`,
    dependencies: { '@microsoft/rayfin-connectors': '^2.0.0' },
    // kit/connectors.ts (only when the app has none yet) and the client, replaced while it is the template's own.
    copy: (p) => ({ ...(p.files[`${FE}/src/lib/connectors.ts`] === undefined ? { [`${FE}/src/lib/connectors.ts`]: CONNECTORS_KIT } : {}), [`${FE}/src/lib/rayfin-client.ts`]: CLIENT_STANDIN_CONNECTORS }),
    next: ['app-design'],
  },
  analytics: {
    description: 'Power BI / semantic-model analytics: the `fabric-semanticmodel` connector and the semantic-model query hook. Add the visuals pack alongside it to chart what the queries return.',
    services: [['connectors', 'enabled', true]],
    packageJson: `${FE}/package.json`,
    dependencies: { '@microsoft/rayfin-connectors': '^2.0.0', '@microsoft/rayfin-connector-fabric-semanticmodel': '^2.0.0' },
    gitignore: ['.schema/', '.rayfin-schema-query-*/'],
    // kit/hooks: the hook and its tests (its scripts are copied only behind a flag).
    copy: () => ({
      [`${FE}/src/hooks/use-semantic-model-query.ts`]: HOOK_STANDIN,
      [`${FE}/src/hooks/use-semantic-model-query.spec.ts`]: `// Playground: the analytics pack's tests for its hook. No tests run here.\n`,
    }),
    next: ['analytics'],
  },
  'data-modeling': {
    description: 'Rayfin data service: turns the database on and plants a starter entity with owner-scoped access, so an agent edits a working schema instead of inventing one.',
    services: [['data', 'enabled', true], ['data', 'dialect', 'mssql']],
    // kit/data/Item.ts, and the two index files, planted over the template's own (seedReplaceIfPristine).
    copy: (p) => ({
      ...(p.files[DATA_ITEM_FILE] === undefined ? { [DATA_ITEM_FILE]: DATA_KIT_ITEM } : {}),
      ...(p.files['packages/data/src/index.ts'] === TEMPLATE_DATA_INDEX ? { 'packages/data/src/index.ts': DATA_KIT_INDEX } : {}),
      ...(p.files['packages/shared/src/index.ts'] === TEMPLATE_SHARED_INDEX ? { 'packages/shared/src/index.ts': SHARED_KIT_INDEX } : {}),
    }),
    next: ['crud-ui', 'app-design'],
  },
  functions: {
    description: 'Trusted server-side workflows through typed Rayfin user-defined functions, including external APIs, custom model endpoints, and Fabric data-agent calls.',
    services: [['functions', 'enabled', true], ['functions', 'path', 'packages/functions'], ['functions', 'buildCommand', 'npm run build'], ['functions', 'auth', { type: 'application' }]],
    packageJson: `${FE}/package.json`,
    dependencies: { '@microsoft/rayfin-functions': '^2.0.0', '@rayfin-app/functions': '*' },
    // The function package's own dependency, installed with the workspace.
    installs: [FUNCTIONS_PACKAGE],
    scripts: { 'functions:build': 'npm run -w @rayfin-app/functions build', 'validate:functions': 'npm run -w @rayfin-app/shared build && node scripts/validate-functions.mjs' },
    // scriptStages, composed with the template's scripts as scaffold.mjs composes them (worked out on the template).
    composed: {
      build: 'npm run -w @rayfin-app/shared build && node scripts/validate-functions.mjs && npm run -w @rayfin-app/functions build && npm run -w @rayfin-app/data build && npm run -w @rayfin-app/frontend build',
      'build:fabric': 'npm run -w @rayfin-app/shared build && node scripts/validate-functions.mjs && npm run -w @rayfin-app/functions build && npm run -w @rayfin-app/data build && npm run -w @rayfin-app/frontend build:fabric',
      typecheck: 'npm run -w @rayfin-app/shared build && node scripts/validate-functions.mjs && npm run -w @rayfin-app/functions build && tsc -b',
    },
    // kit/functions (the package), the client with functions (while it is a pack's own), and the check script.
    // kit/vite-env.d.ts is the template's own text, so it is not copied again.
    copy: (p) => ({
      'packages/functions/host.json': PG_JSON('the function host settings (host.json).'),
      'packages/functions/local.settings.json': PG_JSON('settings for running the functions locally.'),
      'packages/functions/package.json': FUNCTIONS_KIT_PACKAGE,
      [FUNCTION_APP]: FUNCTIONS_KIT_APP,
      'packages/functions/src/types.ts': `// Playground: generated from function_app.ts by npm run dev: each function's input and output types (AppFunctionsSchema), for the client. Never edited by hand.\n`,
      'packages/functions/tsconfig.json': PG_JSON('TypeScript settings for the functions package.'),
      ...([CLIENT_STANDIN, CLIENT_STANDIN_CONNECTORS].includes(p.files[`${FE}/src/lib/rayfin-client.ts`]) ? { [`${FE}/src/lib/rayfin-client.ts`]: CLIENT_STANDIN_FUNCTIONS } : {}),
      'scripts/validate-functions.mjs': `// Playground: the functions pack's check that every udf.func() in function_app.ts is in the generated AppFunctionsSchema (npm run validate:functions).\n`,
    }),
    next: ['functions-capability', 'external-api-workflows', 'fabric-data-agent', 'app-design', 'app-validation'],
  },
};

/** One service setting in rayfin.yml, as scaffold.mjs's writeServiceProperty writes it. */
function writeServiceProperty(yml, service, property, value) {
  const rendered = property === 'auth' && service === 'functions'
    ? ['    auth:', '      type: "application"']
    : [`    ${property}: ${typeof value === 'string' ? JSON.stringify(value) : String(value)}`];
  const lines = yml.replace(/\n$/, '').split('\n');
  const servicesIdx = lines.findIndex((l) => /^services:/.test(l));
  let end = lines.findIndex((l, i) => i > servicesIdx && /^\S/.test(l));
  if (end < 0) end = lines.length;
  const svcIdx = lines.findIndex((l, i) => i > servicesIdx && i < end && l === `  ${service}:`);
  if (svcIdx < 0) {
    lines.splice(servicesIdx + 1, 0, `  ${service}:`, ...rendered);
    return `${lines.join('\n')}\n`;
  }
  let blockEnd = svcIdx + 1;
  while (blockEnd < end && /^ {4}/.test(lines[blockEnd])) blockEnd++;
  const at = lines.findIndex((l, i) => i > svcIdx && i < blockEnd && l.startsWith(`    ${property}:`));
  if (at >= 0) {
    let n = 1;
    while (at + n < blockEnd && /^ {6}/.test(lines[at + n])) n++;
    lines.splice(at, n, ...rendered);
  } else lines.splice(blockEnd, 0, ...rendered);
  return `${lines.join('\n')}\n`;
}

function packAdd(p, pack, done, fail) {
  const def = PACKS[pack];
  if (!def) return fail(PG(`The playground simulates the packs the lessons use: ${Object.keys(PACKS).join(', ')} (you asked for ${pack ?? 'none'}).`));
  const lines = ['', `> Scaffolding pack: ${pack}`, `  ${def.description}`];
  for (const [service, property, value] of def.services ?? []) {
    p.files['rayfin/rayfin.yml'] = writeServiceProperty(p.files['rayfin/rayfin.yml'], service, property, value);
    lines.push(`  - rayfin.yml: ${service}.${property} = ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  }
  for (const entry of def.gitignore ?? []) lines.push(`  - .gitignore: ${entry}`);
  const root = JSON.parse(p.files['package.json']);
  for (const [name, cmd] of Object.entries(def.scripts ?? {})) {
    if (root.scripts[name] === cmd) continue;
    root.scripts[name] = cmd;
    lines.push(`  - package.json script: ${name}`);
  }
  for (const [name, cmd] of Object.entries(def.composed ?? {})) {
    if (root.scripts[name] === cmd) continue;
    root.rayfinScriptBases ??= {};
    root.rayfinScriptBases[name] ??= root.scripts[name].split(' && ').filter((stage) => !cmd.split(' && ').slice(0, 3).includes(stage)).join(' && ');
    root.scripts[name] = cmd;
    lines.push(`  - package.json composed script: ${name}`);
  }
  let depCount = 0;
  const depFile = def.packageJson ?? 'package.json';
  const deps = Object.entries(def.dependencies ?? {});
  if (deps.length) {
    const pkg = depFile === 'package.json' ? root : JSON.parse(p.files[depFile]);
    for (const [dep, version] of deps) {
      if (pkg.dependencies[dep] !== version) depCount++;
      pkg.dependencies[dep] = version;
    }
    pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
    if (depFile !== 'package.json') p.files[depFile] = json(pkg);
  }
  lines.push(`  - ${depFile}: ${depCount} dependency change(s)`);
  root.rayfinPacks = [...new Set([...(root.rayfinPacks ?? []), pack])].sort();
  p.files['package.json'] = json(root);
  const files = def.copy(p);
  Object.assign(p.files, files);
  lines.push(`  - copied ${Object.keys(files).length} file(s)`);
  if (!deps.length) lines.push('', '(pack declares no dependencies - skipping install)');
  else {
    lines.push('', '> Installing dependencies...');
    for (const dep of [...deps.map(([d]) => d).filter((d) => !d.startsWith('@rayfin-app/')), ...(def.installs ?? [])]) if (!p.packages.includes(dep)) p.packages.push(dep);
  }
  lines.push('', '[done] Pack ready. Next, read these skills as you build:', ...def.next.map((n) => `  -> .agents/skills/${n}/SKILL.md`));
  return done(...lines);
}

/** packages/frontend/src/lib/connectors.ts as `connector add` regenerates it, for the connectors rayfin.yml declares. */
function wireConnectors(p) {
  const file = `${FE}/src/lib/connectors.ts`;
  const current = p.files[file];
  if (current === undefined) return [`⚠️  No src/lib/connectors.ts in this project — nothing was wired.`, PG('Add the connectors pack first: npm run pack:add -- connectors')];
  // Wired: connectors whose schema.ts exports connectorConfig (an entity connector's placeholder doesn't, yet).
  const names = connectorNames(p);
  const wired = names.filter((n) => /^\s*export\s+const\s+connectorConfig\b/m.test(p.files[`rayfin/connectors/${n}/schema.ts`] ?? ''));
  const lines = [];
  // A file without the CLI's marker, other than the pack's empty one, is the app's own: the CLI leaves it alone.
  if (!current.includes('@generated by `rayfin connector add`') && current !== CONNECTORS_KIT) {
    return [
      `⚠️  ${file} has manual edits — not overwriting.`,
      '   The app reads its connectors from that file. Until it lists this',
      '   connector the app will render nothing, with no error.',
      '   Apply this content (or merge the maps into your version):',
      PG('The real CLI prints the generated file here; not shown.'),
    ];
  }
  const text = WIRING[wired.join(',')];
  if (text === undefined) {
    lines.push(PG(`The wiring for ${wired.join(', ')} is not simulated: the lessons wire contoso, then pareto, then lake.`));
  } else if (text !== current) {
    p.files[file] = text;
    const runtimes = wired.filter((n) => connectorType(p, n) === 'fabric-semanticmodel').length;
    lines.push(`🔌 Wired ${wired.length} connector(s) into ${file}${runtimes ? ` (${runtimes} with a client-side runtime)` : ''}`);
  }
  for (const n of names.filter((x) => !wired.includes(x))) {
    lines.push(`⚠️  Connector "${n}" is not wired into ${file}: rayfin/connectors/${n}/schema.ts does not export \`connectorConfig\` yet.`, `   Fix the cause above, then retry; or update ${file} manually.`);
  }
  return lines;
}

// `npx rayfin connector add` (rayfin.ai: Adding a connector, Semantic models; Microsoft Learn: Connect Fabric Apps)
function connectorAdd(p, f, done, fail) {
  if (!f.type) return fail(PG('Give --type: here, --type fabric-semanticmodel.'));
  if (f.type !== 'fabric-semanticmodel') {
    return fail(PG(`Only fabric-semanticmodel and fabric-sqlanalytics connectors are simulated here (you asked for ${f.type}).`));
  }
  if (f.auth === 'application') return fail('Invalid --auth "application" for connector type "fabric-semanticmodel". Allowed: [delegated].');
  if (f.auth && f.auth !== 'delegated') return fail(PG('--auth takes delegated or application; semantic models allow only delegated.'));
  if (!f['workspace-id'] || !f['item-id'] || f['workspace-id'] === true || f['item-id'] === true) {
    return fail(PG('Give both --workspace-id and --item-id. In a real project they come from `npx rayfin connector search` or the model\'s address in the Fabric portal.'));
  }
  if (!f.name || f.name === true) {
    return fail(PG('Give --name. Without it, the real CLI names the connector after the Fabric item\'s display name, which the playground can\'t see.'));
  }
  if (!/^[a-zA-Z0-9\-_]+$/.test(f.name)) return fail(PG('A connector name may only use letters, digits, - and _.'));
  if (f.operations && f.operations !== 'executeQuery') return fail(PG('A semantic model connector has one operation: executeQuery.'));
  const source = SOURCES.find((s) => s.workspaceId === f['workspace-id'] && s.itemId === f['item-id']);
  if (!source) return fail('Item not found. Verify the workspace ID and artifact ID are correct.');
  if (source.connectorType !== 'fabric-semanticmodel') {
    return fail(PG(`That id is the ${source.itemType}. For fabric-semanticmodel, use a semantic model's id from \`connector search\`.`));
  }
  // Rayfin CLI 2.0.0 (connector-add.js): names are case-insensitive. A new name is stored lowercase; a name
  // that matches an existing connector in any casing is that connector, and the CLI asks before overwriting it.
  const requested = String(f.name);
  const existing = connectorNames(p).find((n) => n.toLowerCase() === requested.toLowerCase());
  const name = existing ?? requested.toLowerCase();
  const naming = [];
  if (name !== requested) {
    naming.push(existing ? `Using existing connector name "${name}" (from "${requested}").` : `Using normalized connector name "${name}" (from "${requested}").`);
  }
  if (existing && !f.yes) {
    return done(
      SIMULATED,
      ...naming,
      name === requested ? `Connector "${name}" already exists.` : `Connector "${requested}" already exists as "${name}".`,
      PG('The real CLI asks "Overwrite?" here (default No). The playground answers No, and the CLI prints:'),
      'Cancelled.',
    );
  }
  const entry = [
    `  - name: ${name}`,
    '    type: fabric-semanticmodel',
    '    config:',
    `      workspaceId: ${f['workspace-id']}`,
    `      itemId: ${f['item-id']}`,
    '    auth:',
    '      type: delegated',
    '    version: "1"',
    '    operations:',
    '      - name: executeQuery',
  ].join('\n');
  let yml = p.files['rayfin/rayfin.yml'];
  if (connectorNames(p).includes(name)) {
    yml = yml.replace(new RegExp(`  - name: ${name}\\n(    .*\\n?)*`), `${entry}\n`);
  } else {
    yml = /^connectors:\s*$/m.test(yml) ? `${yml.trimEnd()}\n${entry}\n` : `${yml.trimEnd()}\nconnectors:\n${entry}\n`;
  }
  p.files['rayfin/rayfin.yml'] = yml;
  const Type = `${name.charAt(0).toUpperCase()}${name.slice(1).replace(/[-_](\w)/g, (_, c) => c.toUpperCase())}Schema`;
  p.files[`rayfin/connectors/${name}/schema.ts`] = [
    '// @generated — do not edit.',
    '// Playground: Shortened: the real file also has comments describing the connector.',
    "import type { ConnectorConfig } from '@microsoft/rayfin-connectors';",
    "import type { FabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';",
    '',
    `export type ${Type} = FabricSemanticModel<'executeQuery'>;`,
    '',
    'export const connectorConfig = {',
    "  connector: 'fabric-semanticmodel',",
    '} as const satisfies ConnectorConfig;',
    '',
  ].join('\n');
  return done(
    SIMULATED,
    ...naming,
    PG(`Added connector ${name} to rayfin/rayfin.yml.`),
    PG(`Wrote rayfin/connectors/${name}/schema.ts (generated: do not edit).`),
    ...wireConnectors(p),
    '',
    '📦 Install the packages this connector needs:',
    '   npm install @microsoft/rayfin-connector-fabric-semanticmodel@2.0.0 @microsoft/rayfin-connectors@2.0.0',
  );
}

// `npx rayfin connector invoke <name> executeQuery --input '<json>'` (rayfin.ai: CLI reference, connector)
function connectorInvoke(p, args, answer, done, fail) {
  const f = flags(args);
  const [name, op] = f._;
  if (!name || !connectorNames(p).includes(String(name).toLowerCase())) return fail(PG(`No connector named ${name ?? '(none)'} in rayfin/rayfin.yml.`));
  if (connectorType(p, String(name).toLowerCase()) !== 'fabric-semanticmodel') {
    return fail(
      PG('`connector invoke` is simulated for semantic model connectors only. For an entity connector, such as a lakehouse,'),
      PG(`the Rayfin docs suggest proving rows come back with: npx rayfin connector inspect --name ${name} --entity <schema.table> --rows 1`),
    );
  }
  if (op !== 'executeQuery') return fail(PG('A semantic model connector has one operation: executeQuery.'));
  if (typeof f.input !== 'string') return fail(PG('Give the payload with --input \'{"query":"<DAX>"}\'.'));
  let payload;
  try {
    payload = JSON.parse(f.input);
  } catch {
    return fail(PG('--input must be JSON, such as \'{"query":"EVALUATE ROW(\\"Revenue\\", [Revenue])"}\'.'));
  }
  if (typeof payload?.query !== 'string') return fail(PG('The payload needs a "query" with the DAX text.'));
  const result = answer ? answer(String(name).toLowerCase(), payload.query) : undefined;
  if (!result) return fail(PG('No saved answer for that query.'));
  // A failed query, as connector-invoke.js prints it without --json (describeConnectorFailure, failHandled):
  // "❌ Connector invoke failed (<code, or 'connector error'>): <message>", then the hint for the error's category.
  if (result.status !== 'success') {
    const err = result.error ?? {};
    const hints = {
      network: 'The request never reached the service. Check connectivity and any proxy settings, then retry.',
      api: 'The service rejected the request. Confirm you are signed in and have access to the resource.',
      query: 'The service ran the operation and reported an error. Fix the query and retry.',
      overflow: 'The result exceeded a size cap. Lower resultSetRowCountLimit, or narrow the query.',
      unknown: 'Retry with --verbose to see the full response, then check permissions and query syntax.',
    };
    return fail(
      `❌ Connector invoke failed (${err.code || 'connector error'}): ${err.message || 'The connector returned a failed response.'}`,
      ...(hints[err.category] ? [`   ${hints[err.category]}`] : []),
      PG('The saved answer has no error code; a real one may show a code in the brackets.'),
    );
  }
  // Rayfin's CLI reference (invoke) and connector-invoke.js: without --json it prints "✅ Invoked <name>.<operation>",
  // then the output as pretty-printed JSON. Only --json wraps it in { status: 'ok', connector, operation, output }.
  // Rows are cut outside the JSON, never inside it (the real CLI writes a result over 8 KB to a file).
  const cut = result.table.rows.length > 5;
  const output = cut ? { ...result, table: { ...result.table, rows: result.table.rows.slice(0, 5) } } : result;
  return {
    project: p,
    lines: [
      SIMULATED,
      `✅ Invoked ${String(name).toLowerCase()}.executeQuery`,
      ...JSON.stringify(output, null, 2).split('\n'),
      ...(cut ? [PG(`First 5 of ${result.table.rows.length} rows shown.`)] : []),
    ],
    ok: true,
  };
}

// ---------------------------------------------------------------- the app's own data and functions
/**
 * `npx rayfin init` in a project that already has rayfin/rayfin.yml (rayfin.ai: CLI reference, init:
 * rerunning it "reruns configuration"). What a rerun writes in a data app project isn't documented. In the
 * Rayfin CLI 2.0.0's code (commands/init.js), a rerun outside a template asks before overwriting
 * rayfin.yml, and a yes writes a new one from defaults. The playground doesn't run it.
 */
function initRerun(p, fail) {
  if (p.files['rayfin/rayfin.yml'] === undefined) return fail(PG('Only a rerun of init is simulated here, in a project that has rayfin/rayfin.yml.'));
  return fail(
    PG('Not run here. Rayfin\'s docs: rerunning init in a project with rayfin/rayfin.yml "reruns configuration".'),
    PG('What a rerun writes in a project made from a template isn\'t documented. In the Rayfin CLI 2.0.0\'s'),
    PG('code, a rerun outside a template asks "rayfin.yml already exists. Do you want to overwrite it?", and a yes'),
    PG('writes a new rayfin.yml from defaults, without our connectors. So we make the change by hand.'),
  );
}

/** Has the app been deployed (`npx rayfin up`) in this project? */
const deployed = (p) => p.history.some((h) => /^(npx )?rayfin up$/.test(normCommand(h)));

// `npx rayfin up db apply [--force]` (rayfin.ai: Schema changes; CLI reference, up db apply; Known limitations).
// It generates and applies the Data API builder configuration (the schema and the permissions) to the deployed
// app. The real CLI's output isn't documented word for word: these are `Playground:` lines.
function dbApply(p, f, done, fail) {
  const svc = dataService(p);
  if (!svc.enabled) return fail(PG('The data service is off in rayfin/rayfin.yml (services.data.enabled: false): there is no database to apply to.'));
  // Rayfin's docs quote the error as including this text; its exact full wording isn't given.
  if (!svc.dialect) return fail(PG('Stopped: the real apply fails with an error that includes "Dialect is required when Data module is enabled".'));
  if (!deployed(p)) return fail(PG('The real CLI stops: the app must exist first. Run `npx rayfin up` once, then `npx rayfin up db apply`.'));
  const plan = planApply(p, f.force === true);
  if (plan.blocked) {
    const destructive = plan.blocked[0] === 'potentially destructive';
    return fail(
      SIMULATED,
      ...(destructive ? [PG('Stopped: these changes are potentially destructive (data may be lost):'), ...plan.destructive.map((op) => PG(`  ${op}`))] : []),
      ...plan.blocked.filter((b) => b !== 'potentially destructive').map((b) => PG(b)),
      PG(destructive ? 'Nothing was applied. Review the list; re-run with --force only once you accept the loss.' : 'Nothing was applied.'),
    );
  }
  p.db = plan.db;
  return done(
    SIMULATED,
    ...(plan.ops.length
      ? [PG('Applied to the app\'s database (schema and permissions):'), ...plan.ops.map((op) => PG(`  ${op}`))]
      : [PG('Nothing to change: the database already matches the entities.')]),
    ...(f.force === true && plan.destructive.length ? [PG('--force: the potentially destructive changes above were applied.')] : []),
    PG('Rayfin\'s docs: a successful apply doesn\'t prove the data API is ready. Check `npx rayfin up status` before testing.'),
  );
}

// `npx rayfin up status` (rayfin.ai: CLI reference, up status: exits 0 when the recorded deployment is healthy).
function upStatus(p, done, fail) {
  if (!deployed(p)) return fail(PG('No deployment recorded yet: run `npx rayfin up` first.'));
  return done(
    SIMULATED,
    PG('The recorded deployment is healthy. (The real command prints the app\'s address and the state of each'),
    PG('service, in a layout not shown here. It exits 0 when healthy.)'),
  );
}

/** The functions pack's function file (functions-capability/kit/functions/src/function_app.ts), verbatim. */
export const FUNCTION_APP_TEMPLATE = FUNCTIONS_KIT_APP;
export const FUNCTION_APP = 'packages/functions/src/function_app.ts';
/** Where the claim types go: beside the functions package, in packages/auth (rayfin-tools-common dynamicClaimsAuthDir:
 * the functions folder's ../auth), which packages/data/tsconfig.json includes (../auth/*.d.ts). */
export const CLAIMS_TYPES = 'packages/auth/claims.generated.d.ts';
/** The data-modeling pack's starter entity. */
export const DATA_ITEM_FILE = 'packages/data/src/Item.ts';
export { DATA_KIT_INDEX, DATA_KIT_ITEM, SHARED_KIT_INDEX };

/** Are dynamic claims declared, and on, in rayfin.yml? (rayfin.ai: Dynamic auth claims, enable) */
export function dynamicClaims(p) {
  const yml = p.files['rayfin/rayfin.yml'] ?? '';
  return { declared: /^ {4}dynamicClaims:/m.test(yml), enabled: /^ {4}dynamicClaims:\n {6}enabled: true\s*$/m.test(yml) };
}

/** Are Functions on in rayfin.yml? */
export const functionsEnabled = (p) => /^ {2}functions:\n {4}enabled: true\s*$/m.test(p.files['rayfin/rayfin.yml'] ?? '');

// `npx rayfin functions init`: the sources disagree. The template's functions skill (functions-capability/SKILL.md) says not
// to run it here, as it writes to the legacy rayfin/functions; Microsoft Learn (Functions: the project layout) and the
// CLI's own code (functions-init.js, resolveFunctionsTargetDir) resolve --path, then services.functions.path, then
// packages/functions in a workspace. The lessons follow the template's skill and its pack; the playground doesn't run it.
function functionsInit(p, f, done, fail) {
  return fail(
    PG('Not run here. Sources disagree: the template\'s functions skill says not to run it in this template (it would write'),
    PG('to rayfin/functions), while Microsoft Learn and the CLI\'s code say it uses services.functions.path, or packages/functions.'),
    PG('The lessons follow the template: `npm run pack:add -- functions`, then `npm run dev` generates the types.'),
  );
}

/**
 * The type generation `rayfin dev` runs at start for the functions package (rayfin-cli utils/functions-types-generator.js):
 * with dynamic claims on, the claim types (utils/auth-claims-generator.js), or the generator's error, which stops it.
 */
function generateClaimTypes(p) {
  if (!functionsEnabled(p) || p.files[FUNCTION_APP] === undefined) return { lines: [] };
  if (!dynamicClaims(p).enabled && p.files[CLAIMS_TYPES] === undefined) return { lines: [] };
  const contract = claimsContract(p.files[FUNCTION_APP]);
  if (contract.found && contract.problems.length) {
    // rayfin-cli local-services/dev/local-runtime-provisioner.js: a failed first generation is a warning, and dev runs on.
    return { lines: [PG(`rayfin dev warns, and keeps running: "Initial function type generation failed: ${contract.problems[0]}. The watcher retries on the next source change."`)] };
  }
  if (contract.found && dynamicClaims(p).enabled) {
    p.files[CLAIMS_TYPES] = claimsTypesFile(contract.claims);
    return { lines: [PG(`Generated the function types (packages/functions/src/types.ts) and the claim types, ${CLAIMS_TYPES} (and the claims contracts, not shown).`)] };
  }
  delete p.files[CLAIMS_TYPES];
  return { lines: [PG(`No claims function: removed ${CLAIMS_TYPES} and the claims contracts.`)] };
}

/**
 * The dev loop's watcher: while `npm run dev` runs, a change to the functions regenerates the types (the functions
 * skill; rayfin dev's typegen watcher). Only a loop started once Functions were on watches them. Returns whether the
 * claim types changed.
 */
export function watchFunctions(p) {
  if (!p.dev || !p.devFunctions) return false;
  const before = p.files[CLAIMS_TYPES];
  generateClaimTypes(p);
  return p.files[CLAIMS_TYPES] !== before;
}

// ---------------------------------------------------------------- steps
/**
 * Apply a step's file edits. Each edit is { file?, from, to, all? }; file defaults to the page file.
 * An edit with `from: ''` on a file that doesn't exist yet (or is empty) writes the file.
 * Returns { project } or { error }.
 */
export function applyFileEdits(start, edits = []) {
  const p = clone(start);
  // Files belong to the app: with no project yet, there is nowhere to write them.
  if (edits.length && !p.appDir) return { error: 'There is no project yet' };
  for (const e of edits) {
    const file = e.file ?? PAGE_FILE;
    const text = p.files[file];
    if (e.from === '') {
      if (text === undefined || text.trim() === '') {
        p.files[file] = e.to;
        continue;
      }
      if (text.includes(e.to)) continue;
      return { error: `${file} is not empty` };
    }
    if (text === undefined) return { error: `${file} does not exist` };
    if (text.includes(e.from)) {
      p.files[file] = e.all ? text.split(e.from).join(e.to) : text.replace(e.from, e.to);
    } else if (e.to && text.includes(e.to)) {
      continue; // already done
    } else {
      return { error: `${file}: text not found: ${e.from.slice(0, 60)}` };
    }
  }
  if (edits.some((e) => (e.file ?? PAGE_FILE) === FUNCTION_APP)) watchFunctions(p);
  return { project: p };
}

const squash = (s) => s.replace(/\s+/g, ' ').trim();

/** Is a step done in this project? Commands: run before (however spaced). Edits: their result is there. */
export function stepIsDone(p, step) {
  if (step.run) return p.history.filter((h) => normCommand(h) === normCommand(step.run)).length >= (step.nth ?? 1);
  if (!step.edits) return false;
  if (step.done?.absent) return !(p.files[step.done.file ?? PAGE_FILE] ?? '').includes(step.done.absent);
  if (step.done?.before) {
    const text = p.files[step.done.file ?? PAGE_FILE] ?? '';
    const [a, b] = step.done.before;
    return text.includes(a) && text.includes(b) && text.indexOf(a) < text.indexOf(b);
  }
  return step.edits.every((e) => {
    const text = squash(p.files[e.file ?? PAGE_FILE] ?? '');
    const to = squash(e.to);
    const from = squash(e.from);
    // from '' and to '': a new, empty file (made with + New file): done once it exists.
    if (e.from === '') return to === '' ? p.files[e.file ?? PAGE_FILE] !== undefined : text.includes(to);
    return (!to || text.includes(to)) && (!from || to.includes(from) || !text.includes(from));
  });
}

/** Do a step to a project, as "Do it for me" would. */
export function doStep(p, step, answer) {
  if (step.run) {
    const r = runCommand(p, step.run, answer);
    // A command that fails on purpose (`commandFails`) must fail, and changes nothing but the history.
    if (step.commandFails) {
      return r.ok ? { error: `expected this command to fail: ${step.run}`, project: r.project, lines: r.lines } : { project: r.project, lines: r.lines };
    }
    return r.ok ? { project: r.project, lines: r.lines } : { error: r.lines.join('\n'), project: r.project, lines: r.lines };
  }
  if (step.edits) return applyFileEdits(p, step.edits);
  return { project: p };
}

/**
 * Number the steps that run a command the course has run before (such as `npx rayfin up db apply`):
 * such a step is done once the command is in the history that many times. Call it with the course order.
 */
export function numberRuns(order) {
  const seen = new Map();
  for (const lesson of order) {
    for (const step of lesson.steps) {
      if (!step.run) continue;
      const key = normCommand(step.run);
      seen.set(key, (seen.get(key) ?? 0) + 1);
      step.nth = seen.get(key);
    }
  }
}

/** The project at the start of a lesson: every step of every earlier lesson done, from empty. */
export function checkpoint(order, lessonIndex, answer) {
  numberRuns(order);
  let p = emptyProject();
  for (const lesson of order.slice(0, lessonIndex)) {
    for (const step of lesson.steps) {
      const r = doStep(p, step, answer);
      if (r.error) throw new Error(`${lesson.id}: ${r.error}`);
      p = r.project;
    }
  }
  return p;
}
