// Builds the static site into dist/. `npm run build`, or `npm run dev` to serve and rebuild on save.
// Everything is bundled from pinned packages in node_modules: no CDN at run time.
// Two pages: the course (index.html) and the Visuals page (visuals/index.html). Only the Visuals page loads
// Microsoft's visuals packages, so the course bundle doesn't carry them. `npm run build` prints both pages'
// sizes and writes the Visuals page's weight report (dist/visuals/bundle-report.json, read by its Notes page).
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { buildAnswers } from './visuals-answers.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const serve = process.argv.includes('--serve');
const nm = (p) => join(root, 'node_modules', p);
const pkgTypes = (f) => join(root, 'src/editor-types/packages', f);

// Type files the editor loads, at the paths TypeScript's module resolution looks for them.
// `always`: React's types. `packages`: added to the editor once the project installs that package.
const editorLibsPlugin = {
  name: 'editor-libs',
  setup(build) {
    build.onResolve({ filter: /^virtual:editor-libs$/ }, () => ({ path: 'editor-libs', namespace: 'virtual' }));
    build.onLoad({ filter: /^editor-libs$/, namespace: 'virtual' }, () => {
      const always = {
        'node_modules/@types/react/index.d.ts': nm('@types/react/index.d.ts'),
        'node_modules/@types/react/global.d.ts': nm('@types/react/global.d.ts'),
        'node_modules/@types/react/jsx-runtime.d.ts': nm('@types/react/jsx-runtime.d.ts'),
        'node_modules/csstype/index.d.ts': nm('csstype/index.d.ts'),
      };
      const packages = {
        '@microsoft/rayfin-client': { 'playground-types/rayfin-client.d.ts': pkgTypes('rayfin-client.d.ts') },
        '@microsoft/rayfin-auth': { 'playground-types/rayfin-auth.d.ts': pkgTypes('rayfin-auth.d.ts') },
        '@microsoft/rayfin-connectors': { 'playground-types/rayfin-connectors.d.ts': pkgTypes('rayfin-connectors.d.ts') },
        '@microsoft/rayfin-connector-fabric-semanticmodel': {
          'playground-types/rayfin-connector-fabric-semanticmodel.d.ts': pkgTypes('rayfin-connector-fabric-semanticmodel.d.ts'),
        },
        '@microsoft/rayfin-core': { 'playground-types/rayfin-core.d.ts': pkgTypes('rayfin-core.d.ts') },
        '@microsoft/rayfin-data': { 'playground-types/rayfin-data.d.ts': pkgTypes('rayfin-data.d.ts') },
        '@microsoft/rayfin-connector-fabric-graphql': {
          'playground-types/rayfin-connector-fabric-graphql.d.ts': pkgTypes('rayfin-connector-fabric-graphql.d.ts'),
        },
        '@microsoft/fabric-user-data-functions': {
          'playground-types/fabric-user-data-functions.d.ts': pkgTypes('fabric-user-data-functions.d.ts'),
          'playground-types/fabric-user-data-functions-claims.d.ts': pkgTypes('fabric-user-data-functions-claims.d.ts'),
        },
        vite: { 'node_modules/vite/client.d.ts': pkgTypes('vite-client.d.ts') },
      };
      const read = (map) => Object.fromEntries(Object.entries(map).map(([k, f]) => [k, readFileSync(f, 'utf8')]));
      const out = {
        always: read(always),
        packages: Object.fromEntries(Object.entries(packages).map(([pkg, files]) => [pkg, read(files)])),
      };
      const watchFiles = [...Object.values(always), ...Object.values(packages).flatMap((f) => Object.values(f))];
      return { contents: JSON.stringify(out), loader: 'json', watchFiles };
    });
  },
};

const common = {
  absWorkingDir: root,
  bundle: true,
  minify: !serve,
  sourcemap: serve,
  logLevel: 'info',
  legalComments: 'linked',
  define: { 'process.env.NODE_ENV': JSON.stringify(serve ? 'development' : 'production') },
};

