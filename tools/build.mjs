// Builds the static site into dist/. `npm run build`, or `npm run dev` to serve and rebuild on save.
// Everything is bundled from pinned packages in node_modules: no CDN at run time.
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

function copyStatic() {
  mkdirSync(dist, { recursive: true });
  cpSync(join(root, 'src/index.html'), join(dist, 'index.html'));
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
  const { port } = await contexts[0].serve({ servedir: dist, port: 5180 });
  console.log(`\n  page playground: http://localhost:${port}/\n`);
} else {
  await Promise.all(configs.map((c) => esbuild.build(c)));
}
