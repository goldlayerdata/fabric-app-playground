// Writes src/pack-kits.mjs: the pack files the lessons show verbatim, read from the local reference install of the
// Rayfin CLI 2.0.0 (templates/universal-app/.agents/skills/<pack>/kit). Run from the repository root:
//   node tools/wiring/write-pack-kits.mjs   (needs the gitignored reference/ install; see MAINTAINING.md 2.12)
import { readFileSync, writeFileSync } from 'node:fs';
const T = new URL('../../reference/rayfin-2.0/node_modules/@microsoft/rayfin-cli/templates/universal-app/.agents/skills/', import.meta.url);
const read = (p) => readFileSync(new URL(p, T), 'utf8').replace(/\r\n/g, '\n');
const lit = (t) => '`' + t.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const kits = {
  DATA_KIT_ITEM: ['data-modeling/kit/data/Item.ts', 'packages/data/src/Item.ts'],
  DATA_KIT_INDEX: ['data-modeling/kit/data/schema.ts', 'packages/data/src/index.ts'],
  SHARED_KIT_INDEX: ['data-modeling/kit/shared/index.ts', 'packages/shared/src/index.ts'],
  FUNCTIONS_KIT_APP: ['functions-capability/kit/functions/src/function_app.ts', 'packages/functions/src/function_app.ts'],
  FUNCTIONS_KIT_PACKAGE: ['functions-capability/kit/functions/package.json', 'packages/functions/package.json'],
};
const out = [
  '// Pack files the playground writes verbatim, from the Rayfin CLI 2.0.0 (templates/universal-app/.agents/skills/<pack>/kit),',
  '// MIT, Microsoft Corporation (see THIRD-PARTY-NOTICES.md). Remade with tools/wiring/write-pack-kits.mjs.',
  ...Object.entries(kits).map(([name, [from, to]]) => `\n// ${from} -> ${to}\nexport const ${name} = ${lit(read(from))};`),
  '',
].join('\n');
writeFileSync(new URL('../../src/pack-kits.mjs', import.meta.url), out);
console.log(`src/pack-kits.mjs: ${Object.keys(kits).length} files`);