const configs = [
  {
    ...common,
    entryPoints: { app: join(root, 'src/app.ts') },
    outdir: join(dist, 'assets'),
    metafile: true,
    format: 'esm',
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    loader: { '.ttf': 'file', '.woff2': 'file', '.woff': 'file' },
    assetNames: 'files/[name]-[hash]',
    plugins: [editorLibsPlugin],
  },
  {
    ...common,
    entryPoints: {
      'editor.worker': nm('monaco-editor/esm/vs/editor/editor.worker.js'),
      'ts.worker': nm('monaco-editor/esm/vs/languages/features/typescript/ts.worker.js'),
    },
    outdir: join(dist, 'assets'),
    format: 'iife',
  },
  {
    ...common,
    entryPoints: { runtime: join(root, 'src/runtime.tsx') },
    outdir: dist,
    format: 'iife',
    jsx: 'automatic',
  },
];

// ---------------------------------------------------------------- the Visuals page
const visualsDir = join(root, 'src/visuals');
const visualsApp = join(visualsDir, 'app');

// Vite-style `import text from "./file.dax?raw"`, as the Rayfin template's query files do.
const rawPlugin = {
  name: 'raw',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({ path: resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw' }));
    build.onLoad({ filter: /.*/, namespace: 'raw' }, (args) => ({ contents: readFileSync(args.path, 'utf8'), loader: 'text', watchFiles: [args.path] }));
  },
};

const listFiles = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? listFiles(p) : [p];
});

// virtual:answers = the answer book (tools/visuals-answers.mjs); virtual:sources = the text of every file under
// src/visuals/app, so the code on the page is exactly the code that runs.
const visualsVirtualPlugin = {
  name: 'visuals-virtual',
  setup(build) {
    build.onResolve({ filter: /^virtual:(answers|sources)$/ }, (args) => ({ path: args.path.slice(8), namespace: 'virtual' }));
    build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
      if (args.path === 'answers') {
        return {
          contents: JSON.stringify(buildAnswers(root)),
          loader: 'json',
          watchFiles: [...listFiles(join(visualsApp, 'queries')), join(root, 'data/snapshots.json'), join(root, 'data/catalog.json')],
        };
      }
      const files = listFiles(visualsApp);
      const out = Object.fromEntries(files.map((f) => [relative(visualsApp, f).replace(/\\/g, '/'), readFileSync(f, 'utf8')]));
      return { contents: JSON.stringify(out), loader: 'json', watchFiles: files };
    });
  },
};

configs.push({
  ...common,
  entryPoints: { main: join(visualsDir, 'shell/main.tsx') },
  outdir: join(dist, 'visuals/assets'),
  format: 'esm',
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  metafile: true,
  jsx: 'automatic',
  tsconfig: join(visualsDir, 'tsconfig.json'),
  loader: { '.woff2': 'file', '.woff': 'file' },
  assetNames: 'files/[name]-[hash]',
  plugins: [rawPlugin, visualsVirtualPlugin],
});

// Bytes in the Visuals page's output, split by where the input came from (minified, before gzip).
function weigh(metafile) {
  const groups = {
    'fabric-visuals-core 5.4.0 (under fabric-slicers)': /fabric-slicers\/node_modules\/@microsoft\/fabric-visuals-core/,
    'fabric-visuals 1.0.0': /node_modules\/@microsoft\/fabric-visuals\//,
    'fabric-visuals-core 1.0.0': /node_modules\/@microsoft\/fabric-visuals-core\//,
    'fabric-datagrid 1.0.0': /node_modules\/@microsoft\/fabric-datagrid\//,
    'fabric-slicers 4.4.0': /node_modules\/@microsoft\/fabric-slicers\/dist/,
    'vega, vega-lite, vega-tooltip and their d3 parts': /node_modules\/(vega|d3-|delaunator|robust-predicates|internmap|topojson|json-stringify-pretty-compact|clone)/,
    'react, react-dom, scheduler': /node_modules\/(react|react-dom|scheduler)\//,
    '@griffel (CSS-in-JS)': /node_modules\/@griffel\//,
    '@fluentui/react-icons': /node_modules\/@fluentui\//,
    'radix-ui, @radix-ui, date-fns, daypicker, lodash.debounce (slicer deps)': /node_modules\/(radix-ui|@radix-ui|@date-fns|date-fns|@daypicker|react-day-picker|lodash\.debounce|@floating-ui|aria-hidden|react-remove-scroll|use-callback-ref|use-sidecar|get-nonce|tslib|react-style-singleton)/,
    'numfmt (number formats)': /node_modules\/numfmt\//,
    '@tanstack/react-virtual': /node_modules\/@tanstack\//,
    'page shell + app code (src/visuals, src/top.css)': /^src\//,
    'saved answers + code text': /^(virtual|raw):/,
  };
  const sums = Object.fromEntries(Object.keys(groups).map((k) => [k, 0]));
  sums.other = 0;
  const other = {};
  let js = 0, css = 0, files = 0, mainJs = 0;
  for (const [file, out] of Object.entries(metafile.outputs)) {
    if (file.endsWith('.js')) { js += out.bytes; if (file.endsWith('main.js')) mainJs = out.bytes; }
    else if (file.endsWith('.css')) css += out.bytes;
    else if (!file.endsWith('.map') && !file.endsWith('.txt')) files += out.bytes;
    for (const [input, { bytesInOutput }] of Object.entries(out.inputs ?? {})) {
      const p = input.replace(/\\/g, '/');
      const key = Object.keys(groups).find((k) => groups[k].test(p));
      if (key) sums[key] += bytesInOutput;
      else { sums.other += bytesInOutput; const m = p.match(/node_modules\/((@[^/]+\/)?[^/]+)/); const n = m ? m[1] : p; other[n] = (other[n] ?? 0) + bytesInOutput; }
    }
  }
  let gzip = 0;
  for (const file of Object.keys(metafile.outputs)) if (file.endsWith('.js') || file.endsWith('.css')) gzip += gzipSync(readFileSync(join(root, file))).length;
  return { js, mainJs, lazyJs: js - mainJs, css, fontsAndFiles: files, gzipJsCss: gzip, byInput: sums, otherInputs: other };
}

