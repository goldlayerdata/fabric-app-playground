// Serves the built dist/ folder as it would be published (no rebuilds). `npm run preview`.
import * as esbuild from 'esbuild';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const ctx = await esbuild.context({});
const { port } = await ctx.serve({ servedir: dist, port: 5181, host: '127.0.0.1' });
console.log(`  built playground: http://localhost:${port}/`);
