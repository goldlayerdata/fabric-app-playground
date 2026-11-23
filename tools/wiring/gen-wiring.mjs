// Generates the exact src/lib/connectors.ts text `rayfin connector add` writes (Rayfin CLI 2.0.0,
// dist/services/connector-wiring.js: extractAppOwnedPrologue + renderAppWiring), starting from the connectors
// pack's kit/connectors.ts, for the connector sets the lessons reach. Run from the repository root:
//   node tools/wiring/gen-wiring.mjs > tools/wiring/wiring.json  (needs the local reference install)
import { readFileSync } from 'node:fs';
const cli = '../../reference/rayfin-2.0/node_modules/@microsoft/rayfin-cli';
const { renderAppWiring, extractAppOwnedPrologue } = await import(`${cli}/dist/services/connector-wiring.js`);
const kit = readFileSync(new URL(`${cli}/templates/universal-app/.agents/skills/connectors/kit/connectors.ts`, import.meta.url), 'utf8');
const sm = { factory: 'fabricSemanticModel', package: '@microsoft/rayfin-connector-fabric-semanticmodel' };
const plan = (name, Type, runtime) => ({
  name,
  configAlias: `${name}Config`,
  schemaType: Type,
  schemaAlias: `${name}Schema`,
  schemaAlreadyImported: false,
  schemaImportPath: `../../../../rayfin/connectors/${name}/schema`,
  runtime,
});
const prologue = extractAppOwnedPrologue(kit);
const contoso = renderAppWiring([plan('contoso', 'ContosoSchema', sm)], prologue);
// Later runs start from the generated file: its fenced prologue is carried forward.
const both = renderAppWiring([plan('contoso', 'ContosoSchema', sm), plan('pareto', 'ParetoSchema', sm)], extractAppOwnedPrologue(contoso));
const three = renderAppWiring(
  [plan('contoso', 'ContosoSchema', sm), plan('pareto', 'ParetoSchema', sm), plan('lake', 'LakeSchema', undefined)],
  extractAppOwnedPrologue(both),
);
console.log(JSON.stringify({ kit, contoso, both, three }, null, 2));
