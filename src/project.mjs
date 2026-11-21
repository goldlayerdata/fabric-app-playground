// The learner's project and the simulated terminal. Pure functions: the app and
// tools/check-lessons.mjs both use them, so the checker builds the course exactly as a reader would.
//
// A project is { cwd, appDir, files: { path: text }, packages: [names], dev, history: [lines] }.
// Paths are relative to the app folder. `cwd` is null in the starting folder, or the app folder's name.
//
// What the simulated CLI writes comes from real sources (see each command). Wording the real CLI
// prints that we could not check is not imitated: those lines start with "Playground:".
import lakehouse from '../data/lakehouse.json' with { type: 'json' };
import { claimsContract, claimsTypesFile, dataService, emptyDb, planApply, unlimitedText } from './app-data.mjs';

// ---------------------------------------------------------------- the data app template (Rayfin CLI 2.0.0)
// From @microsoft/rayfin-cli 2.0.0 templates/data-app as bundled with the CLI (MIT, Microsoft Corporation):
// rayfin/rayfin.yml and src/vite-env.d.ts verbatim; package.json's scripts and dependencies verbatim, with
// devDependencies cut to a subset and the other fields left out. A real `npm create` may fetch a newer copy
// of the template from GitHub. The real template has many more files (its own client in
// src/lib/rayfin-client.ts, Fabric sign-in, its own semantic model hook, components, tests, agent files); the playground keeps
// the ones this course uses and starts src/App.tsx empty (the real one starts with a placeholder page), so we write the app ourselves.
const TEMPLATE_PACKAGE = {
  name: 'data-app',
  private: true,
  type: 'module',
  scripts: {
    prebuild: 'rayfin env --framework vite',
    dev: 'rayfin dev',
    'dev:frontend': 'vite',
    build: 'npx fabric-app-data generate -o src/fabric.generated.ts && tsc -b --noCheck && vite build',
    'build:fabric': 'npx fabric-app-data generate -o src/fabric.generated.ts && tsc -b --noCheck && vite build',
    lint: 'eslint .',
    preview: 'vite preview',
    test: 'vitest run',
    'test:watch': 'vitest',
    'test:fabric': 'node scripts/open-fabric-portal.mjs',
  },
  dependencies: {
    '@microsoft/fabric-app-data': '1.0.0',
    '@microsoft/fabric-app-data-embed-client': '1.0.0',
    '@microsoft/fabric-app-data-proxy': '1.0.0',
    '@microsoft/fabric-datagrid': '1.0.0',
    '@microsoft/fabric-visuals': '1.0.0',
    '@microsoft/fabric-visuals-core': '1.0.0',
    '@microsoft/rayfin-auth': '^2.0.0',
    '@microsoft/rayfin-auth-provider-fabric': '^2.0.0',
    '@microsoft/rayfin-client': '^2.0.0',
    '@microsoft/rayfin-core': '^2.0.0',
    '@microsoft/rayfin-data': '^2.0.0',
    '@microsoft/rayfin-functions': '^2.0.0',
    '@microsoft/rayfin-lib': '^2.0.0',
    '@microsoft/rayfin-local-dev': '^2.0.0',
    '@tailwindcss/vite': '^4.2.1',
    clsx: '^2.1.1',
    'framer-motion': '^12.6.2',
    'lucide-react': '^0.577.0',
    react: '^19.0.0',
    'react-dom': '^19.2.5',
    'react-error-boundary': '^6.0.0',
    'tailwind-merge': '^3.5.0',
    tailwindcss: '^4.2.1',
  },
  devDependencies: {
    '@microsoft/rayfin-cli': '^2.0.0',
    '@types/react': '^19.2.14',
    '@types/react-dom': '^19.2.3',
    typescript: '~5.7.2',
    vite: '^7.2.6',
  },
};