function copyStatic() {
  mkdirSync(dist, { recursive: true });
  cpSync(join(root, 'src/index.html'), join(dist, 'index.html'));
  mkdirSync(join(dist, 'visuals'), { recursive: true });
  cpSync(join(visualsDir, 'index.html'), join(dist, 'visuals/index.html'));
  cpSync(join(root, 'src/preview.html'), join(dist, 'preview.html'));
  cpSync(join(root, 'src/favicon.svg'), join(dist, 'favicon.svg'));
  cpSync(nm('@tailwindcss/browser/dist/index.global.js'), join(dist, 'tailwind.js'));
  cpSync(join(root, 'THIRD-PARTY-NOTICES.md'), join(dist, 'THIRD-PARTY-NOTICES.md'));
  cpSync(join(root, 'LICENSE'), join(dist, 'LICENSE.txt'));
  cpSync(nm('monaco-editor/ThirdPartyNotices.txt'), join(dist, 'monaco-ThirdPartyNotices.txt'));
}

rmSync(dist, { recursive: true, force: true });
copyStatic();

if (serve) {
  const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
  await Promise.all(contexts.map((c) => c.watch()));
  const { port } = await contexts[0].serve({ servedir: dist, port: 5180, host: '127.0.0.1' });
  console.log(`\n  page playground: http://localhost:${port}/\n  visuals page:    http://localhost:${port}/visuals/\n`);
} else {
  const [course, , , visuals] = await Promise.all(configs.map((c) => esbuild.build(c)));
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  // The course page: app.js with its chunks and CSS (the editor's workers and the preview's runtime are separate files).
  const courseBytes = (ext) => Object.entries(course.metafile.outputs).filter(([f]) => f.endsWith(ext)).reduce((a, [, o]) => a + o.bytes, 0);
  console.log(`\n  course page: app.js and its chunks ${kb(courseBytes('.js'))}, CSS ${kb(courseBytes('.css'))}`);
  const report = { measuredAt: new Date().toISOString(), ...weigh(visuals.metafile) };
  writeFileSync(join(dist, 'visuals/bundle-report.json'), JSON.stringify(report, null, 2));
  console.log(`  visuals page: main.js ${kb(report.mainJs)} + lazy chunks ${kb(report.lazyJs)}; CSS ${kb(report.css)}; fonts ${kb(report.fontsAndFiles)}; JS+CSS gzipped ${kb(report.gzipJsCss)}`);
  for (const [k, v] of Object.entries(report.byInput)) console.log(`   ${kb(v).padStart(10)}  ${k}`);
  const others = Object.entries(report.otherInputs).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (others.length) console.log('  other:', others.map(([k, v]) => `${k} ${kb(v)}`).join(', '));
}
