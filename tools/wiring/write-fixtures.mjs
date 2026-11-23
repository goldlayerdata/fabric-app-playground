// Writes src/wiring-fixtures.mjs from wiring.json (made by gen-wiring.mjs). Run after gen-wiring.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
const w = JSON.parse(readFileSync(new URL('./wiring.json', import.meta.url), 'utf8'));
const lit = (t) => '`' + t.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const out = `// The exact text Rayfin CLI 2.0.0 writes to packages/frontend/src/lib/connectors.ts, made by running its own code
// from the reference install (dist/services/connector-wiring.js: extractAppOwnedPrologue + renderAppWiring) on the
// connectors pack's kit/connectors.ts (templates/universal-app/.agents/skills/connectors). MIT, Microsoft Corporation
// (see THIRD-PARTY-NOTICES.md). Remade with tools/wiring/gen-wiring.mjs and tools/wiring/write-fixtures.mjs.
// WIRING is keyed by the connectors the file wires, in rayfin.yml order.
export const CONNECTORS_KIT = ${lit(w.kit)};

export const WIRING = {
  contoso: ${lit(w.contoso)},
  'contoso,pareto': ${lit(w.both)},
  'contoso,pareto,lake': ${lit(w.three)},
};
`;
writeFileSync(new URL('../../src/wiring-fixtures.mjs', import.meta.url), out);
console.log('wrote src/wiring-fixtures.mjs');