const TEMPLATE_RAYFIN_YML = `id: data-app
name: Data App
version: 1.0.0
services:
  auth:
    enabled: true
    fabric:
      enabled: true
    allowedRedirectUris:
      - http://localhost:5173
  data:
    enabled: false
  staticHosting:
    enabled: true
    folder: dist
    buildCommand: npm run build:fabric
    indexDocument: index.html
    assetAccess: protected
  functions:
    enabled: false
`;

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
export const PAGE_FILE = 'src/App.tsx';

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
/** Installed by `npx rayfin functions init`, in the functions package (rayfin/functions/). */
const FUNCTIONS_PACKAGE = '@microsoft/fabric-user-data-functions';
const KNOWN_PACKAGES = new Set([
  ...Object.keys(TEMPLATE_PACKAGE.dependencies),
  ...Object.keys(TEMPLATE_PACKAGE.devDependencies),
  ...CONNECTOR_PACKAGES,
  FUNCTIONS_PACKAGE,
]);

export function emptyProject() {
  return { cwd: null, appDir: null, files: {}, packages: [], dev: false, history: [], db: emptyDb() };
}

const clone = (p) => JSON.parse(JSON.stringify(p));

/** Is a file generated by the CLI (and read-only here)? metadata.json is never edited by hand (rayfin.ai). */
export const isGenerated = (path, text = '') =>
  /^\/\/ @generated/.test(text) || path === 'package.json' || path.endsWith('.yml') || path.endsWith('/metadata.json') || path.endsWith('.generated.d.ts');

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
  '  npm create @microsoft/rayfin@latest contoso-app -- --template dataapp',
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
      '  npm create @microsoft/rayfin@latest <app-name> -- --template dataapp',
      '  cd <app-name>          npm install          npx rayfin login',
      '  npx rayfin connector add --type fabric-semanticmodel --workspace-id <id> --item-id <id> --name <name>',
      '  npx rayfin connector add --type fabric-sqlanalytics --workspace-id <id> --item-id <id> --name <name> --operations read',
      '  npx rayfin connector search --workspace-id <id> --type <type> --json',
      '  npx rayfin connector inspect --name <name> --entity <schema.table> --rows <n>',
      '  npx rayfin up connector apply --name <name>',
      '  npx rayfin connector list          npx rayfin connector invoke <name> executeQuery --input \'{"query":"…"}\'',
      '  npx rayfin up db apply [--force]          npx rayfin up status          npx rayfin functions init',
      '  npm run dev          npx rayfin up          ls          clear',
      ...(p.appDir ? [] : [PG('There is no project yet: the first one, `npm create …`, makes it, in the lesson "Create the project".')]),
    );
  }
  if (cmd === 'clear' || cmd === 'cls') return done();
  if (cmd === 'pwd') return done(p.cwd ? `~/${p.cwd}` : '~');
  if (cmd === 'ls' || cmd === 'dir') {
    if (!p.appDir) return done(PG('An empty folder: no project yet.'), ...NO_PROJECT.slice(1));
    if (!p.cwd) return done(p.appDir);
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

  // npm create @microsoft/rayfin@latest <name> -- --template dataapp   (rayfin.ai Quickstart; Microsoft Learn)
  if (cmd === 'npm' && (w[1] === 'create' || w[1] === 'init') && /^@microsoft\/rayfin(@latest)?$/.test(w[2] ?? '')) {
    const f = flags(w.slice(3));
    const name = f._[0];
    if (p.cwd) return fail(PG('Create the app from your starting folder: run `cd ..` first.'));
    if (!name) return fail(PG('Give the app a folder name: npm create @microsoft/rayfin@latest <app-name> -- --template dataapp'));
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) return fail(PG('Use a lower-case folder name, such as contoso-app.'));
    if (p.appDir) return fail(PG(`This playground holds one app, and ${p.appDir} already exists. Reset the course to start over.`));
    if (f.template === undefined) {
      return fail(
        PG('The real command now asks "How would you like to start?" (the default template, or a built-in one).'),
        PG('The playground skips the question: add -- --template dataapp, for the Fabric analytics app template.'),
      );
    }
    if (f.template !== 'dataapp') return fail(PG(`Only the dataapp template is simulated here (you asked for ${f.template}).`));
    p.appDir = name;
    p.files = {
      'package.json': `${JSON.stringify(TEMPLATE_PACKAGE, null, 2)}\n`,
      'rayfin/rayfin.yml': TEMPLATE_RAYFIN_YML,
      'src/vite-env.d.ts': TEMPLATE_VITE_ENV,
      [PAGE_FILE]: '',
    };
    return done(
      SIMULATED,
      PG(`Created ${name}/ from the dataapp template.`),
      PG('Shown here: package.json, rayfin/rayfin.yml, src/vite-env.d.ts, and an empty src/App.tsx.'),
      PG('The real template has more: its own client (src/lib/rayfin-client.ts), Fabric sign-in, components,'),
      PG('its own semantic model hook, tests, agent files and a placeholder page. Creating it does not sign you in.'),
      PG(`Next: cd ${name}, then npm install.`),
    );
  }

  // npm install [packages]
  if (cmd === 'npm' && (w[1] === 'install' || w[1] === 'i')) {
    if (!p.appDir) return fail(...NO_PROJECT);
    if (!inApp()) return fail(PG(`No package.json here. Move into the project first: cd ${p.appDir}`));
    const named = w.slice(2).filter((a) => !a.startsWith('-'));
    if (!named.length) {
      for (const pkg of [...Object.keys(TEMPLATE_PACKAGE.dependencies), ...Object.keys(TEMPLATE_PACKAGE.devDependencies)]) {
        if (!p.packages.includes(pkg)) p.packages.push(pkg);
      }
      return done(SIMULATED, PG('Installed the template\'s packages, React and the Rayfin client among them.'));
    }
    const pkg = JSON.parse(p.files['package.json']);
    const added = [];
    for (const spec of named) {
      const name = spec.replace(/(?<=.)@[^@/]+$/, '');
      if (!KNOWN_PACKAGES.has(name)) return fail(PG(`${name} is not simulated here. The course needs only the packages it names.`));
      // npm saves with its default ^ prefix unless --save-exact.
      const asked = spec.slice(name.length + 1) || '2.0.0';
      const version = /^[\d]/.test(asked) && !w.includes('--save-exact') ? `^${asked}` : asked;
      pkg.dependencies[name] = version;
      if (!p.packages.includes(name)) p.packages.push(name);
      added.push(`${name}@${version}`);
    }
    pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
    p.files['package.json'] = `${JSON.stringify(pkg, null, 2)}\n`;
    return done(SIMULATED, ...added.map((a) => PG(`added ${a} to package.json`)));
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
  p.dev = true;
  return done(
    SIMULATED,
    PG('A real `rayfin dev` provisions (or reuses) the app\'s Fabric backend, writes RAYFIN_PUBLIC_* values to'),
    PG('rayfin/.env and VITE_* values to .env.local, and serves the page on http://localhost:5173. It keeps'),
    PG('running, so real projects open a second terminal for the next commands.'),
    PG('Two things differ in a real project: rayfin dev does not wire connectors (connector queries work'),
    PG('once the app is deployed with `npx rayfin up`), and the dataapp template\'s README has you view the page through the Fabric portal (&devUri=http://localhost:5173).'),
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
  if (exists && !f.yes) return fail(`Connector "${name}" already exists.`, '   Re-run with --yes to overwrite the existing connector.');

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
    PG(`This template has no generated wiring file, so nothing is wired: we register it in the client ourselves (client.connectors.${name}).`),
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
    '📦 Install the packages this connector needs:',
    '   npm install @microsoft/rayfin-connector-fabric-semanticmodel@2.0.0 @microsoft/rayfin-connectors@2.0.0',
    PG('The real CLI also reports whether it wired the connector into the app. This template has no generated'),
    PG(`wiring file, so nothing is wired: we register it in the client ourselves (client.connectors.${name}).`),
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
  // A failed query: the docs give a non-zero exit and a JSON result, but not its exact outer shape.
  if (result.status !== 'success') {
    return fail(PG('The query failed. The real CLI exits with an error and prints the result; its error part:'), ...JSON.stringify(result.error, null, 2).split('\n').map((l) => PG(l)));
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
    PG('What a rerun writes in a project made from the dataapp template isn\'t documented. In the Rayfin CLI 2.0.0\'s'),
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

/** The scaffold's function file: @microsoft/rayfin-cli 2.0.0 assets/functions/function_app.ts.template, verbatim. */
export const FUNCTION_APP_TEMPLATE = [
  "import { UserDataFunctions } from '@microsoft/fabric-user-data-functions';",
  '',
  'const udf = new UserDataFunctions();',
  '',
  '/**',
  ' * A simple greeting function.',
  ' *',
  ' * The input/output types for this function are autogenerated in ./types.ts so that',
  ' * RayfinClient can invoke it with full type-safety from your frontend app.',
  ' */',
  "udf.func('helloWorld', (firstName: string, lastName: string): string => {",
  '  console.log(`helloWorld invoked for ${firstName} ${lastName}`);',
  '  return `Hello ${firstName} ${lastName}!`;',
  '}, []);',
  '',
].join('\n');
export const FUNCTION_APP = 'rayfin/functions/src/function_app.ts';
export const CLAIMS_TYPES = 'rayfin/auth/claims.generated.d.ts';

/** Are dynamic claims declared, and on, in rayfin.yml? (rayfin.ai: Dynamic auth claims, enable) */
export function dynamicClaims(p) {
  const yml = p.files['rayfin/rayfin.yml'] ?? '';
  return { declared: /^ {4}dynamicClaims:/m.test(yml), enabled: /^ {4}dynamicClaims:\n {6}enabled: true\s*$/m.test(yml) };
}

/** Are Functions on in rayfin.yml? */
export const functionsEnabled = (p) => /^ {2}functions:\n {4}enabled: true\s*$/m.test(p.files['rayfin/rayfin.yml'] ?? '');

// `npx rayfin functions init` (rayfin.ai: CLI reference, functions init; Dynamic auth claims, generate the claim
// types). The lines that aren't `Playground:` lines are the Rayfin CLI 2.0.0's own (commands/functions/functions-init.js).
function functionsInit(p, f, done, fail) {
  const lines = [SIMULATED];
  if (p.files[FUNCTION_APP] === undefined || f.force === true) {
    lines.push('⚡ Scaffolding Rayfin functions project...', '');
    p.files[FUNCTION_APP] = FUNCTION_APP_TEMPLATE;
    const block = '  functions:\n    enabled: true\n    buildCommand: npm run build\n    auth:\n      type: application\n';
    const yml = p.files['rayfin/rayfin.yml'];
    const re = /^ {2}functions:\n(?: {4}.*\n?)*/m;
    p.files['rayfin/rayfin.yml'] = re.test(yml) ? yml.replace(re, block) : `${yml.trimEnd()}\n${block}`;
    if (!p.packages.includes(FUNCTIONS_PACKAGE)) p.packages.push(FUNCTIONS_PACKAGE);
    lines.push(
      '✅ Functions project scaffolded successfully!',
      '📁 Directory: rayfin/functions',
      PG(`Shown here: ${FUNCTION_APP}. The real scaffold also writes package.json, tsconfig.json, host.json,`),
      PG('local.settings.json, src/types.ts and src/secrets.generated.ts.'),
    );
  } else {
    lines.push('ℹ️  rayfin/functions/ already exists — skipping scaffold to preserve your code.', '   Pass --force to overwrite the scaffold with the template defaults.');
  }
  lines.push('', '📦 Installing dependencies...', '✅ Dependencies installed.', '', '📝 Generating types.ts...');
  // Claim types: generated only when rayfin.yml declares services.auth.dynamicClaims.
  if (dynamicClaims(p).declared) {
    const contract = claimsContract(p.files[FUNCTION_APP]);
    if (contract.found && contract.problems.length) {
      // The CLI stops at the first broken rule (utils/auth-claims-generator.js), and functions init reports it.
      return fail(
        ...lines,
        `❌ Error scaffolding functions project: AuthClaimsValidationError: ${contract.problems[0]}`,
        PG('The real output goes on with the error\'s stack trace. Nothing was generated.'),
      );
    }
    if (contract.found) {
      p.files[CLAIMS_TYPES] = claimsTypesFile(contract.claims);
      lines.push(PG(`Wrote ${CLAIMS_TYPES}, and rayfin/auth/claims.contract.json and rayfin/functions/claims.contract.json (not shown).`));
    } else if (p.files[CLAIMS_TYPES] !== undefined) {
      delete p.files[CLAIMS_TYPES];
      lines.push(PG(`No udf.authClaims function: removed ${CLAIMS_TYPES} and the contracts.`));
    }
  }
  lines.push('✅ types.ts generated.', PG('The real command then builds the functions project and installs agent files: not shown.'), '', '🎉 Functions project is ready!');
  return done(...lines);
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
