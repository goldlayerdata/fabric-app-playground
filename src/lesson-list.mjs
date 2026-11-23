// The lessons, one step at a time. Their order, and the modules they sit in, are in course.mjs.
// There are no start files: the course is one project that grows from an empty folder. Each lesson
// starts where the one before it ended (a lesson's "checkpoint" is every earlier step, done).
//
// Each lesson:
//   goal     what the reader can do after it ("You'll be able to: …"), lower case, no full stop
//   builds   ids of earlier lessons it uses (shown as "Builds on")
//   pbi      the idea in Power BI terms; idea: what this lesson does
//   steps    see below
//   summary  2 or 3 bullets, closing the lesson
//   fabric   { text, links: [{ href, label }] }: how this looks in a real Fabric app
//            (Microsoft Learn or rayfin.ai only; checked by tools/check-lessons.mjs)
//
// Each step does one thing:
//   do      what to do, and where. Short.
//   code    optional snippet to paste or type, exactly as it goes in (shown with a Copy button)
//   copy    optional: false when the code is only to read, because Do it for me writes it (no Copy button)
//   run     optional: a command for the terminal. "Do it for me" runs it; done once it has been run.
//   see     optional: what is visible once it's done
//   why     optional: the explanation, shown under "see" in a quieter style
//   file    optional: the file the step is about: it opens in the editor and gets a pink dot in the file
//           list; the card offers "Open …" when another file is open. Default: the file of its first edit, or src/App.tsx for a
//           step with only a `find`. It must be in the project by then, unless the step creates it.
//   find    optional: text to mark in that file (pink), and select with "Show me in the code"
//   point   optional: a part of the playground to outline: editor, files (the file list), preview,
//           status (the query count, shown only on such a card), terminal, log, queries, help, run, reset,
//           data, signin. A tab of the bottom panel (terminal, log, queries, data, help) also opens.
//           One action per step: creating a file and pasting into it are two steps.
//   edits   optional: the exact change, as [{ file?, from, to, all? }] (file defaults to packages/frontend/src/App.tsx;
//           from: '' writes a new or empty file). An edit whose `to` starts with its `from` adds under
//           that line, and "Show me in the code" puts the cursor there; one whose `to` ends with its
//           `from` adds above it. Used by "Do it for me", by the done tick, and by
//           tools/check-lessons.mjs, which builds the whole course from empty and type-checks after
//           every step.
//   done    optional: another way to tell an edit step is done: { file, before: [a, b] } or { file, absent }
//   errors  optional: type errors expected in the project after this step (default 0). '1+': at least one.
//           Counted after every edit and every command; a step that only looks can name a count too.
//           The card then offers "Show the red line", which opens the file it is in.
//   queryFails  optional: after this step, the page sends a query saved as the model's error
//   commandFails  optional: the step's `run` command fails on purpose (the checker expects the failure)
//   visual  optional: a page of the Visuals page (an id in src/visuals/pages.mjs) with the same kind of visual,
//           drawn with Microsoft's visuals packages. Shown as a small link under Why, never as an action.
//
// Text formatting: inline `code`, **bold**, and [[term]] or [[shown text|term-id]] for a word in the
// glossary (terms.mjs). Nothing else.
import * as C from './course-code.mjs';
import { DATA_ITEM_FILE, DATA_KIT_INDEX, FUNCTION_APP, FUNCTION_APP_TEMPLATE, PLACEHOLDER, SHARED_KIT_INDEX, sqlPlaceholder } from './project.mjs';

const LEARN = 'https://learn.microsoft.com/fabric/apps';
const learn = {
  projectStructure: { href: `${LEARN}/project-structure`, label: 'Fabric Apps project structure (Microsoft Learn)' },
  createCli: { href: `${LEARN}/create-app-with-cli#create-a-new-app-from-cli`, label: 'Create a Fabric app with the Rayfin CLI (Microsoft Learn)' },
  functionsLayout: { href: `${LEARN}/functions#understand-the-project-layout`, label: 'Functions: the project layout (Microsoft Learn)' },
  template: { href: `${LEARN}/data-apps-template`, label: 'Create an app connected to a semantic model (Microsoft Learn)' },
  templateWhy: { href: `${LEARN}/data-apps-template#why-use-the-data-app-template`, label: 'Why use the data app template? (Microsoft Learn)' },
  templateChecks: { href: `${LEARN}/data-apps-template#browser-validation`, label: 'Browser validation (Microsoft Learn)' },
  templateVerify: { href: `${LEARN}/data-apps-template#deploy-and-verify-the-app`, label: 'Deploy and verify the app (Microsoft Learn)' },
  query: { href: `${LEARN}/connectors#query-connected-data`, label: 'Query connected data (Microsoft Learn)' },
  addConnector: { href: `${LEARN}/connectors#add-a-connector`, label: 'Add a connector (Microsoft Learn)' },
  deploy: { href: `${LEARN}/connectors#deploy-the-connector`, label: 'Deploy the connector (Microsoft Learn)' },
  templateAgent: { href: `${LEARN}/data-apps-template#build-the-app-with-a-coding-agent`, label: 'Build the app with a coding agent (Microsoft Learn)' },
  copilotReview: { href: `${LEARN}/create-app-with-github-copilot#review-the-generated-changes`, label: 'Review the generated changes (Microsoft Learn)' },
  entityConnector: { href: `${LEARN}/connectors#configure-an-entity-connector`, label: 'Configure an entity connector (Microsoft Learn)' },
  secureConnector: { href: `${LEARN}/connectors#secure-connector-access`, label: 'Secure connector access (Microsoft Learn)' },
  dataModels: { href: `${LEARN}/data-models`, label: 'Define data models (Microsoft Learn)' },
  applySchema: { href: `${LEARN}/data-models#apply-schema-changes`, label: 'Apply schema changes (Microsoft Learn)' },
  dataPermissions: { href: `${LEARN}/data-permissions`, label: 'Define data permissions (Microsoft Learn)' },
  authentication: { href: `${LEARN}/authentication`, label: 'Authentication (Microsoft Learn)' },
  modelPermissions: { href: 'https://learn.microsoft.com/power-bi/connect-data/service-datasets-permissions', label: 'Semantic model permissions (Microsoft Learn)' },
  infoViewMeasures: { href: 'https://learn.microsoft.com/dax/info-view-measures-function-dax#remarks', label: 'INFO.VIEW.MEASURES (Microsoft Learn)' },
  daxErrors: { href: 'https://learn.microsoft.com/power-bi/developer/execute-dax-queries-arrow/best-practices#handle-errors-and-retries', label: 'Execute DAX Queries: handle errors (Microsoft Learn)' },
};
const rayfin = {
  docs: { href: 'https://rayfin.ai/docs', label: 'Rayfin docs overview (rayfin.ai)' },
  quickstart: { href: 'https://rayfin.ai/docs/start/quickstart', label: 'Quickstart (rayfin.ai)' },
  adding: { href: 'https://rayfin.ai/docs/connectors/adding', label: 'Adding a connector (rayfin.ai)' },
  clientSetup: { href: 'https://rayfin.ai/docs/connectors/client-setup', label: 'Wiring connectors into your app (rayfin.ai)' },
  semanticModels: { href: 'https://rayfin.ai/docs/connectors/semantic-models', label: 'Semantic models (rayfin.ai)' },
  connectors: { href: 'https://rayfin.ai/docs/connectors', label: 'Connectors (rayfin.ai)' },
  entityGeneration: { href: 'https://rayfin.ai/docs/connectors/entity-generation', label: 'Generating entity files (rayfin.ai)' },
  sqlSources: { href: 'https://rayfin.ai/docs/connectors/sql-sources', label: 'Fabric SQL sources (rayfin.ai)' },
  sqlRead: { href: 'https://rayfin.ai/docs/connectors/sql-sources#read-rows-with-the-query-chain', label: 'Read rows with the query chain (rayfin.ai)' },
  sqlAggregate: { href: 'https://rayfin.ai/docs/connectors/sql-sources#aggregate-connector-rows', label: 'Aggregate connector rows (rayfin.ai)' },
  onePage: { href: 'https://rayfin.ai/docs/reference/known-limitations#collection-queries-return-only-one-page-unless-you-paginate', label: 'Known limitations: one page (rayfin.ai)' },
  connectorAuth: { href: 'https://rayfin.ai/docs/connectors/auth', label: 'Connector authentication (rayfin.ai)' },
  cliConnector: { href: 'https://rayfin.ai/docs/reference/cli/connector', label: 'rayfin connector (rayfin.ai)' },
  data: { href: 'https://rayfin.ai/docs/data', label: 'Data (rayfin.ai)' },
  dataClient: { href: 'https://rayfin.ai/docs/data#set-up-the-client', label: 'Set up the client (rayfin.ai)' },
  childServices: { href: 'https://rayfin.ai/docs/deploy/fabric-apps#child-services', label: 'Fabric apps: child services (rayfin.ai)' },
  ymlData: { href: 'https://rayfin.ai/docs/reference/config/rayfin-yml#servicesdata', label: 'rayfin.yml: services.data (rayfin.ai)' },
  modeling: { href: 'https://rayfin.ai/docs/data/modeling', label: 'Modeling entities (rayfin.ai)' },
  fieldTypes: { href: 'https://rayfin.ai/docs/data/field-types', label: 'Field types (rayfin.ai)' },
  textMax: { href: 'https://rayfin.ai/docs/data/field-types#text-length-and-mssql', label: 'Text length and MSSQL (rayfin.ai)' },
  nullable: { href: 'https://rayfin.ai/docs/data/field-types#the-nullable-pattern', label: 'The nullable pattern (rayfin.ai)' },
  noDecorator: { href: 'https://rayfin.ai/docs/data/permissions#entities-without-a-permission-decorator', label: 'Entities without a permission decorator (rayfin.ai)' },
  migrations: { href: 'https://rayfin.ai/docs/data/migrations', label: 'Schema changes (rayfin.ai)' },
  querying: { href: 'https://rayfin.ai/docs/data/querying', label: 'Querying (rayfin.ai)' },
  mutations: { href: 'https://rayfin.ai/docs/data/mutations', label: 'Creating, updating and deleting (rayfin.ai)' },
  policies: { href: 'https://rayfin.ai/docs/data/permissions#row-level-policies-with-the-policy-dsl', label: 'Row-level policies (rayfin.ai)' },
  stampOwner: { href: 'https://rayfin.ai/docs/data/permissions#stamp-owner-fields-from-functions', label: 'Stamp owner fields (rayfin.ai)' },
  sessions: { href: 'https://rayfin.ai/docs/auth/sessions', label: 'Sessions (rayfin.ai)' },
  fabricSso: { href: 'https://rayfin.ai/docs/auth/fabric-sso', label: 'Fabric SSO (rayfin.ai)' },
  delegatedAccess: { href: 'https://rayfin.ai/docs/auth/delegated-access#which-identity-each-surface-uses', label: 'Which identity each surface uses (rayfin.ai)' },
  functionTokens: { href: 'https://rayfin.ai/docs/auth/delegated-access#function-connections-run-as-the-app', label: 'Function connections run as the app (rayfin.ai)' },
  localTokens: { href: 'https://rayfin.ai/docs/reference/known-limitations#local-function-connections-use-your-own-identity', label: 'Known limitations: local tokens are yours (rayfin.ai)' },
  dynamicClaims: { href: 'https://rayfin.ai/docs/auth/dynamic-claims', label: 'Dynamic auth claims (rayfin.ai)' },
  claimRules: { href: 'https://rayfin.ai/docs/auth/dynamic-claims#claim-rules', label: 'Claim rules (rayfin.ai)' },
  regionLimit: { href: 'https://rayfin.ai/docs/reference/known-limitations#dynamic-auth-claims-depend-on-the-workspaces-region', label: 'Known limitations: region (rayfin.ai)' },
  filterClaims: { href: 'https://rayfin.ai/docs/auth/dynamic-claims#filter-data-with-claims', label: 'Filter data with claims (rayfin.ai)' },
  browserClaims: { href: 'https://rayfin.ai/docs/auth/dynamic-claims#read-claims-in-the-browser', label: 'Read claims in the browser (rayfin.ai)' },
};

const APP = 'packages/frontend/src/App.tsx';
const AGENT = 'packages/frontend/src/SalesOverview.tsx';
// The app is the default template, the Universal App: an npm workspace whose frontend is packages/frontend. Its src keeps
// components/ for visuals, hooks/ for React hooks, lib/ for the client and other shared code, and queries/<page>/ for the
// DAX (the analytics skill).
const FE_SRC = 'packages/frontend/src/';
const CLIENT = 'packages/frontend/src/lib/rayfin-client.ts';
const HOOK = 'packages/frontend/src/hooks/use-semantic-model-query.ts';
const CONNECTORS = 'packages/frontend/src/lib/connectors.ts';
const CONV = 'packages/frontend/src/lib/conversions.ts';
const FILTERS = 'packages/frontend/src/lib/filters.ts';
const KPI = 'packages/frontend/src/components/kpi-card.tsx';
const BAR = 'packages/frontend/src/components/bar-list.tsx';
const ERR = 'packages/frontend/src/components/error-panel.tsx';
const SLICER = 'packages/frontend/src/components/year-slicer.tsx';
const USE_LOAD = 'packages/frontend/src/hooks/use-load.ts';
const USE_SESSION = 'packages/frontend/src/hooks/use-session.ts';
// Each query: a .dax file and a .ts file of the same name, in a folder per page.
const COUNTRY_DAX = 'packages/frontend/src/queries/overview/revenue-by-store-country.dax';
const COUNTRY_TS = 'packages/frontend/src/queries/overview/revenue-by-store-country.ts';
const TOTALS_DAX = 'packages/frontend/src/queries/overview/sales-totals.dax';
const TOTALS_TS = 'packages/frontend/src/queries/overview/sales-totals.ts';
const MARGIN_DAX = 'packages/frontend/src/queries/overview/margin-pct.dax';
const MARGIN_TS = 'packages/frontend/src/queries/overview/margin-pct.ts';
const CATEGORY_DAX = 'packages/frontend/src/queries/overview/revenue-by-category.dax';
const CATEGORY_TS = 'packages/frontend/src/queries/overview/revenue-by-category.ts';
const YEARS_DAX = 'packages/frontend/src/queries/years/revenue-by-year.dax';
const YEARS_TS = 'packages/frontend/src/queries/years/revenue-by-year.ts';
const PARETO_HEADLINE_DAX = 'packages/frontend/src/queries/categories/pareto-headline.dax';
const PARETO_HEADLINE_TS = 'packages/frontend/src/queries/categories/pareto-headline.ts';
const PARETO_BY_CATEGORY_DAX = 'packages/frontend/src/queries/categories/pareto-by-category.dax';
const PARETO_BY_CATEGORY_TS = 'packages/frontend/src/queries/categories/pareto-by-category.ts';
const REVENUE_CARD_DAX = 'packages/frontend/src/queries/categories/revenue-card.dax';
const REVENUE_CARD_TS = 'packages/frontend/src/queries/categories/revenue-card.ts';
// The index.ts files that re-export them (the template's AGENTS.md, "Re-export via index.ts").
const QUERIES_INDEX = 'packages/frontend/src/queries/index.ts';
const OVERVIEW_INDEX = 'packages/frontend/src/queries/overview/index.ts';
const YEARS_INDEX = 'packages/frontend/src/queries/years/index.ts';
const CATEGORIES_INDEX = 'packages/frontend/src/queries/categories/index.ts';
const reExport = C.reExport;
// A step that makes a new, empty file.
const newFile = (file, lead, extra = {}) => ({
  do: `${lead}click **+ New file** and type \`${file.slice(FE_SRC.length)}\` after the \`${FE_SRC}\` already there.`,
  edits: [{ file, from: '', to: '' }],
  point: 'files',
  see: `An empty \`${file}\`, open in the editor.`,
  ...extra,
});
// A step where Do it for me writes a whole new file: for a query's .ts file that only hands out its .dax text.
// `more`: other edits the same card makes, such as the file's line in its folder's index.ts.
const writeFile = (file, text, doText, extra = {}, more = []) => ({ do: doText, code: text, copy: false, edits: [{ file, from: '', to: text }, ...more], point: 'files', see: 'Nothing on the page yet.', ...extra });
// A step that pastes a whole file into the empty file the step before made.
const paste = (file, text, doText, extra = {}) => ({ do: doText, code: text, edits: [{ file, from: '', to: text }], see: 'Nothing on the page yet.', ...extra });
const YML = 'rayfin/rayfin.yml';
const UNDO = 'Undo: click in the editor and press Ctrl+Z (Cmd+Z on a Mac), or use **Do it for me**.';

const ADD_CONNECTOR = `npx rayfin connector add --type fabric-semanticmodel --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.itemId} --name contoso`;
// The analytics skill: install the versions connector add prints into the frontend workspace, not at the root.
const INSTALL_CONNECTOR = 'npm install -w @rayfin-app/frontend @microsoft/rayfin-connector-fabric-semanticmodel@2.0.0 @microsoft/rayfin-connectors@2.0.0';
const PACK_CONNECTORS = 'npm run pack:add -- connectors';
const PACK_ANALYTICS = 'npm run pack:add -- analytics';
const INVOKE = 'npx rayfin connector invoke contoso executeQuery --input \'{"query":"EVALUATE ROW ( \\"Revenue\\", [Revenue] )"}\'';

// Lines the lessons edit more than once.
const COUNTRY_ROW = "    'store'[CountryName],\n    \"Revenue\", [Revenue]";
const COUNTRY_ROW_ORDERS = "    'store'[CountryName],\n    \"Orders\", [# Orders],\n    \"Revenue\", [Revenue]";
// /* … */ is a DAX comment: Microsoft Learn, DAX user-defined functions ("multi-line (/* */) comments").
const COUNTRY_ROW_MARKED = "    'store'[CountryName],\n    /* filters */ \"Revenue\", [Revenue]";
const KPI_VALUE_LINE = "      <p className=\"text-2xl font-bold\">{value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}</p>\n";
const KPI_VALUE_FORMAT = "      <p className=\"text-2xl font-bold\">\n        {format === 'percent'\n          ? value.toLocaleString('en-US', { style: 'percent', maximumFractionDigits: 1 })\n          : value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}\n      </p>\n";
const COMP_IMPORT = "import { KpiCard } from './components/kpi-card';\n";
const IMP_BAR = "import { BarList } from './components/bar-list';\n";
const IMP_ERR = "import { ErrorPanel } from './components/error-panel';\n";
const IMP_SLICER = "import { YearSlicer } from './components/year-slicer';\n";
const IMP_HOOK = "import { useSemanticModelQuery } from './hooks/use-semantic-model-query';\n";
const IMP_CONV_1 = "import { toBars } from './lib/conversions';";
const IMP_CONV_2 = "import { toBars, toTotals } from './lib/conversions';";
const IMP_CONV_3 = "import { toBars, toPercent, toTotals } from './lib/conversions';";
// The page's one import of queries, from src/queries/index.ts: names are added to it as queries are added.
const qImport = (...names) => `import { ${names.sort().join(', ')} } from './queries';\n`;
const IMP_Q_1 = qImport('revenueByStoreCountry');
const IMP_Q_2 = qImport('revenueByStoreCountry', 'salesTotals');
const IMP_Q_3 = qImport('marginPct', 'revenueByStoreCountry', 'salesTotals');
const IMP_Q_4 = qImport('marginPct', 'revenueByCategory', 'revenueByStoreCountry', 'salesTotals');
const IMP_Q_5 = qImport('marginPct', 'revenueByCategory', 'revenueByStoreCountry', 'revenueByYear', 'salesTotals');
const FIRST_IMPORTS = `${IMP_HOOK}${IMP_CONV_1}\n${IMP_Q_1}`;
// The .dax import at the top of a query's .ts file, under which a filters import goes.
const TOTALS_DAX_IMPORT = "import salesTotalsDax from './sales-totals.dax?raw';\n";
const COUNTRY_DAX_IMPORT = "import revenueByStoreCountryDax from './revenue-by-store-country.dax?raw';\n";
// The ends of conversions, under which the next one goes.
const PERCENT_END = '  return Number(result.table.rows[0][at]);\n}';
const HEADLINE_END = "text: String(rows[0][at('[Headline]')]) };\n}";
// The page's queries, through the analytics pack's hook: each gives back { data, isLoading, error }.
const COUNTRIES_LINES = '  const countriesQuery = useSemanticModelQuery(revenueByStoreCountry());\n  const countries = countriesQuery.data ? toBars(countriesQuery.data) : [];\n';
const TOTALS_LINES = '  const totalsQuery = useSemanticModelQuery(salesTotals());\n  const totals = totalsQuery.data ? toTotals(totalsQuery.data) : { revenue: 0, orders: 0, customers: 0 };\n';
const MARGIN_LINE = '  const marginQuery = useSemanticModelQuery(marginPct());\n';
const LOADING = '  if (countriesQuery.isLoading || totalsQuery.isLoading || marginQuery.isLoading) return <p className="p-4">Loading…</p>;\n';
// The pack's hook keeps two channels apart: the model's answer, which can be an error, and a call that threw.
const MODEL_ERRORS = "  for (const q of [countriesQuery, totalsQuery, marginQuery]) if (q.data?.status === 'error') return <ErrorPanel message={q.data.error.message} />;\n";
const THROWN_ERRORS = '  for (const q of [countriesQuery, totalsQuery, marginQuery]) if (q.error) return <ErrorPanel message={q.error.message} />;\n';
const YEAR_STATE = '  const [year, setYear] = useState<number | undefined>(undefined);\n';
// The redraw trap: an agent's own loader, made inside the page, in its effect's list.
const TRAP_IMPORT = "import { getRayfinClient } from './lib/rayfin-client';\n";
const TRAP_LINES = '  // An agent\'s own loader for the totals, made inside the page.\n  const loadTotals = () => getRayfinClient().then((c) => c.connectors.contoso.executeQuery({ query: salesTotals(year).query }));\n  const [agentTotals, setAgentTotals] = useState<unknown>();\n  useEffect(() => {\n    loadTotals().then(setAgentTotals);\n  }, [loadTotals]);\n';
const AGENT_RUNDAX_IN_PAGE = '  // Runs a DAX query against the model.\n  const runDax: RunDax = async (query) => (await getRayfinClient()).connectors.contoso.executeQuery({ query });\n\n';

// Chapter 2: the second semantic model.
const PARETO_PAGE = 'packages/frontend/src/ParetoPage.tsx';
const PARETO_SCHEMA_FILE = 'rayfin/connectors/pareto/schema.ts';
const ADD_PARETO_AS_CONTOSO = `npx rayfin connector add --type fabric-semanticmodel --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.paretoId} --name Contoso`;
const ADD_PARETO = `npx rayfin connector add --type fabric-semanticmodel --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.paretoId} --name pareto`;
const INVOKE_HEADLINE_PARETO = 'npx rayfin connector invoke pareto executeQuery --input \'{"query":"EVALUATE ROW ( \\"Headline\\", [Cutoff Headline] )"}\'';
const INVOKE_HEADLINE_CONTOSO = 'npx rayfin connector invoke contoso executeQuery --input \'{"query":"EVALUATE ROW ( \\"Headline\\", [Cutoff Headline] )"}\'';
const PAGES_AGENT = "  agent: { title: 'Agent page', Component: SalesOverview },\n";
const PAGES_PARETO = "  pareto: { title: 'Categories', Component: ParetoPage },\n";
const IMPORT_AGENT = "import SalesOverview from './SalesOverview';\n";
const IMPORT_PARETO = "import ParetoPage from './ParetoPage';\n";

// Chapter 3: the lakehouse.
const LAKE_TS = 'packages/frontend/src/lib/lake.ts';
const LINES = 'packages/frontend/src/LinesPage.tsx';
const LAKE_DIR = 'rayfin/connectors/lake';
const LAKE_METADATA = `${LAKE_DIR}/metadata.json`;
const LAKE_SCHEMA_FILE = `${LAKE_DIR}/schema.ts`;
const LAKE_STORE = `${LAKE_DIR}/Store.ts`;
const LAKE_SALES = `${LAKE_DIR}/Sales.ts`;
const LAKE_SEARCH = `npx rayfin connector search --workspace-id ${PLACEHOLDER.workspaceId} --type fabric-sqlanalytics --json`;
const LAKE_ADD = `npx rayfin connector add --type fabric-sqlanalytics --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.lakehouseId} --name lake --operations read`;
const LAKE_READD = `npx rayfin connector add --type fabric-sqlanalytics --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.lakehouseId} --name lake --operations read --auth delegated`;
const LAKE_READD_APP = `npx rayfin connector add --type fabric-sqlanalytics --workspace-id ${PLACEHOLDER.workspaceId} --item-id ${PLACEHOLDER.lakehouseId} --name lake --operations read --auth application`;
const LAKE_INSTALL = 'npm install -w @rayfin-app/frontend @microsoft/rayfin-connector-fabric-graphql@2.0.0 @microsoft/rayfin-connectors@2.0.0';
const LAKE_INSPECT = 'npx rayfin connector inspect --name lake --entity dbo.store --rows 1';
// Wiring the lakehouse by hand, after taking connectors.ts over (the connectors skill, Generate and wire Category A entities).
const LAKE_MARKER = '// @generated by `rayfin connector add` — do not edit below this line.\n';
const PARETO_WIRE_IMPORT = "import { connectorConfig as paretoConfig, type ParetoSchema as paretoSchema } from '../../../../rayfin/connectors/pareto/schema';\n";
const LAKE_WIRE_IMPORT = "import { connectorConfig as lakeConfig, type LakeSchema as lakeSchema } from '../../../../rayfin/connectors/lake/schema';\n";
const LATEST_LINES_END = '    .first(20)\n    .execute();\n}\n';
const LINES_HOOK = '  const lines = useLoad(async () => latestLines(await storeKeysIn(country)), country);\n';
const LINES_END = '      </section>\n    </div>\n  );\n}\n';

// The app's own data, sign-in and claims.
const TARGET = 'packages/data/src/SalesTarget.ts';
const DATA_SCHEMA = 'packages/data/src/index.ts';
const SHARED_SCHEMA = 'packages/shared/src/index.ts';
const TARGETS_TS = 'packages/frontend/src/lib/targets.ts';
const TARGETS_PAGE = 'packages/frontend/src/TargetsPage.tsx';
const SESSION_TS = 'packages/frontend/src/lib/session.ts';
const DB_APPLY = 'npx rayfin up db apply';
const FABRIC_AUTH = '    fabric:\n      enabled: true\n      externalEntraExchange: true\n';
const AMOUNT_FIELD = '  @decimal({ precision: 18, scale: 2 }) amount!: number;\n';
const AMOUNT_RENAMED = '  @decimal({ precision: 18, scale: 2 }) targetAmount!: number;\n';
const UPDATED_FIELD = '  @date() updatedAt!: Date;\n';
const SESSION_ANCHOR_IMPORT = "import TargetsPage from './TargetsPage';\n";
const NAV_OPEN = '      <nav className="w-36 shrink-0 space-y-1 p-4">\n';
const APP_PAGE_STATE = "  const [page, setPage] = useState<PageId>('overview');\n";
const SESSION_ONCE_FN = C.SESSION_READ.slice(C.SESSION_READ.indexOf('\n// Who is signed in'));
const SESSION_CLIENT_IMPORT = C.SESSION_READ.slice(0, C.SESSION_READ.indexOf('\n// Who is signed in'));
const TARGETS_STATE_END = '  const [editing, setEditing] = useState<{ id: string; amount: string } | undefined>(undefined);\n';

export const lessons = [
  // ================================================================== 0 Start here
  {
    id: 'tour',
    title: 'Tour',
    goal: 'find your way around the playground before we start',
    builds: [],
    pbi: 'Think of Power BI Desktop: the report canvas, the files behind it, and Performance analyzer listing the query each visual sends. Here we build a [[Fabric app|fabric-app]] instead, and everything is code.',
    idea: 'A Fabric app is a web app that runs in Fabric and queries Fabric data, such as a semantic model. AI agents often write its code. In this playground we write one ourselves, from an empty folder, so we can read, fix and trust what an agent writes. First, where everything is.',
    steps: [
      {
        do: 'In the **Terminal** tab, under the page, type this and press Enter:',
        run: 'help',
        point: 'terminal',
        see: 'The commands this terminal knows. A terminal works like this: one line, Enter, and the answer is printed underneath.',
        why: 'Nothing else works yet: there is no project until the next lesson creates one. The commands are simulated, and lines starting with `Playground:` are the playground talking, not the real tool.',
      },
      {
        do: 'Look to the left of the code area: the **file list**.',
        point: 'files',
        see: 'Empty for now. The project\'s files appear here, in their folders: most arrive with the template, and we add ours as we go. Click one to open it.',
      },
      {
        do: 'The code area is where we read and write those files.',
        point: 'editor',
        see: 'Empty too. When a step is about some code, that code is marked in pink.',
        why: 'Our code is TypeScript: JavaScript, plus [[types|type]] that say what kind of value goes where. The editor checks it as we type and underlines problems in red. The page runs again each time you pause typing; Ctrl+S runs it at once.',
      },
      {
        do: 'On the right, the page our app draws.',
        point: 'preview',
        see: 'Nothing yet: we have no app.',
      },
      {
        do: 'Next to **Terminal**, the **Log** tab.',
        point: 'log',
        see: 'Every query the page sends will show up there, with what came back. Like Performance analyzer.',
      },
      {
        do: 'Then the **Queries** tab.',
        point: 'queries',
        see: 'Every query the playground can answer, and a switch to make queries fail on purpose (we use it in **Failure**).',
        why: 'Nothing here talks to Fabric. The answers were saved once from a real Contoso model, so the numbers are real, but only those queries have answers.',
      },
      {
        do: 'Underlined words, like [[component]], open their explanation in the **Help** tab.',
        point: 'help',
        see: 'Common problems first, then the words the lessons use, each with the nearest thing in Power BI.',
      },
      {
        do: 'Steps that change something have **Do it for me**: it types the command or makes the change. **Show me in the code** shows where a change goes, and **Copy** copies a snippet.',
        why: 'Doing it by hand teaches more; both are fine. The project and how far we got are kept in this browser, and **Reset**, above the page, takes a lesson back to its start.',
      },
    ],
    summary: [
      'Files and code on the left, the page on the right, the terminal and the queries under it.',
      'Pink marks show where a step is. **Do it for me** is always there for steps that change something.',
      'Commands and data are simulated. Nothing connects to Fabric.',
    ],
    fabric: {
      text: 'A real Fabric app starts the same way: a terminal, an empty folder and the Rayfin command-line tool.',
      links: [rayfin.quickstart],
    },
  },

  // ================================================================== 1 Set up the project
  {
    id: 'create',
    title: 'Create the project',
    goal: 'create a Fabric app project from Rayfin\'s default template',
    builds: ['tour'],
    pbi: 'Like File > New in Power BI Desktop, but for an app: one command makes a project folder from a template.',
    idea: 'We use Rayfin\'s default template, the Universal App: a small starting app that grows by adding capabilities. It is created by [[Rayfin]], the toolkit for Fabric apps.',
    steps: [
      {
        do: 'In the **Terminal**, create the project:',
        run: 'npm create @microsoft/rayfin@latest contoso-app -- --template blankapp',
        point: 'terminal',
        see: 'A `contoso-app` folder, and its files in the file list. 🔒 means read-only here. Most locked files are placeholders that say what the real file does; the `package.json` files and `rayfin.yml` are real. Three template files stay open for editing because we change them: `packages/frontend/src/App.tsx`, and the `index.ts` of `packages/data` and `packages/shared`.',
        why: '`npm` fetches and runs JavaScript packages; `npm create` runs a project creator, here Rayfin\'s (`@latest`: its newest version). The lone `--` passes `--template blankapp` on to Rayfin\'s creator. Without it, the real command asks which template to use, and its default, **Use default template**, is this one. (In Windows PowerShell, some versions drop the lone `--`: Rayfin\'s docs say to use `npm.cmd` there.)',
      },
      {
        do: 'Move into the new folder:',
        run: 'cd contoso-app',
        see: 'The text before the cursor now ends in `contoso-app`: commands now run inside that folder, where the project\'s files are.',
      },
      {
        do: 'Look at the file list: the folders, in Power BI terms.',
        point: 'files',
        see: '`packages` holds three packages, like the parts of a PBIP project. `packages/frontend` is the report people see: its `src` holds the pages, `components` the visuals, `hooks` the code that runs a query and waits for the answer, and `lib` the connections and other shared code. `packages/data` and `packages/shared` will hold the app\'s own tables, a small database the app owns. `rayfin` holds the app\'s settings, `rayfin.yml`, a bit like a PBIP\'s `definition.pbir`.',
        why: 'Later chapters add two more: `packages/functions`, for code that runs on the server, and `packages/auth`, for generated sign-in types. Everything else is the template\'s, and we never touch it: the settings files at the top, `.agents` (instructions for coding agents), `scripts`, `packages/frontend/src/services` (sign-in) and `packages/frontend/src/test` (tests). Some folders are folded: click one to open it.',
      },
      {
        do: 'Install the packages the template lists:',
        run: 'npm install',
        see: 'Up to date: `npm create` already installed them, for all three packages. Run it again after changing a `package.json`, or after fetching someone else\'s changes.',
        why: 'A package is code someone else wrote, such as React. The project is an npm workspace: one `npm install`, at the top, serves every package in it.',
      },
      {
        do: 'Open `packages/frontend/package.json` in the file list.',
        file: 'packages/frontend/package.json',
        find: '"dependencies": {',
        see: 'Its `dependencies`: the packages the frontend uses, React and the Rayfin ones among them.',
        why: 'The `package.json` at the top lists the workspace and its `scripts`, the shortcuts: `npm run dev` runs its `dev` line, `rayfin dev`.',
      },
      {
        do: 'Open `rayfin/rayfin.yml`.',
        file: YML,
        find: 'staticHosting:',
        see: 'The app\'s settings, as `name: value` lines; indented lines belong to the line above. `auth` turns on Fabric sign-in; `staticHosting` says which package Fabric hosts (`packages/frontend`), and how to build it.',
        why: 'Read-only here, to keep the lessons on track. In a real project you can edit it; the packs and `connector add` write their parts for you.',
      },
      {
        do: 'Sign in to Fabric:',
        run: 'npx rayfin login',
        see: 'The playground skips it, and says what the real one does.',
        why: '`npx` runs a tool from a package: here, the `rayfin` command. The real `login` opens the browser for Microsoft Entra ID sign-in. No sign-in happens here.',
      },
      {
        do: 'Start the dev loop:',
        run: 'npm run dev',
        see: 'The preview says there is no page yet: `packages/frontend/src/App.tsx` is empty.',
        why: '`npm run dev` runs the `dev` script, which is `rayfin dev`. It keeps running and redraws the page as we edit. In a real project it holds that terminal (open a second one for the next commands) and serves the page at a local address.',
      },
    ],
    summary: [
      'One command creates the project from the default template, an npm workspace of three packages; `npm install` fetches the packages for all of them.',
      'The `package.json` files list packages and scripts; `rayfin.yml` holds the app\'s settings. `npm run dev` starts the loop: edit, and see the page.',
    ],
    fabric: {
      text: 'Microsoft Learn\'s Rayfin CLI page starts from this template too: `blankapp`, the Universal App, shown as **Use default template**. Followed Learn\'s data app page instead? It uses `--template dataapp`, with a flat layout: its `src/` is our `packages/frontend/src/`, and its `rayfin/data/` is our `packages/data/src/`. Most of the template\'s other files are in the file list as locked placeholders: its sign-in, its welcome page, tests and agent files.',
      links: [learn.createCli, learn.projectStructure, learn.template],
    },
  },

  {
    id: 'connector',
    title: 'Add the connector',
    goal: 'connect the project to a semantic model with the Rayfin CLI',
    builds: ['create'],
    pbi: 'Like Get data > Power BI semantic models: the app gets a connection to one model. In a Fabric app that connection is a [[connector]].',
    idea: 'First two capability packs, then one command adds the connector. We give it a name, `contoso`, and the ids of the workspace and the model. The ids here are made up: in a real project they come from `npx rayfin connector search` or the model\'s address in the Fabric portal.',
    steps: [
      {
        do: 'Add the connectors pack, which wires connectors into the app:',
        run: PACK_CONNECTORS,
        point: 'terminal',
        see: '`> Scaffolding pack: connectors`, then `copied 2 file(s)`: an empty `packages/frontend/src/lib/connectors.ts`, and a new `rayfin-client.ts` that reads it.',
        why: 'A pack adds one capability: its files, its packages, and the services it turns on in `rayfin.yml`. For a semantic model, the template\'s capability-router skill says: connectors, then analytics.',
      },
      {
        do: 'Add the analytics pack, for semantic models:',
        run: PACK_ANALYTICS,
        point: 'terminal',
        see: '`rayfin.yml: connectors.enabled = true`, and a new hook, `packages/frontend/src/hooks/use-semantic-model-query.ts`: the code our pages will use to run DAX.',
        why: 'Both packs also add their packages to `packages/frontend/package.json` and install them.',
      },
      {
        do: 'Add a semantic model connector named `contoso`:',
        run: ADD_CONNECTOR,
        point: 'terminal',
        see: '`rayfin.yml` changed, a new `rayfin/connectors/contoso/schema.ts`, `🔌 Wired 1 connector(s) into packages/frontend/src/lib/connectors.ts`, and an install line.',
        why: '`--type` says what kind of Fabric item, `--workspace-id` and `--item-id` say which one, and `--name` is the name our code will use.',
      },
      {
        do: 'Open `rayfin/rayfin.yml` again.',
        file: YML,
        find: 'connectors:',
        see: 'A new `connectors:` section: the name, the type, the two ids, its one operation `executeQuery`, `auth` of type `delegated`, and a `version` to leave as generated.',
        why: '`delegated` means each query runs as the person using the app. Semantic model connectors only work that way.',
      },
      {
        do: 'Open `rayfin/connectors/contoso/schema.ts`.',
        file: 'rayfin/connectors/contoso/schema.ts',
        find: "export type ContosoSchema = FabricSemanticModel<'executeQuery'>;",
        see: 'A generated file. `ContosoSchema` describes what the connector can do: one operation, `executeQuery`.',
        why: 'TypeScript uses it to check our calls. (A different "type" from `--type`, which is the kind of Fabric item.) The first line says not to edit it: to change the connector, we run `connector add` again.',
      },
      {
        do: 'Install the versions it printed, into the frontend package: the analytics skill says to add `-w @rayfin-app/frontend`, never to install at the workspace root.',
        run: INSTALL_CONNECTOR,
        see: 'Both packages pinned in `packages/frontend/package.json`.',
        why: '`connector add` installs nothing itself: it prints the exact versions. The analytics pack had already added these two, so nothing new arrives.',
      },
      {
        do: 'Test the connector from the terminal, with one DAX query (copy it rather than type it):',
        run: INVOKE,
        see: '`✅ Invoked contoso.executeQuery`, then the result: `"status": "success"`, the column `[Revenue]` and one row: 150632573.6073.',
        why: '`connector invoke` sends a query without any app code: it checks that we can query the model (for real, we need Read and Build permission on it, and the CLI may ask for Power BI consent first). `--input` carries the DAX, wrapped in JSON; the backslashes keep its inner quotes. Real projects often put it in a file instead (`--file`), because quoting differs between terminals.',
      },
    ],
    summary: [
      '`npm run pack:add` adds a capability to the app: for a semantic model, the connectors pack and then the analytics pack.',
      '`npx rayfin connector add` writes the connector into `rayfin.yml`, generates its schema file and wires it into `connectors.ts`. It installs nothing: its install line goes into the frontend package.',
      '`npx rayfin connector invoke` tests a query before we write any app code.',
    ],
    fabric: {
      text: 'In a real project the ids are real, the command checks you can reach the model, and every user of the app needs access to it. A query from the terminal proves you can reach the model; the connector itself is proven once the deployed app runs the query.',
      links: [rayfin.adding, rayfin.semanticModels, learn.addConnector],
    },
  },

  {
    id: 'client',
    title: 'Read the wiring',
    goal: 'read the connector wiring the CLI wrote, and the client the pack installed',
    builds: ['connector'],
    pbi: 'The connector is like a connection in a report. The client is what lets the page use it: one object, made once, that every query goes through.',
    idea: 'We don\'t write the client: the connectors pack installed it, and `connector add` wrote the wiring. We read both, then send a first query from the page.',
    steps: [
      {
        do: 'Open `packages/frontend/src/lib/connectors.ts`, in the file list.',
        file: CONNECTORS,
        find: '// @generated by `rayfin connector add` — do not edit below this line.',
        point: 'files',
        see: 'A generated file. Everything under the marked line is written again by every `connector add` and `connector remove`.',
        why: 'The part above it came with the pack and is kept as it is. To take the file over yourself, you delete the marked line: the CLI then prints the wiring instead of rewriting it. The analytics skill says not to hand-write these maps.',
      },
      {
        do: 'Look at the marked `AppConnectorsSchema`.',
        file: CONNECTORS,
        find: 'export type AppConnectorsSchema = {',
        see: 'One entry per connector, under its name in `rayfin.yml`: `contoso`, with the type from its `schema.ts`.',
        why: '`type` declares a shape for TypeScript to check against; it never runs.',
      },
      {
        do: 'Look at the marked `connectorRuntimes`, and `connectorConfigs` just above it.',
        file: CONNECTORS,
        find: 'export const connectorRuntimes: ConnectorsRuntime = {',
        see: '`connectorConfigs` tells the client each connector\'s type (the ids stay in `rayfin.yml`). `connectorRuntimes` gives `contoso` `fabricSemanticModel()`, which turns the model\'s answer into a result the page can read.',
        why: 'The same name, `contoso`, in all three, written by the CLI in step with `rayfin.yml`.',
      },
      {
        do: 'Open `packages/frontend/src/lib/rayfin-client.ts` and look at the marked `connectorsService`.',
        file: CLIENT,
        find: 'connectorsService<AppConnectorsSchema>',
        see: 'The client the connectors pack installed, shown shortened and locked: `RayfinClient.create` makes the one client, `auth: browserSession(…)` handles the signed-in session, and `connectorsService` takes the maps from `connectors.ts`.',
        why: 'In this template, `getRayfinClient()` is async: it hands the client over once it is ready, so code waits for it (`await`, or `.then`).',
      },
      {
        do: 'A first query from the page: paste this into `packages/frontend/src/App.tsx`.',
        code: C.TEST_PAGE,
        edits: [{ file: APP, from: '', to: C.TEST_PAGE }],
        find: 'client.connectors.contoso',
        see: 'The page shows **Revenue: 150632573.6073**, and the Log shows the query.',
        why: 'Read only the marked call: it is the one line that talks to the model. `.then` runs the next part once the one before has finished. The rest is replaced in the next lesson. (In a real project, Rayfin\'s docs say to test connector queries against a deployed app: `rayfin dev` doesn\'t wire connectors.)',
      },
    ],
    summary: [
      '`connector add` writes the wiring: the connector\'s name in the schema type, in `connectorConfigs` and in `connectorRuntimes`.',
      '`fabricSemanticModel()` in the runtimes is what turns the model\'s answer into a result the page can read.',
      'The client comes from the template and the connectors pack: `await getRayfinClient()`, then `.connectors.contoso.executeQuery({ query })`.',
    ],
    fabric: {
      text: 'This is Rayfin 2.0\'s way to register a semantic model connector: `connectorsService` with `fabricSemanticModel()` in its runtime map. In the default template the CLI writes that map for you (`src/lib/connectors.ts`), and the analytics skill says to keep it generated.',
      links: [rayfin.clientSetup, rayfin.semanticModels],
    },
  },

  // ================================================================== 2 Build a page
  {
    id: 'grid',
    title: 'The grid',
    goal: 'place visuals on a 16:9 page with a 12 × 6 grid',
    builds: ['client'],
    pbi: 'A report page is a canvas you place visuals on. Here the canvas is a grid: 12 columns, 6 rows, and each visual says how many cells it takes.',
    idea: 'We replace the test with a real page layout. The numbers on it are typed in for now, like a mock-up; the model fills them in, in **Get data from the model**.',
    steps: [
      {
        do: 'In `packages/frontend/src/App.tsx`, replace everything with this page:',
        code: C.CANVAS,
        edits: [{ file: APP, from: C.TEST_PAGE, to: C.CANVAS }],
        see: 'A title, two cards, an empty chart box and an About box.',
        why: 'A page is written as tags: `<div>` and `<section>` are boxes, `<h1>` and `<h2>` titles, `<p>` a line of text. `className` holds style words; we only change the layout ones.',
      },
      {
        do: 'Tick **Outline cells**, above the preview.',
        see: 'A dashed box around each visual: the grid cells it takes.',
      },
      {
        do: 'Look at the marked line: the canvas.',
        file: APP,
        find: 'grid grid-cols-12 grid-rows-6',
        see: '`grid-cols-12 grid-rows-6` makes the 12 × 6 grid; `aspect-video` keeps it 16:9.',
        why: '`col-span-3` is 3 columns wide, `row-span-2` is 2 rows tall.',
      },
      {
        do: 'Make both cards wider: change their `col-span-3` to `col-span-4`.',
        edits: [{ from: 'col-span-3 row-span-2', to: 'col-span-4 row-span-2', all: true }],
        see: 'The chart drops lower.',
        why: '4 + 4 + 6 is more than 12, so it no longer fits next to the cards.',
      },
      {
        do: 'Make the chart `col-span-4`, so the row adds up to 12 again.',
        edits: [{ from: 'col-span-6 row-span-5', to: 'col-span-4 row-span-5' }],
        see: 'Three visuals side by side.',
      },
      {
        do: 'Give **About this page** the space under the cards: change its `col-span-6` to `col-span-8`.',
        edits: [{ from: 'col-span-6 row-span-3', to: 'col-span-8 row-span-3' }],
        see: '**About this page** spans under both cards.',
      },
      {
        do: 'Pin the chart to the right edge: put `col-start-9` in front of its `col-span-4`.',
        edits: [{ from: 'col-span-4 row-span-5', to: 'col-start-9 col-span-4 row-span-5' }],
        see: 'Nothing moves now. Later, when the cards change, the chart keeps its place.',
        why: 'Without it, visuals flow in the order they are written: left to right, then down. `col-start-9` starts the chart at column 9.',
      },
    ],
    summary: [
      'The page is a 12 × 6 grid. `col-span-…` and `row-span-…` say how many cells a visual takes.',
      'Visuals flow in the order they are written, left to right, then down. `col-start-…` pins one to a column.',
    ],
    fabric: {
      text: 'Words like `col-span-4` come from Tailwind CSS, a common styling kit. The template, as installed by the Rayfin CLI 2.0.0, has Tailwind CSS 4 in `packages/frontend/package.json`, and its `AGENTS.md` asks agents to use Tailwind, so we will read the same words there. (The link is Learn\'s map of the template\'s folders.)',
      links: [learn.projectStructure],
    },
  },

  {
    id: 'component',
    title: 'A component',
    goal: 'write a visual once and use it with different props',
    builds: ['grid'],
    pbi: 'A [[component]] is a visual: a function that gets some values (its [[props]]) and returns what to draw.',
    idea: 'Our two cards repeat the same markup. We write a card component once, in its own file, and use it for every card.',
    steps: [
      {
        do: 'Click **+ New file**, at the top of the file list, and type `components/kpi-card.tsx` after the `packages/frontend/src/` already there.',
        edits: [{ file: KPI, from: '', to: '' }],
        point: 'files',
        see: 'The template\'s `packages/frontend/src/components` folder, with an empty `kpi-card.tsx` added to it, open in the editor.',
        why: 'The template keeps its components in `packages/frontend/src/components`: it starts with one, the sign-in gate. One visual per file is our choice: each is easy to find.',
      },
      {
        do: 'Paste the card component into it:',
        code: C.KPI_CARD,
        edits: [{ file: KPI, from: '', to: C.KPI_CARD }],
        see: '`KpiCardProps` lists the props: a `title` that is text (`string`) and a `value` that is a `number`.',
        why: '`export` lets other files use it.',
      },
      {
        do: 'In `packages/frontend/src/App.tsx`, add this line at the very top, above the marked line:',
        code: COMP_IMPORT.trim(),
        edits: [{ file: APP, from: 'export default function App() {', to: `${COMP_IMPORT}\nexport default function App() {` }],
        see: 'Nothing changes yet.',
        why: '`./components/kpi-card` is our `packages/frontend/src/components/kpi-card.tsx`; imports leave out the `.tsx`.',
      },
      {
        do: 'Replace the marked Revenue card with the component:',
        code: '<div className="col-span-4 row-span-2">\n  <KpiCard title="Revenue (USD)" value={150632573.6} />\n</div>',
        edits: [
          {
            from: '      <div className="col-span-4 row-span-2 rounded-lg border border-gray-200 bg-white p-3">\n        <p className="text-sm text-gray-500">Revenue (USD)</p>\n        <p className="text-2xl font-bold">150.6M</p>\n      </div>\n',
            to: '      <div className="col-span-4 row-span-2">\n        <KpiCard title="Revenue (USD)" value={150632573.6} />\n      </div>\n',
          },
        ],
        see: 'The card looks the same: the component formats the number as 150.6M.',
      },
      {
        do: 'Same for the Orders card:',
        code: '<div className="col-span-4 row-span-2">\n  <KpiCard title="Orders" value={57744} />\n</div>',
        edits: [
          {
            from: '      <div className="col-span-4 row-span-2 rounded-lg border border-gray-200 bg-white p-3">\n        <p className="text-sm text-gray-500">Orders</p>\n        <p className="text-2xl font-bold">57.7K</p>\n      </div>\n',
            to: '      <div className="col-span-4 row-span-2">\n        <KpiCard title="Orders" value={57744} />\n      </div>\n',
          },
        ],
        see: 'Two cards, one component.',
      },
      {
        do: 'Make room for more cards: change both cards\' `col-span-4 row-span-2` to `col-span-2 row-span-2`.',
        edits: [{ from: 'col-span-4 row-span-2', to: 'col-span-2 row-span-2', all: true }],
        see: 'Narrower cards, and space beside them. The chart stays pinned on the right.',
      },
      {
        do: 'Add a third card, on a new line under the marked `</div>` of the Orders card:',
        code: '<div className="col-span-2 row-span-2">\n  <KpiCard title="Customers" value={7297} />\n</div>',
        edits: [
          {
            from: '        <KpiCard title="Orders" value={57744} />\n      </div>\n',
            to: '        <KpiCard title="Orders" value={57744} />\n      </div>\n      <div className="col-span-2 row-span-2">\n        <KpiCard title="Customers" value={7297} />\n      </div>\n',
          },
        ],
        see: 'Three cards: one component, used three times with different props.',
      },
    ],
    summary: [
      'A component is a visual: a function that takes props and returns what to draw.',
      'One component, used several times with different props, is most of what a page is.',
      'Components can live in their own file and be imported where they are used.',
    ],
    fabric: {
      text: 'The template\'s visuals pack (`npm run pack:add -- visuals`) adds ready-made visual components, `VegaVisual` and `DataGrid` from Microsoft\'s Fabric visuals packages, so in a real project much of the work is passing the right props to visuals someone else wrote. The **Visuals** page shows them. (The link is Learn\'s map of the template\'s folders: visuals live in `packages/frontend`.)',
      links: [learn.projectStructure],
    },
  },

  {
    id: 'types',
    title: 'Types',
    goal: 'read a red line, and say what TypeScript can and can\'t check',
    builds: ['component'],
    pbi: 'A [[type]] is the shape of some data: which fields, and what kind each one is. Like a table\'s columns and their data types.',
    idea: 'TypeScript reads the code as we type and underlines in red what breaks a type. In this lesson we make slips on purpose, then undo them.',
    steps: [
      {
        do: 'A slip on purpose: in the Customers card, change `value={7297}` to `value="7.3K"`.',
        edits: [{ from: 'value={7297}', to: 'value="7.3K"' }],
        errors: 1,
        see: 'A [[red line|red-line]] under `value`, and "1 type error" under the editor.',
        why: 'Hover over the red line to read why: a `string` (text) is not a `number`. `"…"` is fixed text; `{…}` is a value from the code.',
      },
      {
        do: 'Look at the preview.',
        see: 'The page still draws, with "7.3K" on the card.',
        why: 'The browser runs whatever it gets: the red line is a check for us, not a gate.',
      },
      {
        do: `${UNDO} Back to \`value={7297}\`.`,
        edits: [{ from: 'value="7.3K"', to: 'value={7297}' }],
        see: 'The red line goes.',
      },
      {
        do: 'Another slip on purpose: change `title="Customers"` to `titel="Customers"`.',
        edits: [{ from: 'title="Customers"', to: 'titel="Customers"' }],
        errors: '1+',
        see: 'A red line. Hover: `titel` doesn\'t exist, and `title` is missing.',
        why: '`KpiCardProps` lists exactly which props a card takes.',
      },
      {
        do: UNDO,
        edits: [{ from: 'titel="Customers"', to: 'title="Customers"' }],
        see: 'The red line goes.',
      },
      {
        do: 'Hover over the marked `KpiCard`.',
        file: APP,
        find: 'KpiCard title="Revenue (USD)"',
        see: 'Its props and their types, read from `packages/frontend/src/components/kpi-card.tsx`.',
        why: 'TypeScript checks across files. It can\'t see the model, though: a wrong column or a wrong number in a query still passes. That comes next.',
      },
    ],
    summary: [
      'TypeScript caught text where a number goes, and a misspelled prop, across files.',
      'A red line is a check for us, not a gate: the page still runs.',
      'It can\'t see the model, so a wrong column or a wrong number still passes.',
    ],
    fabric: {
      text: 'Fabric apps are built with Microsoft\'s [[Rayfin]] toolkit, made for TypeScript, so red lines like these are everyday work there. They don\'t stop a build either: in the template as installed by the Rayfin CLI 2.0.0, the frontend\'s build script runs `tsc -b --noCheck`, and its `AGENTS.md` says the build "does not prove type safety": run `npm run typecheck` too. Microsoft\'s Copilot walkthrough still asks for the build and type-check commands to be run, and their errors fixed.',
      links: [rayfin.docs, learn.copilotReview],
    },
  },

  // ================================================================== 3 Get data from the model
  {
    id: 'first-query',
    title: 'The first queries',
    goal: 'replace typed-in numbers with the model\'s',
    builds: ['types'],
    pbi: 'Binding fields to visuals: each visual asks the model a [[query]] and draws the [[result]].',
    idea: 'A data app sorts its files a bit like a report project: `components` holds the visuals, `queries/<page>` the DAX behind each visual, page by page, `hooks` the code that runs a query and waits for it, and `lib` the connection and other shared code. Pages stay in `src`. A query goes: its `.dax` file → its `.ts` file → a [[hook]] runs it → a conversion → the visual. We build that for the chart, then for the cards.',
    steps: [
      {
        do: 'Open the hook the analytics pack added, `packages/frontend/src/hooks/use-semantic-model-query.ts`, and look at the marked line.',
        file: HOOK,
        find: 'export function useSemanticModelQuery',
        point: 'files',
        see: 'It takes a `connection`, the connector\'s name in `rayfin.yml`, and a DAX `query`. It gives back `data` (the model\'s answer), `isLoading` and `error`.',
        why: 'Like a visual loading: `isLoading` while it waits, then the answer in `data`. The file is the pack\'s, shown shortened and locked; the analytics skill says pages run their DAX through it.',
      },
      newFile(COUNTRY_DAX, 'Now the first query. It gets a file of its own: ', {
        see: 'New folders, `packages/frontend/src/queries/overview`, with an empty `revenue-by-store-country.dax` in them, open in the editor.',
        why: 'The template\'s analytics skill asks the same of coding agents: each DAX query in a `.dax` file of its own, under `packages/frontend/src/queries`, named after the visual it feeds, grouped by page or topic. More pages are coming, so we start with `overview`.',
      }),
      paste(COUNTRY_DAX, C.COUNTRY_DAX, 'Paste the query into it:', {
        why: 'Only DAX, nothing else: on the same model, it runs as it is in DAX query view in Power BI Desktop. It names the model\'s own measure, `[Revenue]`, as a report visual does.',
      }),
      newFile(COUNTRY_TS, 'Next to it, a small file that hands the query to the page: '),
      paste(COUNTRY_TS, C.COUNTRY_TS, 'Paste this into it:', {
        why: '`?raw` means "the file\'s text, as a string": `revenueByStoreCountryDax` holds the DAX exactly as the file has it. The function returns what the hook takes: the `connection` that runs it, `contoso`, and the `query`. It is named after the file, as in the analytics skill. It only hands out the text for now, and the file still earns its place: the template has one per visual, and it is where a slicer\'s filter goes (in **State as a slicer**). The template\'s version returns an object, `{ connection, query, columnMetadata, vegaLiteSpec }`: the query and what its chart needs. Ours returns only the query text, with no `.json` chart spec and no `columnMetadata`, because our visuals are our own components (`BarList`, `KpiCard`), not the template\'s `VegaVisual` and `DataGrid`.',
      }),
      newFile(OVERVIEW_INDEX, 'The template lists each query folder\'s files in an `index.ts`, so that pages import every query from one place: '),
      paste(OVERVIEW_INDEX, C.OVERVIEW_INDEX_V1, 'Paste this line into it:', {
        why: '`export *` passes on everything the file exports, here `revenueByStoreCountry`. Each new query file gets a line like it.',
      }),
      writeFile(QUERIES_INDEX, C.QUERIES_INDEX_V1, '**Do it for me** writes one more `index.ts`, `packages/frontend/src/queries/index.ts`, which passes on the whole `overview` folder:', {
        why: 'So a page imports any query from `./queries`, whichever folder it is in.',
      }),
      newFile(CONV, 'The chart needs bars, not rows. The code that turns one into the other is shared by the pages, so it goes in `packages/frontend/src/lib`: '),
      paste(CONV, C.CONVERSIONS_V1, 'Paste the first conversion into it:', {
        why: '`.map` makes one bar for each row. `toBars` reads `row[0]` as the label and `row[1]` as the value: positions, counted from 0. Keep that in mind.',
      }),
      {
        do: 'The page needs the hook, the conversion and the query. In `packages/frontend/src/App.tsx`, add these imports under the last import, the marked `KpiCard` one:',
        code: FIRST_IMPORTS.trimEnd(),
        edits: [{ file: APP, from: COMP_IMPORT, to: COMP_IMPORT + FIRST_IMPORTS }],
        see: 'Nothing on the page yet.',
        why: '`./queries` names a folder: an import that names a folder reads that folder\'s `index.ts`. TypeScript never reads the DAX itself: to it, the query is only text.',
      },
      {
        do: 'Run the query: add these lines on new lines under the marked `export default function App() {`.',
        code: COUNTRIES_LINES.replace(/^ {2}/gm, ''),
        edits: [{ from: 'export default function App() {\n', to: `export default function App() {\n${COUNTRIES_LINES}\n` }],
        see: 'In the Log, the query and what came back: a `status`, `columns` (their names) and `rows` (lists of values).',
        why: '`a ? b : c` works like `IF(a, b, c)`: no answer yet, no bars.',
      },
      newFile(BAR, 'Now the chart. It is a visual, so it goes in `packages/frontend/src/components`: '),
      paste(BAR, C.BAR_LIST_FILE, 'Paste the bar chart into it:', {
        why: '`import type` brings in only a type, here the shape of one bar.',
      }),
      {
        do: 'Load the chart into the page: in `packages/frontend/src/App.tsx`, add this import on a new line under the last import (marked).',
        code: IMP_BAR.trim(),
        edits: [{ file: APP, from: IMP_Q_1, to: IMP_Q_1 + IMP_BAR }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Draw the bars: on a new line under the marked chart title, add:',
        code: '<BarList rows={countries} />',
        edits: [
          {
            from: '        <h2 className="mb-2 font-semibold">Revenue by store country</h2>\n',
            to: '        <h2 className="mb-2 font-semibold">Revenue by store country</h2>\n        <BarList rows={countries} />\n',
          },
        ],
        see: 'Real bars: United States 60,466,772, then Online, Canada…',
        visual: 'bar',
      },
      newFile(TOTALS_DAX, 'Now the cards. Their query gets a file too: '),
      paste(TOTALS_DAX, C.TOTALS_DAX, 'Paste the totals query into it:', { why: 'One row with three measures: one for each card.' }),
      writeFile(TOTALS_TS, C.TOTALS_TS, '**Do it for me** writes its small `.ts` file, `packages/frontend/src/queries/overview/sales-totals.ts`, like the countries one, and lists it in the folder\'s `index.ts`:', { see: '`packages/frontend/src/queries/overview/index.ts` gains `export * from \'./sales-totals\';`.' }, [
        { file: OVERVIEW_INDEX, from: reExport('revenue-by-store-country'), to: reExport('revenue-by-store-country') + reExport('sales-totals') },
      ]),
      {
        do: 'At the end of `packages/frontend/src/lib/conversions.ts`, add the cards\' conversion:',
        code: C.TOTALS_CONV.trimStart(),
        edits: [{ file: CONV, from: C.TO_BARS_BY_POSITION, to: C.TO_BARS_BY_POSITION + C.TOTALS_CONV }],
        see: 'Nothing on the page yet.',
        why: '`toTotals` finds each column by its name, such as `[Orders]`.',
      },
      {
        do: 'Load both into the page. In `packages/frontend/src/App.tsx`, add `toTotals` to the marked import: `import { toBars, toTotals } from \'./lib/conversions\';`',
        edits: [{ from: IMP_CONV_1, to: IMP_CONV_2 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Then add `salesTotals` to the marked query import: `import { revenueByStoreCountry, salesTotals } from \'./queries\';`',
        edits: [{ from: IMP_Q_1, to: IMP_Q_2 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Run the totals query: add these lines under the marked `const countries = …` line.',
        code: TOTALS_LINES.replace(/^ {2}/gm, ''),
        edits: [{ from: '  const countries = countriesQuery.data ? toBars(countriesQuery.data) : [];\n', to: `  const countries = countriesQuery.data ? toBars(countriesQuery.data) : [];\n${TOTALS_LINES}` }],
        see: 'In the Log: a second query.',
      },
      {
        do: 'Replace the typed-in numbers: `150632573.6` with `totals.revenue`, `57744` with `totals.orders`, `7297` with `totals.customers`.',
        edits: [
          { from: 'value={150632573.6}', to: 'value={totals.revenue}' },
          { from: 'value={57744}', to: 'value={totals.orders}' },
          { from: 'value={7297}', to: 'value={totals.customers}' },
        ],
        see: 'The same 150.6M, 57.7K and 7.3K, now from the model.',
        why: 'Customers is a distinct count, so it comes from its own query: adding up customers per country would count some twice.',
      },
    ],
    summary: [
      'A query is DAX text, kept in a `.dax` file, with a small `.ts` file of the same name that hands it to the page; the pack\'s hook runs it and keeps the answer while the page draws.',
      'A conversion (`toBars`, `toTotals`) turns the result\'s rows into what a visual draws.',
      'The queries name the model\'s measures, such as `[Revenue]` and `[# Orders]`, as a report visual does.',
    ],
    fabric: {
      text: 'The real connector returns this same result shape: `columns`, each with a name and a data type, and `rows` as lists of values in column order. The `.dax` files follow the template\'s analytics skill, written for coding agents: DAX in `.dax` files under `packages/frontend/src/queries`, imported as text with `?raw` by a small `.ts` factory (ours returns `{ connection, query }`; the skill\'s also return a chart spec and column metadata, for the visuals pack), and the pack\'s hook in `packages/frontend/src/hooks`, as here.',
      links: [rayfin.semanticModels],
    },
  },

  {
    id: 'conversion',
    title: 'The conversion',
    goal: 'read query results by column name, not by position',
    builds: ['first-query'],
    pbi: 'The DAX decides which columns come back, and in what order. Reading them by position is like reading a table by column number instead of column name.',
    idea: '`toBars` reads `row[1]` as the value. That holds only while the DAX keeps its columns in that order. Let\'s change the DAX, the way an agent might.',
    steps: [
      {
        do: 'Change the DAX the way an agent might (we take it out again at the end): in `packages/frontend/src/queries/overview/revenue-by-store-country.dax`, add an Orders column above the marked `"Revenue", [Revenue]` line.',
        code: '"Orders", [# Orders],',
        find: '"Revenue", [Revenue]',
        edits: [{ file: COUNTRY_DAX, from: COUNTRY_ROW, to: COUNTRY_ROW_ORDERS }],
        see: 'The bars now show order counts: United States 22,824. No red line, no error.',
      },
      {
        do: 'In the **Log** tab, click the newest query (the top one).',
        point: 'log',
        see: 'Its columns: `store[CountryName]`, `[Orders]`, `[Revenue]`.',
        why: 'So `row[1]`, the second column, is now Orders.',
      },
      {
        do: 'Look columns up by name instead. In `packages/frontend/src/lib/conversions.ts`, replace the marked `toBars` with this:',
        code: C.TO_BARS_BY_NAME,
        edits: [{ file: CONV, from: C.TO_BARS_BY_POSITION, to: C.TO_BARS_BY_NAME }],
        errors: 1,
        see: 'A red line in `packages/frontend/src/App.tsx`: `toBars` now needs two more inputs (arguments). Until we give them, the bars break.',
        why: '`findIndex((c) => c.name === …)` finds the column with that name (`===` means "equals"). The red line shows where to follow up.',
      },
      {
        do: "In `packages/frontend/src/App.tsx`, give `toBars` the two column names: `toBars(countriesQuery.data, 'store[CountryName]', '[Revenue]')`.",
        edits: [{ from: 'toBars(countriesQuery.data)', to: "toBars(countriesQuery.data, 'store[CountryName]', '[Revenue]')" }],
        see: 'United States 60,466,772 again, even with the Orders column in the query.',
        why: 'In the result, the model names the column `store[CountryName]`, without the quotes the DAX uses. Copy names from the Log.',
      },
      {
        do: 'We don\'t need orders by country: in `packages/frontend/src/queries/overview/revenue-by-store-country.dax`, remove the `"Orders", [# Orders],` line again.',
        edits: [{ file: COUNTRY_DAX, from: COUNTRY_ROW_ORDERS, to: COUNTRY_ROW }],
        see: 'Nothing changes on the page. That is the point.',
      },
    ],
    summary: [
      'The DAX decides the columns and their order: `row[1]` is whatever came second.',
      'Look columns up by name, so a change in the DAX can\'t shift them.',
      'TypeScript won\'t catch a wrong position, so check conversions in agent code by eye.',
    ],
    fabric: {
      text: 'Rayfin\'s own semantic model example builds each row as an object keyed by the column names, which is the same idea.',
      links: [rayfin.semanticModels],
    },
  },

  {
    id: 'measure-or-query',
    title: 'Measure or query',
    goal: 'choose between naming a model measure and writing the formula into the query',
    builds: ['conversion'],
    pbi: 'In a report, a visual asks for a [[measure]] and the model works it out. An app\'s query can do the same, by naming the measure. It can also carry its own formula instead.',
    idea: 'We add a Margin % card. First with the formula written into the query, with [[DEFINE MEASURE|define-measure]], as an agent often does. Then with the model\'s own measure.',
    steps: [
      newFile(MARGIN_DAX, 'The Margin % card gets a query file too: '),
      paste(MARGIN_DAX, C.MARGIN_IN_QUERY_DAX, 'Paste this query into it. It has the formula written in, as an agent often writes it:', {
        why: '`DEFINE MEASURE` adds a measure for this one query. The model never stores it, and no report can see it.',
      }),
      writeFile(MARGIN_TS, C.MARGIN_TS, '**Do it for me** writes its small `.ts` file, `packages/frontend/src/queries/overview/margin-pct.ts`, like the others, and lists it in the folder\'s `index.ts`:', { see: '`packages/frontend/src/queries/overview/index.ts` gains `export * from \'./margin-pct\';`.' }, [
        { file: OVERVIEW_INDEX, from: reExport('sales-totals'), to: reExport('sales-totals') + reExport('margin-pct') },
      ]),
      {
        do: 'At the end of `packages/frontend/src/lib/conversions.ts`, add the card\'s conversion:',
        code: C.PERCENT_CONV.trimStart(),
        edits: [{ file: CONV, from: "Number(row[at('[Customers]')]) };\n}", to: `Number(row[at('[Customers]')]) };\n}${C.PERCENT_CONV}` }],
        see: 'Nothing on the page yet.',
      },
      {
        do: 'Cards need to show a percent too. In `packages/frontend/src/components/kpi-card.tsx`, add this line under the marked `value: number;`:',
        code: "format?: 'compact' | 'percent';",
        edits: [{ file: KPI, from: '  value: number;\n', to: "  value: number;\n  format?: 'compact' | 'percent';\n" }],
        see: 'Nothing changes yet.',
        why: '`?` means a card can leave it out. `\'compact\' | \'percent\'` means one of those two words, nothing else.',
      },
      {
        do: 'Take `format` in with the other props: change the marked `{ title, value }` to `{ title, value, format }`.',
        edits: [{ file: KPI, from: 'export function KpiCard({ title, value }: KpiCardProps)', to: 'export function KpiCard({ title, value, format }: KpiCardProps)' }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Draw a percent when it says so: replace the marked value line with this.',
        code: KPI_VALUE_FORMAT.trim(),
        edits: [{ file: KPI, from: KPI_VALUE_LINE, to: KPI_VALUE_FORMAT }],
        see: 'The other cards are unchanged: they leave `format` out.',
      },
      {
        do: 'Load them into the page. In `packages/frontend/src/App.tsx`, add `toPercent` to the marked import: `import { toBars, toPercent, toTotals } from \'./lib/conversions\';`',
        edits: [{ from: IMP_CONV_2, to: IMP_CONV_3 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Then add `marginPct` to the marked query import: `import { marginPct, revenueByStoreCountry, salesTotals } from \'./queries\';`',
        edits: [{ from: IMP_Q_2, to: IMP_Q_3 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Run the margin query: add this line under the marked `const totals = …` line.',
        code: MARGIN_LINE.trim(),
        edits: [
          {
            from: '  const totals = totalsQuery.data ? toTotals(totalsQuery.data) : { revenue: 0, orders: 0, customers: 0 };\n',
            to: `  const totals = totalsQuery.data ? toTotals(totalsQuery.data) : { revenue: 0, orders: 0, customers: 0 };\n${MARGIN_LINE}`,
          },
        ],
        see: 'A third query in the Log.',
      },
      {
        do: 'Add the card, under the marked `</div>` of the Customers card:',
        code: '<div className="col-span-2 row-span-2">\n  <KpiCard title="Margin %" value={marginQuery.data ? toPercent(marginQuery.data) : 0} format="percent" />\n</div>',
        edits: [
          {
            from: '        <KpiCard title="Customers" value={totals.customers} />\n      </div>\n',
            to: '        <KpiCard title="Customers" value={totals.customers} />\n      </div>\n      <div className="col-span-2 row-span-2">\n        <KpiCard title="Margin %" value={marginQuery.data ? toPercent(marginQuery.data) : 0} format="percent" />\n      </div>\n',
          },
        ],
        see: 'Margin %: 55.9%. The four cards fill the row.',
      },
      {
        do: 'A slip on purpose, the kind that is easy to make: in `packages/frontend/src/queries/overview/margin-pct.dax`, in the first `SUMX`, change `sales[NetPrice]` to `sales[UnitPrice]`.',
        edits: [{ file: MARGIN_DAX, from: 'sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] )', to: 'sales[Quantity] * ( sales[UnitPrice] - sales[UnitCost] )' }],
        see: 'Margin % shows 62.1%. No red line, no error.',
        why: 'Only the top of the fraction moved to list price; the bottom is still net revenue. A believable number that means nothing.',
      },
      {
        do: UNDO,
        edits: [{ file: MARGIN_DAX, from: 'sales[Quantity] * ( sales[UnitPrice] - sales[UnitCost] )', to: 'sales[Quantity] * ( sales[NetPrice] - sales[UnitCost] )' }],
        see: 'Back to 55.9%.',
      },
      {
        do: 'The model already has this measure. Replace the whole of `packages/frontend/src/queries/overview/margin-pct.dax` with a query that names it (select all with Ctrl+A, or Cmd+A on a Mac, then paste):',
        code: C.MARGIN_FROM_MODEL_DAX,
        edits: [{ file: MARGIN_DAX, from: C.MARGIN_IN_QUERY_DAX, to: C.MARGIN_FROM_MODEL_DAX }],
        see: 'Still 55.9%. The formula now lives in one place: the model.',
      },
      {
        do: 'One more slip on purpose: change `[Margin %]` to `[Margin Pct]`.',
        edits: [{ file: MARGIN_DAX, from: 'ROW ( "Margin %", [Margin %] )', to: 'ROW ( "Margin %", [Margin Pct] )' }],
        queryFails: true,
        see: 'The card shows 0%. No red line, and no message on the page.',
        why: 'TypeScript never reads the DAX: to it, the file is only text. The model returned an error (see the Log), and `toPercent` turned it into 0. That is the next lesson.',
      },
      {
        do: UNDO,
        edits: [{ file: MARGIN_DAX, from: 'ROW ( "Margin %", [Margin Pct] )', to: 'ROW ( "Margin %", [Margin %] )' }],
        see: 'Back to 55.9%.',
      },
    ],
    summary: [
      'Prefer naming the model\'s measures: every report and app then shares one formula, looked after by whoever owns the model.',
      '`DEFINE MEASURE` is for something the model doesn\'t have yet. It is often a sign the model needs that measure: ask its owner. One with the same name as a model measure silently replaces it for that query, so in agent code a `DEFINE` block is worth a second look.',
      'A wrong measure name shows only when the query runs, as the model\'s error.',
    ],
    fabric: {
      text: 'When a query fails on Fabric, Microsoft\'s checklist for data apps includes verifying that the DAX references existing tables, columns and measures.',
      links: [learn.templateVerify],
    },
  },

  {
    id: 'failure',
    title: 'Failure',
    goal: 'make the page show failed queries and empty results, instead of zeros',
    builds: ['measure-or-query'],
    pbi: 'When a visual\'s query fails, Power BI shows an error on the visual, not a blank chart. A page we write has to do that itself.',
    idea: 'Our conversions turn a failed result into zeros and empty lists, and the page never checks. Let\'s make a slip on purpose, and see.',
    steps: [
      {
        do: "A slip on purpose: in `packages/frontend/src/queries/overview/revenue-by-store-country.dax`, mistype a column: change `'store'[CountryName]` to `'store'[Country]`.",
        edits: [{ file: COUNTRY_DAX, from: COUNTRY_ROW, to: "    'store'[Country],\n    \"Revenue\", [Revenue]" }],
        queryFails: true,
        see: 'The bars are gone. No message.',
      },
      {
        do: 'In the **Log** tab, click the failed query (in red).',
        point: 'log',
        see: 'The model\'s error: it can\'t find the column `Country`.',
        why: 'The page never showed it: on a failed result, `toBars` returns an empty list.',
      },
      newFile(ERR, 'The page needs an error panel: a visual for a failed query, so it gets a file in `packages/frontend/src/components` too: ', { queryFails: true }),
      paste(ERR, C.ERROR_PANEL_FILE, 'Paste the error panel into it:', { queryFails: true, see: 'Nothing changes yet.' }),
      {
        do: 'Load it into the page: in `packages/frontend/src/App.tsx`, add this import on a new line under the last import (marked).',
        code: IMP_ERR.trim(),
        edits: [{ from: IMP_BAR, to: IMP_BAR + IMP_ERR }],
        queryFails: true,
        see: 'Nothing changes yet.',
      },
      {
        do: 'Wait for the answers before drawing: add this line under the marked `const marginQuery = …` line.',
        code: LOADING.trim(),
        edits: [{ from: MARGIN_LINE, to: `${MARGIN_LINE}\n${LOADING}` }],
        queryFails: true,
        see: 'A short "Loading…" when the page starts.',
        why: '`||` means "or": while any query is still loading, the page says so instead of showing zeros.',
      },
      {
        do: 'Then check each result\'s [[status]]: add this line under the marked Loading line.',
        code: MODEL_ERRORS.trim(),
        edits: [{ from: LOADING, to: LOADING + MODEL_ERRORS }],
        queryFails: true,
        see: '**This page could not load its data**, with the model\'s message about `Country`.',
        why: '`q.data?.status`: `?.` reads `status` only when there is data. `for (const q of [a, b, c])` runs the check once for each query; the first one the model rejected shows its message.',
      },
      {
        do: "Fix the slip: in `packages/frontend/src/queries/overview/revenue-by-store-country.dax`, change it back to `'store'[CountryName]`.",
        edits: [{ file: COUNTRY_DAX, from: "    'store'[Country],\n    \"Revenue\", [Revenue]", to: COUNTRY_ROW }],
        see: 'The page is back.',
      },
      {
        do: 'Add an empty state too, under the marked line that checks the status:',
        code: 'if (countries.length === 0) return <p className="p-4">No data for this page.</p>;',
        edits: [{ from: MODEL_ERRORS, to: `${MODEL_ERRORS}  if (countries.length === 0) return <p className="p-4">No data for this page.</p>;\n` }],
        see: 'Nothing changes: it is for a query that works but returns no rows.',
      },
      {
        do: 'In the **Queries** tab, pick **Network down**.',
        point: 'queries',
        see: 'Nothing changes yet: the page asks again only when it runs.',
      },
      {
        do: 'Press **Run**, above the page.',
        point: 'run',
        see: '**No data for this page**: the empty state, not an error. In the Log, the queries are marked "threw".',
        why: 'This time there is no answer at all: the call "throws". In a real browser app, that is what a request that can\'t reach the app\'s backend does. The hook puts it in `error`, not in `data`, and our page doesn\'t check `error` yet.',
      },
      {
        do: 'Check the other channel too: add this line under the marked status line.',
        code: THROWN_ERRORS.trim(),
        edits: [{ from: MODEL_ERRORS, to: MODEL_ERRORS + THROWN_ERRORS }],
        see: 'The error panel shows the network error.',
        why: 'The pack\'s hook keeps two channels apart, as its own comments say: `data.status` is `error` when the model rejects the query, and `error` is set when the call itself fails (offline, signed out, connector not deployed). A page that checks only one shows nothing for half its failures.',
      },
      {
        do: 'In the **Queries** tab, pick **Answer normally** again.',
        point: 'queries',
        see: 'Nothing changes until the page runs again.',
      },
      {
        do: 'Press **Run**.',
        point: 'run',
        see: 'The data is back.',
      },
    ],
    summary: [
      'Three ways to end up with no data: the query failed, the call failed, or no rows came back. Each one should say so on the page.',
      'Check the answer\'s `status` before reading it, and show the error\'s message.',
      'A query the model rejects comes back in `data`, with `status: \'error\'`; a call that can\'t get through ends up in `error`. The pack\'s hook keeps them apart: check both.',
    ],
    fabric: {
      text: 'Microsoft Learn\'s example checks the returned status first and logs the error\'s category and message. Rayfin\'s own table example shows them on the page, as we do here. In Rayfin 2.0, a browser app\'s failed request throws; from the terminal, `connector invoke` reports the same failure as an error result with category `network`.',
      links: [learn.query, rayfin.semanticModels],
    },
  },

  // ================================================================== 4 Make it interactive
  {
    id: 'slicer',
    title: 'State as a slicer',
    goal: 'add a slicer: a value the page remembers, which drives its queries',
    builds: ['failure'],
    pbi: '[[State]] is a value the page remembers; when it changes, the page redraws. A slicer selection is state.',
    idea: 'We add a year slicer. The page keeps the selected year, and the queries take it as a filter.',
    steps: [
      newFile(SLICER, 'A year slicer is a visual too, with a file of its own: '),
      {
        do: 'Paste the slicer into it:',
        code: C.YEAR_SLICER_FILE,
        edits: [{ file: SLICER, from: '', to: C.YEAR_SLICER_FILE }],
        see: 'Nothing on the page yet.',
        why: 'The slicer shows a year and reports clicks. It doesn\'t keep the year itself: the page will.',
        visual: 'slicer',
      },
      {
        do: 'In `packages/frontend/src/App.tsx`, add this line at the very top, above the marked line:',
        code: "import { useState } from 'react';",
        edits: [{ from: COMP_IMPORT, to: `import { useState } from 'react';\n${COMP_IMPORT}` }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Load the slicer: add this import on a new line under the last import (marked).',
        code: IMP_SLICER.trim(),
        edits: [{ from: IMP_ERR, to: IMP_ERR + IMP_SLICER }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Keep a year: add this line under the marked `export default function App() {`.',
        code: YEAR_STATE.trim(),
        edits: [{ from: 'export default function App() {\n', to: `export default function App() {\n${YEAR_STATE}` }],
        see: 'Nothing changes yet.',
        why: '`useState` gives two things: `year`, the value, and `setYear`, which changes it and redraws the page. `number | undefined` means a year, or nothing (all years). `useState` is a [[hook]]: one of React\'s `use…` functions.',
      },
      {
        do: 'Put the slicer in the header: replace the two marked lines with these three.',
        code: '<header className="col-span-12 row-span-1 flex items-center justify-between">\n  <h1 className="text-2xl font-bold">Sales overview</h1>\n  <YearSlicer value={year} onChange={setYear} />',
        edits: [
          {
            from: '      <header className="col-span-12 row-span-1">\n        <h1 className="text-2xl font-bold">Sales overview</h1>\n',
            to: '      <header className="col-span-12 row-span-1 flex items-center justify-between">\n        <h1 className="text-2xl font-bold">Sales overview</h1>\n        <YearSlicer value={year} onChange={setYear} />\n',
          },
        ],
        see: 'The slicer, on the right of the title. Clicks move the highlight, but nothing uses the year yet.',
      },
      newFile(FILTERS, 'The filters are shared code too, so they get a file in `packages/frontend/src/lib`: '),
      {
        do: 'Paste the two filter functions into it:',
        code: C.FILTERS_FILE,
        edits: [{ file: FILTERS, from: '', to: C.FILTERS_FILE }],
        see: 'Nothing changes yet.',
        why: 'For a picked year, `filters` makes one DAX filter, `TREATAS ( { 2024 }, \'date\'[Year] )`: the kind of filter Power BI writes for a slicer selection (copy a visual\'s query from Performance analyzer to see one). `withFilters` puts filters into a query file\'s text, where the file has a `/* filters */` marker. `export` lets the query files use both.',
      },
      {
        do: 'Make the cards\' query take a year. First, in `packages/frontend/src/queries/overview/sales-totals.ts`, add this import on a new line above the marked one:',
        code: C.IMPORT_FILTERS,
        edits: [{ file: TOTALS_TS, from: TOTALS_DAX_IMPORT, to: `${C.IMPORT_FILTERS}\n${TOTALS_DAX_IMPORT}` }],
        see: 'Nothing changes yet.',
        why: '`../../` climbs two folders, from `packages/frontend/src/queries/overview` up to `src`. The template would write `@/lib/filters`: its `tsconfig.json` and `vite.config.ts` set `@` to `packages/frontend/src/`. The playground\'s editor follows relative paths only.',
      },
      {
        do: 'Then replace the marked `salesTotals` with this version, which takes a year:',
        code: C.TOTALS_FN_YEAR,
        edits: [{ file: TOTALS_TS, from: C.TOTALS_FN_V1, to: C.TOTALS_FN_YEAR }],
        see: 'Nothing changes: the page doesn\'t pass a year yet, so the file\'s query goes as it is.',
        why: 'No year: the file\'s query as it is. A year: the file\'s `ROW`, without its `EVALUATE`, inside `CALCULATETABLE` with the filter (`ROW` has no place for a filter of its own). The template\'s instructions allow small changes like this in code, as long as the query itself comes from the `.dax` file.',
      },
      {
        do: 'In `packages/frontend/src/App.tsx`, pass the year: `salesTotals(year)`.',
        edits: [{ from: 'useSemanticModelQuery(salesTotals())', to: 'useSemanticModelQuery(salesTotals(year))' }],
        see: 'Nothing changes yet: the slicer is on **All**.',
      },
      {
        do: 'Same for the countries query. In `packages/frontend/src/queries/overview/revenue-by-store-country.ts`, add this import on a new line above the marked one:',
        code: C.IMPORT_FILTERS_BOTH,
        edits: [{ file: COUNTRY_TS, from: COUNTRY_DAX_IMPORT, to: `${C.IMPORT_FILTERS_BOTH}\n${COUNTRY_DAX_IMPORT}` }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Then replace the marked `revenueByStoreCountry` with this version:',
        code: C.COUNTRY_FN_YEAR,
        edits: [{ file: COUNTRY_TS, from: C.COUNTRY_FN_V1, to: C.COUNTRY_FN_YEAR }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'In `packages/frontend/src/App.tsx`, pass the year: `revenueByStoreCountry(year)`.',
        edits: [{ from: 'useSemanticModelQuery(revenueByStoreCountry())', to: 'useSemanticModelQuery(revenueByStoreCountry(year))' }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Mark where the year filter goes in the countries query: in `packages/frontend/src/queries/overview/revenue-by-store-country.dax`, type `/* filters */` **and a space** in front of the marked `"Revenue", [Revenue]`.',
        code: '/* filters */ "Revenue", [Revenue]',
        file: COUNTRY_DAX,
        find: '"Revenue", [Revenue]',
        edits: [{ file: COUNTRY_DAX, from: COUNTRY_ROW, to: COUNTRY_ROW_MARKED }],
        see: 'Nothing changes: with **All** picked there is no filter, and `withFilters` takes the marker out.',
        why: '`/* … */` is a comment in DAX, so the file still runs as it is in DAX query view. For a picked year, `withFilters` puts the filter there, as one more input to `SUMMARIZECOLUMNS`.',
      },
      {
        do: 'Click **2024** in the preview.',
        see: 'Two new queries in the Log, then 2024 numbers on the cards and the chart.',
        why: 'Margin % doesn\'t change: its query doesn\'t take the year.',
      },
      {
        do: 'Click through the four years and watch **Customers**.',
        see: '3.9K, 5.4K, 6K, 5.9K, yet **All** is 7.3K, not 21.2K.',
        why: 'A distinct count. That is why the cards ask the model for their totals.',
      },
      {
        do: 'Look at the list at the end of the hook\'s `useEffect`, in `packages/frontend/src/hooks/use-semantic-model-query.ts`.',
        file: HOOK,
        find: '}, [connection, query]);',
        see: '`[connection, query]`, marked in pink.',
        why: 'The hook runs its query again whenever something in this [[dependency list|dependency-list]] changes. A new year means new query text, so it runs again.',
      },
    ],
    summary: [
      'State is a value the page remembers. `useState` gives the value and a function that changes it and redraws the page.',
      'One value, `year`, drives everything: the slicer shows it, the queries use it, and the list at the end of the hook\'s `useEffect` makes them run again.',
      'Distinct counts don\'t add up, so totals come from their own query.',
    ],
    fabric: {
      text: 'On Fabric, a new selection sends a live query to the semantic model (unless the app reuses an earlier answer), as the person signed in. They need Build permission on the model, which is more than a report viewer needs.',
      links: [learn.addConnector],
    },
  },

  {
    id: 'redraw-trap',
    title: 'The redraw trap',
    goal: 'spot and fix a page that keeps querying the model',
    builds: ['slicer'],
    pbi: 'In Power BI, a visual queries again when its filters change. In React, an effect runs again when anything in its [[dependency list|dependency-list]] changes, and a function made inside a page counts as changed on every draw.',
    idea: 'The pack\'s hook depends only on the connection and the query text. Agents often write their own loading code inside the page instead. Let\'s do that on purpose, and watch.',
    steps: [
      {
        do: 'The slip on purpose, in three parts. First, in `packages/frontend/src/App.tsx`, change the marked React import to: `import { useEffect, useState } from \'react\';`',
        edits: [{ from: "import { useState } from 'react';\n", to: "import { useEffect, useState } from 'react';\n" }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Then the client\'s import, on a new line under the last import (marked):',
        code: TRAP_IMPORT.trim(),
        edits: [{ from: IMP_SLICER, to: IMP_SLICER + TRAP_IMPORT }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Now an agent\'s own loader for the totals, inside `App`: add these lines under the marked `year` line.',
        code: TRAP_LINES.replace(/^ {2}/gm, ''),
        edits: [{ from: YEAR_STATE, to: YEAR_STATE + TRAP_LINES }],
        see: 'No red line. The page looks fine, for a moment.',
      },
      {
        do: 'Watch the count next to **Running**, above the preview.',
        point: 'status',
        see: 'It keeps climbing, and the Log fills with the same query. After more than 40 in 10 seconds, the playground stops the page.',
      },
      {
        do: 'Look at the marked line.',
        file: APP,
        find: 'const loadTotals = () =>',
        see: 'The agent\'s loader, made inside `App`.',
        why: 'A function made inside `App` is a new one on every draw, and it is in the effect\'s list. So: answer, `setAgentTotals`, redraw, new `loadTotals`, the effect runs again, query again, and round it goes.',
      },
      {
        do: 'Fix it: take the three changes out again (**Do it for me** does it). The page already loads its totals through the pack\'s hook.',
        edits: [
          { from: TRAP_LINES, to: '' },
          { from: TRAP_IMPORT, to: '' },
          { from: "import { useEffect, useState } from 'react';\n", to: "import { useState } from 'react';\n" },
        ],
        done: { file: APP, absent: 'const loadTotals' },
        point: 'status',
        see: 'Press **Run again**: a few queries, and the count stays put.',
        why: 'The hook\'s list is `[connection, query]`: plain text, the same on every draw until the year changes.',
      },
      {
        do: 'Just read, no need to paste: in agent code you will also see this fix, which keeps the loader inside, wrapped in `useCallback`:',
        code: 'const loadTotals = useCallback(() => getRayfinClient().then((c) => c.connectors.contoso.executeQuery({ query: salesTotals(year).query })), [year]);',
        why: '`useCallback` hands back the same function until something in its own list, here `[year]`, changes. Using the pack\'s hook, as the page does, is the sturdier fix.',
      },
    ],
    summary: [
      'No error, no red line, the right numbers. The only signs are the query count and, in a real app, the load on the model.',
      'In agent code, check every dependency list: is each thing in it a plain value, or made outside the page? A function made inside the page is new on every draw.',
      'The fix: use the pack\'s hook, make the function once outside the component, or wrap it in `useCallback`.',
    ],
    fabric: {
      text: 'Microsoft Learn\'s page on its data app template names unnecessary DAX queries, during development and at run time, as a problem its patterns reduce. A redraw loop is the extreme case.',
      links: [learn.templateWhy],
    },
  },

  {
    id: 'cross-filter',
    title: 'Cross-filter',
    goal: 'make a click on one visual filter the others',
    builds: ['slicer'],
    pbi: 'Click a bar and the other visuals respond: cards filter, and other bar charts highlight by default. Here we build the filter version, like choosing Filter in Edit interactions.',
    idea: 'We add a category chart in place of About, then let a click on a country filter the cards and the categories.',
    steps: [
      {
        do: 'In `packages/frontend/src/lib/filters.ts`, let the filters take a store country too: replace the marked `filters` function with this.',
        code: C.FILTERS_BOTH_FN,
        edits: [{ file: FILTERS, from: C.FILTERS_YEAR_FN, to: C.FILTERS_BOTH_FN }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Let the cards\' query take a country and pass it on: in `packages/frontend/src/queries/overview/sales-totals.ts`, two small changes, `(year?: number, country?: string)` and `filters(year, country)`. **Do it for me** makes both.',
        edits: [
          { file: TOTALS_TS, from: 'export function salesTotals(year?: number) {', to: 'export function salesTotals(year?: number, country?: string) {' },
          { file: TOTALS_TS, from: '  const f = filters(year);', to: '  const f = filters(year, country);' },
        ],
        see: 'Nothing changes yet.',
      },
      newFile(CATEGORY_DAX, 'The category chart gets a query file: '),
      paste(CATEGORY_DAX, C.CATEGORY_DAX, 'Paste its query, with the `/* filters */` marker already in place:', { see: 'Nothing changes yet.' }),
      newFile(CATEGORY_TS, 'And its small `.ts` file: '),
      paste(CATEGORY_TS, C.CATEGORY_TS, 'Paste this into it:', {
        see: 'Nothing changes yet.',
        why: 'It takes the year and the country from the start: both go where the `.dax` file has `/* filters */`.',
      }),
      {
        do: 'List it in the folder\'s index: in `packages/frontend/src/queries/overview/index.ts`, add this line under the last one.',
        code: reExport('revenue-by-category').trim(),
        edits: [{ file: OVERVIEW_INDEX, from: reExport('margin-pct'), to: reExport('margin-pct') + reExport('revenue-by-category') }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Load it into the page: in `packages/frontend/src/App.tsx`, add `revenueByCategory` to the marked query import.',
        code: IMP_Q_4.trim(),
        edits: [{ from: IMP_Q_3, to: IMP_Q_4 }],
        see: 'Nothing changes yet.',
      },
      {
        do: 'Run it: add this line under the marked `const marginQuery = …` line.',
        code: 'const categoriesQuery = useSemanticModelQuery(revenueByCategory(year));',
        edits: [{ from: MARGIN_LINE, to: `${MARGIN_LINE}  const categoriesQuery = useSemanticModelQuery(revenueByCategory(year));\n` }],
        see: 'A new query in the Log.',
      },
      {
        do: 'Include it in the checks: add `|| categoriesQuery.isLoading` to the Loading line, and `categoriesQuery` to the lists in the two error lines. **Do it for me** makes all three.',
        edits: [
          { from: '|| marginQuery.isLoading) return', to: '|| marginQuery.isLoading || categoriesQuery.isLoading) return' },
          { from: '[countriesQuery, totalsQuery, marginQuery])', to: '[countriesQuery, totalsQuery, marginQuery, categoriesQuery])', all: true },
        ],
        see: 'Nothing changes.',
      },
      {
        do: 'Replace the marked About section with the category chart:',
        code: "<section className=\"col-span-8 row-span-3 rounded-lg border border-gray-200 bg-white p-4\">\n  <h2 className=\"mb-2 font-semibold\">Revenue by category</h2>\n  <BarList rows={categoriesQuery.data ? toBars(categoriesQuery.data, 'product[CategoryName]', '[Revenue]') : []} />\n</section>",
        edits: [
          {
            from: '      <section className="col-span-8 row-span-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">\n        <h2 className="mb-2 font-semibold">About this page</h2>\n        <p>Contoso sample model, revenue in USD.</p>\n      </section>\n',
            to: "      <section className=\"col-span-8 row-span-3 rounded-lg border border-gray-200 bg-white p-4\">\n        <h2 className=\"mb-2 font-semibold\">Revenue by category</h2>\n        <BarList rows={categoriesQuery.data ? toBars(categoriesQuery.data, 'product[CategoryName]', '[Revenue]') : []} />\n      </section>\n",
          },
        ],
        see: 'Revenue by product category, under the cards.',
      },
      {
        do: 'Keep a selected country: add this line under the marked `year` line.',
        code: 'const [country, setCountry] = useState<string | undefined>(undefined);',
        edits: [{ from: YEAR_STATE, to: `${YEAR_STATE}  const [country, setCountry] = useState<string | undefined>(undefined);\n` }],
        see: 'Nothing changes yet.',
        why: 'Hooks (the `use…` lines) go at the top, above `Loading…`: that line can stop the drawing early, and every hook must run on every draw.',
      },
      {
        do: 'Give the country chart the selection: replace the marked `<BarList rows={countries} />` with this.',
        code: '<BarList rows={countries} selected={country} onSelect={(c) => setCountry(c === country ? undefined : c)} />',
        edits: [{ from: '<BarList rows={countries} />', to: '<BarList rows={countries} selected={country} onSelect={(c) => setCountry(c === country ? undefined : c)} />' }],
        see: 'Clicking a country fades the others; clicking it again clears it.',
        why: '`c === country ? undefined : c`: the same country again means nothing selected.',
        visual: 'bar',
      },
      {
        do: 'Pass the country to the cards\' and the categories\' queries: `salesTotals(year, country)` and `revenueByCategory(year, country)`. **Do it for me** makes both.',
        edits: [
          { from: 'salesTotals(year)', to: 'salesTotals(year, country)' },
          { from: 'revenueByCategory(year)', to: 'revenueByCategory(year, country)' },
        ],
        see: 'Nothing changes until something is clicked.',
      },
      {
        do: 'Click **Germany**, then **2024** in the slicer.',
        see: 'The cards and categories show Germany, then Germany in 2024 (2.8M revenue). The country chart keeps all its bars.',
        why: 'Its query takes the year but not the country.',
      },
    ],
    summary: [
      'This is [[lifting state up|lifting-state]]: the chart reports the click; the page, which holds all the visuals, keeps the selection and hands it down.',
      'Each query decides what it listens to: the country chart\'s query takes the year, not the country.',
      'In agent code, look for where the selection lives and which queries use it.',
    ],
    fabric: {
      text: 'Microsoft\'s checklist for data apps, run in a browser before publishing, includes: filters, cross-highlighting and data formatting work as expected.',
      links: [learn.templateChecks],
    },
  },

  {
    id: 'pages',
    title: 'Two pages',
    goal: 'turn the page into a report with a page list',
    builds: ['cross-filter'],
    pbi: 'A report has pages, and the page tabs show which one is open. Here a page is a component, and the open page is state, like the slicer\'s year.',
    idea: 'Our `App` becomes the first page, `OverviewPage`. A new `App` draws a page list and the open page. Then we add a second page.',
    steps: [
      {
        do: 'Make it a report: rename `App` to `OverviewPage`, and add the report at the end of `packages/frontend/src/App.tsx`. Use **Do it for me** for this one: it makes three edits.',
        code: C.REPORT.trimStart(),
        edits: [
          { from: 'export default function App() {', to: 'function OverviewPage() {' },
          { from: "import { useState } from 'react';", to: "import { useState, type ReactElement } from 'react';" },
          { from: '    </div>\n  );\n}\n', to: `    </div>\n  );\n}\n${C.REPORT}` },
        ],
        done: { file: APP, before: ['function OverviewPage() {', 'export default function App() {'] },
        see: 'A page list on the left, with **Overview** open.',
        why: '`PAGES` lists the pages; `App` keeps which one is open, with `useState`, and draws it. `export default` marks `App` as the file\'s main export: the one the preview draws.',
      },
      {
        do: 'Add a second page id. Change the marked `type PageId` line to:',
        code: "type PageId = 'overview' | 'years';",
        edits: [{ from: "type PageId = 'overview';", to: "type PageId = 'overview' | 'years';" }],
        errors: 1,
        see: 'A red line under `PAGES`. Hover: `years` is missing.',
        why: '`Record<PageId, …>` means one entry for every page id.',
      },
      newFile(YEARS_DAX, 'The page needs a query. A new page gets its own folder in `packages/frontend/src/queries`: ', {
        errors: 1,
        see: 'A new folder, `packages/frontend/src/queries/years`, with an empty `revenue-by-year.dax` in it. The red line stays.',
        why: 'The template\'s `AGENTS.md` groups query files by page (or topic): `overview` for the first page, `years` for this one.',
      }),
      paste(YEARS_DAX, C.YEARS_DAX, 'Paste its query:', { errors: 1, see: 'The red line stays.' }),
      writeFile(YEARS_TS, C.YEARS_TS, '**Do it for me** writes its small `.ts` file, `packages/frontend/src/queries/years/revenue-by-year.ts`:', { errors: 1, see: 'The red line stays.' }),
      {
        do: '**Do it for me** gives the new folder its `index.ts`, and lists the folder in `packages/frontend/src/queries/index.ts` with this line:',
        code: reExport('years').trim(),
        copy: false,
        edits: [
          { file: YEARS_INDEX, from: '', to: reExport('revenue-by-year') },
          { file: QUERIES_INDEX, from: reExport('overview'), to: reExport('overview') + reExport('years') },
        ],
        file: QUERIES_INDEX,
        point: 'files',
        errors: 1,
        see: '`packages/frontend/src/queries/index.ts` now passes on `overview` and `years`; the new `packages/frontend/src/queries/years/index.ts` passes on `revenue-by-year`. The red line stays.',
      },
      {
        do: 'Load the query: in `packages/frontend/src/App.tsx`, add `revenueByYear` to the marked query import.',
        code: IMP_Q_5.trim(),
        edits: [{ from: IMP_Q_4, to: IMP_Q_5 }],
        errors: 1,
        see: 'The red line stays.',
      },
      {
        do: 'Write the page, above the marked `the report` line in `packages/frontend/src/App.tsx`.',
        code: C.YEARS_PAGE.trim(),
        edits: [
          { from: '// ------------------------------------------------------------ the report\n', to: `${C.YEARS_PAGE}// ------------------------------------------------------------ the report\n` },
        ],
        errors: 1,
        see: 'The red line stays: `PAGES` has no entry for it yet.',
      },
      {
        do: 'Add it to `PAGES`, under the marked `overview:` line:',
        code: "years: { title: 'Years', Component: YearsPage },",
        edits: [{ from: "  overview: { title: 'Overview', Component: OverviewPage },\n", to: "  overview: { title: 'Overview', Component: OverviewPage },\n  years: { title: 'Years', Component: YearsPage },\n" }],
        see: 'The red line goes, and **Years** appears in the page list.',
      },
      {
        do: 'Click **Years**, then **Overview**.',
        see: 'Sales by year. Back on Overview, the slicer is on **All** again, and its queries run again.',
        why: 'A closed page is drawn fresh when it opens, with fresh state: like a report page loading its visuals.',
      },
    ],
    summary: [
      'A page is a component, and the open page is state.',
      '`Record<PageId, …>` makes TypeScript check that every page id has an entry: a page added in one place and forgotten in the other gets a red line, not a broken menu.',
      'In agent code, a page list like `PAGES` is the report\'s table of contents.',
    ],
    fabric: {
      text: 'In a real app, one command typed in a terminal, `npx rayfin up`, deploys the whole app, all its pages included, with its connector settings: a bit like Publish in Power BI Desktop.',
      links: [learn.deploy],
    },
  },

  // ================================================================== 5 Own what the agent wrote
  {
    id: 'review',
    title: 'Review an agent\'s page',
    goal: 'review a page an agent wrote, in four checks',
    builds: ['conversion', 'measure-or-query', 'failure', 'redraw-trap', 'pages'],
    pbi: 'Before a report goes to its users, someone checks it: are the numbers right, do the filters work, does an error show as an error. A page an agent wrote needs the same check.',
    idea: 'An "agent" adds a page to our project, written from one prompt. It looks finished, and it has four problems, each from an earlier lesson. We check in the order a reviewer would: does it run, are the numbers right, what happens when a query fails, where do the formulas live.',
    steps: [
      {
        do: 'Let the agent add its file: **Do it for me**.',
        edits: [{ file: AGENT, from: '', to: C.AGENT_PAGE }],
        point: 'files',
        see: '`packages/frontend/src/SalesOverview.tsx` in the file list: a whole page, with its own functions.',
      },
      {
        do: 'Add it to our report: the agent asked for a page id, a `PAGES` entry and an import. **Do it for me** makes the three edits.',
        code: "import SalesOverview from './SalesOverview';\n\ntype PageId = 'overview' | 'years' | 'agent';\n\nagent: { title: 'Agent page', Component: SalesOverview },",
        edits: [
          { from: "type PageId = 'overview' | 'years';", to: "type PageId = 'overview' | 'years' | 'agent';" },
          { from: "  years: { title: 'Years', Component: YearsPage },\n", to: "  years: { title: 'Years', Component: YearsPage },\n  agent: { title: 'Agent page', Component: SalesOverview },\n" },
          { from: "import { useState, type ReactElement } from 'react';\n", to: "import { useState, type ReactElement } from 'react';\nimport SalesOverview from './SalesOverview';\n" },
        ],
        see: '**Agent page** in the page list.',
      },
      {
        do: 'Check 1: does it run? Click **Agent page**, and watch the count next to **Running**.',
        point: 'status',
        see: 'It climbs until the playground stops the page.',
        why: 'A query loop, as in **The redraw trap**.',
      },
      {
        do: 'Fix it, in `packages/frontend/src/SalesOverview.tsx`: move the marked `runDax` line, with the comment above it, out of `SalesOverview` to just above `function useDax` (cut, then paste; **Do it for me** does the move).',
        file: AGENT,
        find: 'const runDax: RunDax = async (query)',
        edits: [
          { file: AGENT, from: AGENT_RUNDAX_IN_PAGE, to: '' },
          {
            file: AGENT,
            from: 'function useDax(runDax: RunDax, query: string) {',
            to: '// Runs a DAX query against the model.\nconst runDax: RunDax = async (query) => (await getRayfinClient()).connectors.contoso.executeQuery({ query });\n\nfunction useDax(runDax: RunDax, query: string) {',
          },
        ],
        done: { file: AGENT, before: ['const runDax', 'export default function SalesOverview'] },
        point: 'status',
        see: 'Press **Run again** and open **Agent page**: the count stays put.',
      },
      {
        do: 'Check 2: are the numbers right? Compare the agent\'s **Revenue** card with its bars.',
        see: 'The card says 150.6M, but the top bar, United States, says 22,824.',
        why: 'The card is right; the bars aren\'t. Which column do they read?',
      },
      {
        do: 'In the **Log** tab, click the `sales-by-country-with-orders` query. Which column is second?',
        point: 'log',
        file: AGENT,
        find: 'value: Number(row[1])',
        see: '`[Orders]`. And the marked part of the agent\'s `toBars` reads `row[1]`.',
        why: 'So the bars show order counts, as in **The conversion**.',
      },
      {
        do: 'Fix it: click **Show me in the code** to select the marked part of `toBars`, then paste this over it:',
        code: "({ label: String(row[col(result, 'store[CountryName]')]), value: Number(row[col(result, '[Revenue]')]) })",
        edits: [{ file: AGENT, from: '({ label: String(row[0]), value: Number(row[1]) })', to: "({ label: String(row[col(result, 'store[CountryName]')]), value: Number(row[col(result, '[Revenue]')]) })" }],
        see: 'United States: 60,466,772, and the bars are in order.',
        why: '`col` is the agent\'s own function, already used by its `toTotals`: it finds a column by name.',
      },
      {
        do: 'Check 3: what happens when a query fails? In the **Queries** tab, pick **Network down**.',
        point: 'queries',
        see: 'Nothing changes until the page runs again.',
      },
      {
        do: 'Press **Run**, above the page.',
        point: 'run',
        see: 'The page starts again on **Overview**, with its error panel.',
      },
      {
        do: 'Open **Agent page**.',
        point: 'preview',
        see: 'Every card shows 0 (Margin % shows 0%) and the chart is empty. No message.',
        why: 'The agent\'s conversions turn a failed result into zeros, and its page never checks `status`. It even wrote an `ErrorPanel`, but nothing uses it.',
      },
      {
        do: 'Fix it: add this line under the marked `Loading…` line in `packages/frontend/src/SalesOverview.tsx`.',
        code: "for (const r of [totalsResult, countriesResult, marginResult]) if (r.status === 'error') return <ErrorPanel message={r.error.message} />;",
        file: AGENT,
        edits: [
          {
            file: AGENT,
            from: 'return <p className="p-4">Loading…</p>;\n',
            to: 'return <p className="p-4">Loading…</p>;\n  for (const r of [totalsResult, countriesResult, marginResult]) if (r.status === \'error\') return <ErrorPanel message={r.error.message} />;\n',
          },
        ],
        see: '**This page could not load its data**, with the network message.',
      },
      {
        do: 'In the **Queries** tab, pick **Answer normally** again.',
        point: 'queries',
        see: 'Nothing changes until the page runs again.',
      },
      {
        do: 'Press **Run**.',
        point: 'run',
        see: 'The data is back.',
      },
      {
        do: 'Check 4: where do the formulas live? Look at the agent\'s marked `marginQuery`.',
        file: AGENT,
        find: 'const marginQuery',
        see: 'A whole margin formula inside the query, with `DEFINE MEASURE`.',
        why: 'The model already has `[Margin %]`, as in **Measure or query** (on a real project, look in the model\'s field list). A copy can drift from it, and nothing would warn us. The agent also wrote its DAX inside the page; the template\'s instructions keep every query in a `.dax` file, as ours are, so that is worth a note in the review too. Here we fix only the formula; moving a query into a file takes the same steps as in **The first queries**.',
      },
      {
        do: 'Fix it: click **Show me in the code** to select the whole of `marginQuery`, then paste this over it:',
        code: 'const marginQuery = `\nEVALUATE\nROW ( "Margin %", [Margin %] )\n`;',
        edits: [{ file: AGENT, from: C.AGENT_MARGIN_IN_QUERY, to: 'const marginQuery = `\nEVALUATE\nROW ( "Margin %", [Margin %] )\n`;' }],
        see: 'Still 55.9%: the same number, but the formula now lives in one place, the model.',
        why: 'The rest of the page is worth a note too: the agent wrote its own `useDax` hook and its own `Card`, `Bars` and `ErrorPanel` components inside `SalesOverview.tsx`, where our project keeps them in `packages/frontend/src/hooks` and `packages/frontend/src/components`.',
      },
    ],
    summary: [
      'Four problems, and not one red line: a query loop, numbers from the wrong column, errors turned into zeros, and a formula copied out of the model.',
      'Review in that order: does it run (the query count), are the numbers right (compare with a total you trust), what does it show when a query fails, and where do the formulas live.',
      'None of these give a red line, so running the page and reading its code is the check.',
    ],
    fabric: {
      text: 'Microsoft\'s guide to building these apps with GitHub Copilot has the same job: review what the agent changed, the connector settings and its DAX queries first. It also asks us to look at new packages and at data calls that skip the connector. The template (CLI 2.0.0) has a second data path of its own; Microsoft\'s walkthrough says to replace calls to it with the connector client, so treat it as a review finding.',
      links: [learn.copilotReview],
    },
  },

  {
    id: 'to-fabric',
    title: 'Take it to Fabric',
    goal: 'say what changes when the app goes to a real Fabric workspace',
    builds: ['review'],
    pbi: 'Like publishing a report from Desktop: the report is the same, but the data source and the permissions are real, and the data is as fresh as the model (for an Import model, its last refresh).',
    idea: 'Our project follows the steps of a real one: template, connector, client, pages. What is left is what the playground can\'t do: real ids, real sign-in, real users, and deploying.',
    steps: [
      {
        do: 'Look at the connector in `rayfin/rayfin.yml`.',
        file: YML,
        find: 'workspaceId:',
        see: 'Our made-up ids.',
        why: 'In a real project, `npx rayfin connector search --all-workspaces --type fabric-semanticmodel` lists the models you can reach, with ready-made `connector add` commands. Re-run `connector add` with `--yes` to replace the ids.',
      },
      {
        do: 'Look at the **Queries** tab.',
        point: 'queries',
        see: 'Saved answers. On Fabric, each query goes live to the semantic model.',
        why: 'It runs as the person using the app, so each user needs Build and Read permission on the model, as for Analyze in Excel.',
      },
      {
        do: 'Before the first real query, check these with your Fabric admin.',
        see: 'The Fabric Apps workload is on for the tenant, and so is the tenant setting **Semantic Model Execute Queries REST API** (older name: Dataset Execute Queries REST API, under Integration settings). You need Contributor, Member or Admin on the workspace.',
        why: 'Microsoft\'s walkthrough also asks for a model hosted on Fabric or Power BI capacity; its licensing page describes what works in Pro workspaces.',
      },
      {
        do: 'Before publishing, check the page in a browser. The template\'s app-validation skill ends with a browser check, because a build can succeed while a chart is empty.',
        see: 'Visuals draw and aren\'t cut off or squeezed, text is readable, loading, empty and error states make sense, filters and cross-highlighting work, and the browser console shows no unexpected errors.',
        why: 'We practised some of these in **Failure** (error and empty states) and **Cross-filter** (filters). Also test as a normal user who has access to both the app and the model: their permissions are the ones that count.',
      },
      {
        do: 'Deploy:',
        run: 'npx rayfin up',
        point: 'terminal',
        see: 'The playground says what the real command does. Nothing is deployed.',
        why: 'The real one builds the app and deploys it, connector included, a bit like Publish in Power BI Desktop. `npx rayfin up status` then prints its address. This is also where connector queries start to work for real: `rayfin dev` doesn\'t wire connectors.',
      },
    ],
    summary: [
      'We built an app with Rayfin\'s connector, in the order a real one is set up: the template, the connector, the client, the pages.',
      'What changes on Fabric: real ids, real sign-in, live queries as the person using the app, and a deploy. In a real data app project, the connector goes into the template\'s own client.',
      'To start a real one, follow Rayfin\'s Quickstart and Microsoft\'s walkthrough.',
    ],
    fabric: {
      text: 'Read next: Microsoft\'s walkthrough of a data app connected to a semantic model, Rayfin\'s page on semantic model connectors, and the Quickstart.',
      links: [learn.template, rayfin.semanticModels, rayfin.quickstart],
    },
  },
  // ================================================================== Chapter 2: Two semantic models
  // ================================================================== Two models in one app
  {
    id: 'second-model',
    title: 'Add a second model',
    goal: 'add a second semantic model connector next to the first, under a name of its own',
    builds: ['connector', 'to-fabric'],
    pbi: 'A thin report connects live to one semantic model. An app isn\'t limited to one: each model gets its own [[connector]], side by side, each with its own name.',
    idea: 'The owner keeps a second model next to Contoso measures: the same Contoso data, with Pareto measures (which categories make 80% of revenue). We add it as `pareto`, after one slip with the name.',
    steps: [
      {
        do: 'A slip on purpose: add the Pareto model, named `Contoso` (it is a Contoso model, after all):',
        run: ADD_PARETO_AS_CONTOSO,
        point: 'terminal',
        see: '`Using existing connector name "contoso" (from "Contoso").`, then `Connector "Contoso" already exists as "contoso".` The real CLI asks **Overwrite?** here; the playground answers no, and nothing changes.',
        why: 'Connector names ignore case: `Contoso` is `contoso`. A yes would have pointed `contoso` at the Pareto model, and the **Overview** page would ask it for `[# Orders]`, a measure that model doesn\'t have.',
      },
      {
        do: 'Add it again, named `pareto`:',
        run: ADD_PARETO,
        point: 'terminal',
        see: '`rayfin.yml` changed, a new `rayfin/connectors/pareto/schema.ts`, `🔌 Wired 2 connector(s) into packages/frontend/src/lib/connectors.ts`, and the same install line as before. No need to run it: the packages are already in.',
        why: 'The name is how our code will reach it: the `connection` our query files name. Pick one that says which model it is. New names are stored in lower case anyway.',
      },
      {
        do: 'Look at `rayfin/rayfin.yml`, open in the editor.',
        file: YML,
        find: '  - name: pareto',
        see: 'Two entries under `connectors:`, each with its own `workspaceId` and `itemId`, and both with `auth` of type `delegated`.',
        why: 'Each connector carries its own ids, so the two models could even live in different workspaces. Both are delegated: a semantic model connector only runs as the signed-in person.',
      },
      {
        do: 'Look at `rayfin/connectors/pareto/schema.ts`, open in the editor (its path is above the code).',
        file: PARETO_SCHEMA_FILE,
        find: "export type ParetoSchema = FabricSemanticModel<'executeQuery'>;",
        see: 'The same shape as `ContosoSchema`: a semantic model with one operation, `executeQuery`.',
        why: 'The type knows what kind of connector it is, not which measures the model has. TypeScript can\'t tell our two models apart: only their names can.',
      },
      {
        do: 'Open `packages/frontend/package.json` and find the packages from the install line.',
        file: 'packages/frontend/package.json',
        find: '"@microsoft/rayfin-connector-fabric-semanticmodel"',
        see: 'Both are already there, as `^2.0.0`: the analytics pack added them in **Add the connector**, matching `@microsoft/rayfin-core` (2.0.0, or a later 2.x).',
        why: 'One package serves every semantic model connector, so there is nothing new to install.',
      },
      {
        do: 'Test it from the terminal with a measure only this model has (copy it rather than type it):',
        run: INVOKE_HEADLINE_PARETO,
        point: 'terminal',
        see: '`✅ Invoked pareto.executeQuery`, then the result: `"status": "success"` and one row: **It takes 4 of 8 categories to reach 80% of revenue**.',
        why: 'The model writes that sentence itself, from its own measure, `[Cutoff Headline]`.',
      },
      {
        do: 'A slip on purpose: send the same query to `contoso`:',
        run: INVOKE_HEADLINE_CONTOSO,
        point: 'terminal',
        commandFails: true,
        see: 'The query fails: `❌ Connector invoke failed (connector error): Query (1, 28) The value for \'Cutoff Headline\' cannot be determined. Either the column doesn\'t exist, or there is no current row for this column.`',
        why: 'The connector name picks the model, and each model knows only its own measures. Nothing to undo: it was only a test.',
      },
    ],
    summary: [
      'A second model is a second connector, with a name of its own: the connector name decides which model answers.',
      'Connector names ignore case: a name that differs only by case is the same connector, and the CLI offers to overwrite it.',
    ],
    fabric: {
      text: 'In a real project the ids come from `npx rayfin connector search` or the model\'s address in the Fabric portal, and every user of the app needs access to both models.',
      links: [rayfin.adding, rayfin.semanticModels, learn.addConnector],
    },
  },

  {
    id: 'second-client',
    title: 'Use the second model',
    goal: 'check how the second model was wired, and query it from a page of its own',
    builds: ['second-model', 'client'],
    pbi: 'A model in `rayfin.yml` is like a data source in the workspace. Here, adding it also wires it into the app: what is left is a visual that uses it.',
    idea: '`connector add` already wrote `pareto` into the wiring. We check the three places, then give the second model a query file and a page.',
    steps: [
      {
        do: 'Open `packages/frontend/src/lib/connectors.ts` and look at the marked line.',
        file: CONNECTORS,
        find: "  'pareto': paretoSchema;",
        point: 'files',
        see: '`pareto` beside `contoso` in all three places: the schema type, `connectorConfigs`, and `connectorRuntimes` with `fabricSemanticModel()`.',
        why: 'Written by `connector add` in **Add a second model**, under the exact name in `rayfin.yml`. With the wiring generated, the slips of writing it by hand, such as a missing runtime, don\'t happen.',
      },
      newFile(PARETO_HEADLINE_DAX, 'The second model\'s first query gets a file, in `packages/frontend/src/queries/categories`, for the **Categories** page we add in a few steps: ', {
        see: 'A new folder, `packages/frontend/src/queries/categories`, with an empty `pareto-headline.dax` in it.',
      }),
      paste(PARETO_HEADLINE_DAX, C.PARETO_HEADLINE_DAX, 'Paste the query. It names two measures from the Pareto model:', { see: 'Nothing changes yet.' }),
      newFile(PARETO_HEADLINE_TS, 'And its small `.ts` file: '),
      paste(PARETO_HEADLINE_TS, C.PARETO_HEADLINE_TS, 'Paste this into it:', {
        see: 'No red lines.',
        why: '`connection: \'pareto\'` sends it to the second model. With a year, its `ROW` goes inside `CALCULATETABLE`, as for the cards. The Pareto model is built on the same tables, so the same filter text works there: `\'date\'[Year]` is in both.',
      }),
      {
        do: '**Do it for me** gives `packages/frontend/src/queries/categories` its `index.ts`, and lists the folder in `packages/frontend/src/queries/index.ts` with this line:',
        code: reExport('categories').trim(),
        copy: false,
        edits: [
          { file: CATEGORIES_INDEX, from: '', to: reExport('pareto-headline') },
          { file: QUERIES_INDEX, from: reExport('years'), to: reExport('years') + reExport('categories') },
        ],
        file: QUERIES_INDEX,
        point: 'files',
        see: '`packages/frontend/src/queries/index.ts` now passes on three folders; the new `packages/frontend/src/queries/categories/index.ts` passes on `pareto-headline`. No red lines.',
      },
      {
        do: 'At the end of `packages/frontend/src/lib/conversions.ts`, add the headline\'s conversion:',
        code: C.HEADLINE_CONV.trimStart(),
        edits: [{ file: CONV, from: PERCENT_END, to: PERCENT_END + C.HEADLINE_CONV }],
        see: 'No red lines.',
      },
      {
        do: 'Add the page as **Categories**: **Do it for me** writes `packages/frontend/src/ParetoPage.tsx` (a year slicer and the headline) and adds the page to the report (page id, import and `PAGES` entry); this is the line it adds to `PAGES`:',
        code: "pareto: { title: 'Categories', Component: ParetoPage },",
        copy: false,
        edits: [
          { file: PARETO_PAGE, from: '', to: C.PARETO_PAGE_V1 },
          { from: "type PageId = 'overview' | 'years' | 'agent';", to: "type PageId = 'overview' | 'years' | 'agent' | 'pareto';" },
          { from: PAGES_AGENT, to: PAGES_AGENT + PAGES_PARETO },
          { from: IMPORT_AGENT, to: IMPORT_AGENT + IMPORT_PARETO },
        ],
        see: '**Categories** in the page list.',
      },
      {
        do: 'Click **Categories**.',
        point: 'preview',
        see: '**It takes 4 of 8 categories to reach 80% of revenue**.',
        why: 'The model writes that sentence itself, from its own measure, `[Cutoff Headline]`.',
      },
    ],
    summary: [
      '`connector add` writes a second model into the wiring too: its name in the schema type, `connectorConfigs` and `connectorRuntimes`.',
      'A query file names its model: `connection: \'pareto\'` sends it to the Pareto model.',
      'Use the exact, lower-case name: it is the key in `rayfin.yml` and in the wiring.',
    ],
    fabric: {
      text: 'In the default template, `connector add` keeps `packages/frontend/src/lib/connectors.ts` in step with `rayfin.yml`. If you have taken the file over, it prints the wiring to merge instead of rewriting it.',
      links: [rayfin.clientSetup, rayfin.semanticModels],
    },
  },

  {
    id: 'two-models-page',
    title: 'Two models, one page',
    goal: 'query two models from one page, and check whether a measure with the same name means the same thing in both',
    builds: ['second-client', 'slicer', 'measure-or-query'],
    pbi: 'Two visuals on one page, each on a different model, under one slicer. And a question every BI developer knows from merging two models: is `[Revenue]` here the same `[Revenue]` as there?',
    idea: 'We grow **Categories** into a Pareto page: bars with the running share, the vital few starred, and two Revenue cards, one per model. Then we check the two Revenue measures properly.',
    steps: [
      {
        do: '**Do it for me** writes the query file for the bars, `packages/frontend/src/queries/categories/pareto-by-category.dax`:',
        code: C.PARETO_BY_CATEGORY_DAX,
        copy: false,
        edits: [{ file: PARETO_BY_CATEGORY_DAX, from: '', to: C.PARETO_BY_CATEGORY_DAX }],
        point: 'files',
        see: 'A new file in `packages/frontend/src/queries/categories`, open in the editor.',
        why: 'It names the model\'s own measures (`[Revenue Share %]`, `[Revenue Cumulative %]`): the running share stays in the model, as **Measure or query** advised. The year goes where `/* filters */` is.',
      },
      {
        do: '**Do it for me** writes its `.ts` file, `packages/frontend/src/queries/categories/pareto-by-category.ts`, and lists it in the folder\'s `index.ts`:',
        code: C.PARETO_BY_CATEGORY_TS,
        copy: false,
        edits: [
          { file: PARETO_BY_CATEGORY_TS, from: '', to: C.PARETO_BY_CATEGORY_TS },
          { file: CATEGORIES_INDEX, from: reExport('pareto-headline'), to: reExport('pareto-headline') + reExport('pareto-by-category') },
        ],
        point: 'files',
        see: 'No red lines.',
        why: 'The year goes into the file\'s marker, as for the countries chart.',
      },
      {
        do: '**Do it for me** writes the query file for the two Revenue cards, `packages/frontend/src/queries/categories/revenue-card.dax`:',
        code: C.REVENUE_CARD_DAX,
        copy: false,
        edits: [{ file: REVENUE_CARD_DAX, from: '', to: C.REVENUE_CARD_DAX }],
        point: 'files',
        see: 'One measure, by name. The page sends this same text to both models.',
      },
      {
        do: '**Do it for me** writes its `.ts` file too, `packages/frontend/src/queries/categories/revenue-card.ts`, and lists it in the folder\'s `index.ts`:',
        code: C.REVENUE_CARD_TS,
        copy: false,
        edits: [
          { file: REVENUE_CARD_TS, from: '', to: C.REVENUE_CARD_TS },
          { file: CATEGORIES_INDEX, from: reExport('pareto-by-category'), to: reExport('pareto-by-category') + reExport('revenue-card') },
        ],
        point: 'files',
        see: 'No red lines.',
        why: 'With a year, its `ROW` goes inside `CALCULATETABLE`, as for the cards.',
      },
      {
        do: 'At the end of `packages/frontend/src/lib/conversions.ts`, add the page\'s two conversions:',
        code: C.PARETO_CONV.trimStart(),
        edits: [{ file: CONV, from: HEADLINE_END, to: HEADLINE_END + C.PARETO_CONV }],
        see: 'No red lines.',
      },
      {
        do: '**Do it for me** replaces `packages/frontend/src/ParetoPage.tsx` with the full page.',
        code: C.PARETO_PAGE,
        file: PARETO_PAGE,
        edits: [{ file: PARETO_PAGE, from: C.PARETO_PAGE_V1, to: C.PARETO_PAGE }],
        see: 'No red lines. The page starts again on **Overview**.',
      },
      {
        do: 'Open **Categories**.',
        point: 'preview',
        see: 'Two cards, **Revenue, contoso model** and **Revenue, pareto model**, both 150.6M; the headline; eight bars (scroll inside their card for the rest), the first four starred: `★ Computers (46.1%)`, `★ Cell phones (61%)`, `★ Home Appliances (72.4%)`, `★ Cameras and camcorders (83%)`.',
      },
      {
        do: 'Look at the four `useSemanticModelQuery` lines, from the marked one down.',
        file: PARETO_PAGE,
        find: 'const paretoQuery = useSemanticModelQuery(paretoByCategory(year));',
        see: 'Two Pareto query files, then `revenueCard` twice: once with `\'contoso\'`, once with `\'pareto\'`. All four take the same `year`.',
        why: 'The hook doesn\'t care which model answers: each query\'s `connection` decides. One slicer state feeds both models, like a slicer on two visuals.',
      },
      {
        do: 'Pick **2024** in the slicer.',
        point: 'preview',
        see: 'Both cards 35M. Still "4 of 8", but now Computers, Home Appliances, Cell phones and Cameras are starred (48.8%, 62.1%, 75.1%, 85.6%).',
        why: 'The number of vital categories is 4 in every year, but which four changes: try **2023**, where Cameras is second. The stars use the model\'s count, `[# Categories to 80%]`: the page doesn\'t redo the maths.',
      },
      {
        do: 'A slip on purpose: in `packages/frontend/src/queries/categories/pareto-by-category.ts`, change the marked `\'pareto\'` to `\'contoso\'`.',
        file: PARETO_BY_CATEGORY_TS,
        find: "connection: 'pareto'",
        edits: [{ file: PARETO_BY_CATEGORY_TS, from: "return { connection: 'pareto', query:", to: "return { connection: 'contoso', query:" }],
        queryFails: true,
        see: 'No red line. The page starts again on **Overview**.',
      },
      {
        do: 'Open **Categories**.',
        point: 'preview',
        see: 'The page shows its error panel: `Query (4, 73) The value for \'Revenue Cumulative %\' cannot be determined. Either the column doesn\'t exist, or there is no current row for this column.`',
        why: 'The query went to `contoso`, which has no Pareto measures. TypeScript can\'t catch it: `connection` is text, and so is the DAX. Only the model can.',
      },
      {
        do: UNDO,
        edits: [{ file: PARETO_BY_CATEGORY_TS, from: "return { connection: 'contoso', query:", to: "return { connection: 'pareto', query:" }],
        see: 'The page starts again on **Overview**.',
      },
      {
        do: 'Open **Categories** again.',
        point: 'preview',
        see: 'The bars come back.',
      },
      {
        do: 'Compare the two Revenue cards for each choice in the slicer.',
        point: 'preview',
        see: 'Equal every time: 150.6M, 17M, 35M, 49M, 49.7M.',
        why: 'Same name, same number. A good sign, not proof: two different formulas can agree on today\'s data and part ways tomorrow.',
      },
      {
        do: 'In the **Queries** tab, type `lives` in the **Find a query** box at the top.',
        point: 'queries',
        see: 'Two entries left: **Where [Revenue] lives in pareto, and its formula**, and the same for contoso.',
      },
      {
        do: 'Open both entries.',
        point: 'queries',
        see: 'In both, the formula is `SUMX ( sales, sales[Quantity] * sales[NetPrice] )`. The home table differs: `_Measures` in contoso, `sales` in pareto.',
        why: 'These were saved in Power BI Desktop, by the models\' owner. `INFO.VIEW.MEASURES()` shows `[Expression]` only to people with write permission on the model, so a viewer can\'t compare formulas this way (and whether the connector lets `INFO` functions through isn\'t documented). Compare formulas where the models are built.',
      },
      {
        do: 'What else must match before two `[Revenue]` measures are the same? Read this card.',
        see: 'The formula (it does), the data (the same files and relationships), the refresh (each model only has sales up to its last refresh) and any RLS roles (neither model has one).',
        why: 'Same name isn\'t proof of same meaning. Here it holds, and now we know why, instead of hoping.',
      },
      {
        do: 'In the **Log**, open the newest `pareto` query and the newest `contoso` query (the newest entries come first).',
        point: 'log',
        see: 'Each names its connector, and both say `runs as: the signed-in user (delegated)`.',
        why: 'Each query runs as the person, in each model separately: they need access to both models, and each model\'s own RLS applies to its own queries.',
      },
    ],
    summary: [
      'One page can ask several models: the runner decides which one answers, and a query sent to the wrong model fails only when it runs.',
      'A measure with the same name in two models is the same only when its formula, data, refresh and roles are.',
      'Both semantic model connectors run as the signed-in person, each in its own model.',
    ],
    fabric: {
      text: 'In a real app each user needs access to both models, and each delegated connector sets up the user\'s own connection the first time it is used. Rayfin\'s docs say a permissions failure comes back as an error with category `api`; the exact message isn\'t documented. On the Execute DAX Queries API, which Rayfin\'s CLI path calls, a 403 means the caller lacks Build and Read permission on the model.',
      links: [rayfin.connectorAuth, learn.modelPermissions, learn.daxErrors, learn.infoViewMeasures],
    },
  },

  // ================================================================== Chapter 3: Read a lakehouse
  // ================================================================== Connect a lakehouse
  {
    id: 'lakehouse-connector',
    title: 'Add a lakehouse connector',
    goal: 'add a read-only connector to a lakehouse\'s SQL analytics endpoint',
    builds: ['to-fabric'],
    pbi: 'Like Get data > Lakehouse with DirectQuery: every read goes live to the lakehouse\'s SQL endpoint, through the app\'s backend. Nothing is imported.',
    idea: 'Our report numbers come from the model. The order lines behind them live in a lakehouse, made from the same Contoso files. One more connector, of a new kind: it gives us tables as typed [[entities|entity]] instead of a DAX door.',
    steps: [
      {
        do: 'In the **Terminal**, look for lakehouses in our workspace:',
        run: LAKE_SEARCH,
        point: 'terminal',
        see: 'One result, `ContosoLake`, a `Lakehouse`, with its `itemId` and a ready-made `addCommand`.',
        why: '`--type` is required when you name a workspace. The real command lists only items your account can reach; here the list is made up.',
      },
      {
        do: 'Add it, named `lake`, for reading:',
        run: LAKE_ADD,
        see: '`rayfin.yml` changed, a new folder `rayfin/connectors/lake/` with `metadata.json` and `schema.ts`, a warning that `lake` is not wired into `connectors.ts` (its `schema.ts` doesn\'t export `connectorConfig` yet), and an install line.',
        why: 'For a SQL source, the command reads the tables and columns (schema discovery) and saves them. It writes no code for them: that is the next lesson. The wiring waits for that code: the connectors skill adds `lake` to `connectors.ts` by hand once `schema.ts` exports `connectorConfig`, as we do in **Rows on a page**. `--operations read` is how Microsoft Learn\'s example adds a lakehouse; `read` is all a lakehouse allows anyway.',
      },
      {
        do: 'Open `rayfin/rayfin.yml` and find the marked `- name: lake`.',
        file: YML,
        find: '  - name: lake',
        see: '`type: fabric-sqlanalytics`, the two ids, `auth` of type `application`, and one operation, `read`. No `version` line this time.',
        why: 'The `itemId` is not the one we typed: the CLI swaps in the id of the lakehouse\'s SQL analytics endpoint (the docs don\'t say so; the Rayfin CLI 2.0.0\'s own code does). `application` means the app\'s own identity, not the person using it: **Who runs this query** comes back to it.',
      },
      {
        do: 'Run the install line it printed:',
        run: LAKE_INSTALL,
        see: '`@microsoft/rayfin-connector-fabric-graphql` added to `packages/frontend/package.json`.',
        why: 'As in **Add the connector**: the printed versions, into the frontend package (`-w @rayfin-app/frontend`), as the connectors skill says, so every Rayfin package stays on one version.',
      },
      {
        do: 'Open `rayfin/connectors/lake/metadata.json`.',
        file: LAKE_METADATA,
        find: '"tableName": "sales"',
        see: 'One schema, `dbo`, with two tables, `sales` and `store`. Each column has a `dataType` and `isNullable`. There is no `primaryKeyColumns` and no `foreignKeys`.',
        why: 'This is what discovery found: the [[metadata]]. Lakehouse endpoints commonly declare no keys and no relationships. The file is regenerated, never edited: to refresh it, run `connector add` again. (Playground: this one was made for the playground, in the documented shape, not captured from a real lakehouse.)',
      },
      {
        do: 'Open `rayfin/connectors/lake/schema.ts`.',
        file: LAKE_SCHEMA_FILE,
        find: 'Placeholder',
        see: 'A placeholder: nothing our app can use yet.',
        why: 'For a semantic model, `connector add` wrote a finished schema. For SQL sources, we (or an agent) write one class per table first, then replace this file.',
      },
      {
        do: 'Check we can read the source: one row from `store`.',
        run: LAKE_INSPECT,
        see: 'One row: `StoreKey`, `CountryName` and `State`.',
        why: '`inspect` reads the source read-only, as you, the developer. It proves your access, not the app\'s: once deployed, queries run as the identity in `auth`.',
      },
    ],
    summary: [
      '`connector add --type fabric-sqlanalytics` writes the connector, its `metadata.json` and a placeholder schema, and installs nothing.',
      'A lakehouse connector only reads, and by default runs as the app\'s owner (`application`).',
      '`connector inspect` proves your own access to the source, before any app code.',
    ],
    fabric: {
      text: 'In a real project, discovery runs as you and needs SQL endpoint permissions on the lakehouse; the deployed app then reads as the identity in `auth`. Connector queries start working once the app is deployed: `rayfin dev` doesn\'t wire connectors.',
      links: [rayfin.adding, rayfin.connectors, learn.addConnector],
    },
  },

  {
    id: 'lakehouse-entities',
    title: 'Entities from the metadata',
    goal: 'turn the discovered tables into typed entity files, and replace the placeholder schema',
    builds: ['lakehouse-connector'],
    pbi: 'Like the Navigator in Get data, listing a source\'s tables and columns. Here each table becomes a class, and each column a property with a type.',
    idea: 'In a real project an agent usually writes these files from `metadata.json`: Rayfin\'s docs spell out the rules for it. We write the small one, `Store`, by hand, let the "agent" write `Sales`, and check it against the same rules.',
    steps: [
      {
        do: 'Click **+ New file**, at the top of the file list, and type `rayfin/connectors/lake/Store.ts` in place of the `packages/frontend/src/` already there.',
        edits: [{ file: LAKE_STORE, from: '', to: '' }],
        point: 'files',
        see: 'A new, empty `Store.ts`, beside `schema.ts` in `rayfin/connectors/lake`, open in the editor.',
      },
      {
        do: 'Paste the imports into it:',
        code: C.STORE_IMPORTS,
        edits: [{ file: LAKE_STORE, from: '', to: C.STORE_IMPORTS }],
        see: 'No red lines.',
        why: '`@microsoft/rayfin-core` has the decorators, the `@…` lines that describe a class to Rayfin. `Source` points a class at a table in the connector\'s source.',
      },
      {
        do: 'Under the imports, add the class:',
        code: C.STORE_CLASS.trimStart(),
        edits: [{ file: LAKE_STORE, from: C.STORE_IMPORTS, to: C.STORE_IMPORTS + C.STORE_CLASS }],
        see: 'No red lines.',
        why: '`@entity()` makes the class an [[entity]]. `Source` names the physical table. Each property gets a decorator for its column\'s SQL type (`int` → `@int`, `varchar` → `@text`), and `column:` maps the SQL name (`StoreKey`) to a camelCase property (`storeKey`). `max` is the column\'s `maxLength`. We keep only the columns the app needs.',
      },
      {
        do: 'Look at the marked `@role(\'authenticated\', [\'read\'])`.',
        file: LAKE_STORE,
        find: "@role('authenticated', ['read'])",
        see: 'A second decorator on the class, above `@entity()`.',
        why: 'Signed-in people may read. Its actions must fit the connector\'s operations (here, `read`).',
      },
      {
        do: 'Look at the marked `primaryKey: []`.',
        file: LAKE_STORE,
        find: 'primaryKey: []',
        see: 'An empty list: this entity has no key.',
        why: 'The metadata named none, and the rule is never to invent one from column names, even one called `StoreKey`. Without a key there is no `findByKey`, `update` or `delete`. For a read-only lakehouse, that\'s fine.',
      },
      {
        do: 'Let the agent write the other table: **Do it for me**.',
        edits: [{ file: LAKE_SALES, from: '', to: C.SALES_ENTITY }],
        point: 'files',
        see: '`rayfin/connectors/lake/Sales.ts`, with `orderKey`, `lineNumber`, `orderDate` (`@date`), `storeKey`, `quantity` (`@int`) and `netPrice` (`@decimal`).',
      },
      {
        do: 'Review it as the rules say. Is every SQL name mapped with `column:`? Is `primaryKey` empty? Is there a relationship to `Store`?',
        file: LAKE_SALES,
        find: 'storeKey!: number;',
        see: 'Yes, yes, and no relationship, even though both tables have `storeKey`.',
        why: 'Relationships come only from foreign keys in the metadata, never from matching column names. In Power BI terms: a model with two tables and no relationship. To see countries and order lines together, we join them ourselves.',
      },
      {
        do: 'Replace the placeholder: open `rayfin/connectors/lake/schema.ts`, click **Show me in the code** to select all of it, and paste this over it:',
        code: C.LAKE_SCHEMA,
        file: LAKE_SCHEMA_FILE,
        edits: [{ file: LAKE_SCHEMA_FILE, from: sqlPlaceholder('lake', 'fabric-sqlanalytics'), to: C.LAKE_SCHEMA }],
        see: 'No red lines.',
        why: 'Three things the app imports: the entity types, `LakeSchema` (what the connector can do) and `connectorConfig`. `entities` lists each entity\'s property names, not the SQL column names. `as const satisfies` keeps the exact values (`\'fabric-sqlanalytics\'`, `\'read\'`), which decide which methods exist.',
      },
    ],
    summary: [
      'One entity per table, from the metadata only: no invented keys and no guessed relationships.',
      'The schema file replaces the placeholder: it exports the entity types, `LakeSchema` and `connectorConfig`.',
      'An agent\'s entity files are checked against the same rules: column names, keys, relationships.',
    ],
    fabric: {
      text: 'Rayfin\'s docs keep a prompt for agents that generate these files, and its rules make a good review checklist. After an entity change on a deployed app, `npx rayfin up connector apply --name lake` sends it.',
      links: [rayfin.entityGeneration, learn.entityConnector, rayfin.sqlSources],
    },
  },

  // ================================================================== Rows, not measures
  {
    id: 'lakehouse-rows',
    title: 'Rows on a page',
    goal: 'wire the lakehouse connector into the app and list the order lines behind a number',
    builds: ['lakehouse-entities', 'pages'],
    pbi: 'A drill-through page: the order lines behind a country\'s total, newest first.',
    idea: 'We wire `lake` into the app by hand, write a small hook that waits for a promise, and add an **Order lines** page.',
    steps: [
      {
        do: 'Take the wiring file over: in `packages/frontend/src/lib/connectors.ts`, delete the marked line.',
        file: CONNECTORS,
        find: LAKE_MARKER.trim(),
        edits: [{ file: CONNECTORS, from: LAKE_MARKER, to: '' }],
        see: 'Nothing changes on the page. From now on, `connector add` leaves the file alone and prints the wiring for us to merge.',
        why: 'The template\'s connectors skill: once you have written a lakehouse\'s entities, take the file over and add the connector yourself. Don\'t run `connector add --yes` again: it would replace your `schema.ts` with a placeholder.',
      },
      {
        do: 'Import the lakehouse\'s schema: add this line under the marked `pareto` import.',
        code: LAKE_WIRE_IMPORT.trim(),
        edits: [{ file: CONNECTORS, from: PARETO_WIRE_IMPORT, to: PARETO_WIRE_IMPORT + LAKE_WIRE_IMPORT }],
        see: 'Nothing changes.',
      },
      {
        do: 'In `AppConnectorsSchema`, add a line under the marked `\'pareto\'` one:',
        code: "'lake': lakeSchema;",
        edits: [{ file: CONNECTORS, from: "  'pareto': paretoSchema;\n", to: "  'pareto': paretoSchema;\n  'lake': lakeSchema;\n" }],
        errors: 2,
        see: 'Two red lines, under `connectorConfigs` and in the client that reads it: `lake` is missing.',
        why: '`connectorConfigs` must have every connector in the schema type, under the same name. TypeScript points at the gap.',
      },
      {
        do: 'In `connectorConfigs`, add the lakehouse under the marked `\'pareto\'` line:',
        code: "'lake': lakeConfig,",
        edits: [{ file: CONNECTORS, from: "  'pareto': paretoConfig,\n", to: "  'pareto': paretoConfig,\n  'lake': lakeConfig,\n" }],
        see: 'The red lines go.',
        why: 'No `connectorRuntimes` entry this time: the skill says a lakehouse needs none. Its rows arrive as plain JSON, with nothing to decode, unlike a semantic model\'s answer.',
      },
      newFile(USE_LOAD, 'First, a hook that waits for any promise. Hooks go in `packages/frontend/src/hooks`: '),
      {
        do: 'Paste the hook into it:',
        code: C.LAKE_HOOK,
        edits: [{ file: USE_LOAD, from: '', to: C.LAKE_HOOK }],
        see: 'No red lines.',
        why: 'A lakehouse call doesn\'t return a `status`, as `executeQuery` does: it gives the rows, or it throws. So the hook catches the error and turns it into a state, as **Failure** taught. `key` plays the part of the dependency list from **The redraw trap**.',
      },
      {
        do: 'Look at the marked `let live = true;` in `useLoad`.',
        file: USE_LOAD,
        find: 'let live = true;',
        see: '`live` is checked before every `setState`.',
        why: '`Loaded<T>` is the three states from **Failure** for any kind of value. `live` ignores an answer that arrives after the page has moved on (React runs the returned function when `key` changes or the page closes).',
      },
      newFile(LAKE_TS, 'The lakehouse reads are code the pages share, so they go in `packages/frontend/src/lib`: '),
      {
        do: 'Paste the two reads into it:',
        code: C.LAKE_QUERIES,
        edits: [{ file: LAKE_TS, from: '', to: C.LAKE_QUERIES }],
        see: 'No red lines.',
        why: 'The chain reads like a query: `select` the columns, `where` to filter, `orderBy`, `first` for the row count, then `execute`. Two calls, because the tables have no relationship: the first finds France\'s store keys, the second the lines in those stores.',
      },
      {
        do: 'Add the page as **Order lines**: **Do it for me** writes `packages/frontend/src/LinesPage.tsx` and adds the page to the report (page id, import and `PAGES` entry); this is the line it adds to `PAGES`:',
        code: "lines: { title: 'Order lines', Component: LinesPage },",
        edits: [
          { file: LINES, from: '', to: C.LINES_PAGE },
          { from: "type PageId = 'overview' | 'years' | 'agent' | 'pareto';", to: "type PageId = 'overview' | 'years' | 'agent' | 'pareto' | 'lines';" },
          { from: PAGES_PARETO, to: `${PAGES_PARETO}  lines: { title: 'Order lines', Component: LinesPage },\n` },
          { from: IMPORT_PARETO, to: `${IMPORT_PARETO}import LinesPage from './LinesPage';\n` },
        ],
        see: '**Order lines** in the page list.',
      },
      {
        do: 'Click **Order lines**.',
        point: 'preview',
        see: '20 lines for France, newest first: 12/31/2023 at the top. The Log shows two lakehouse reads.',
      },
      {
        do: 'A slip on purpose: in `packages/frontend/src/LinesPage.tsx`, replace the marked date with `{line.orderDate.toLocaleDateString(\'en-US\', { timeZone: \'UTC\' })}`.',
        file: LINES,
        edits: [{ file: LINES, from: C.LINES_DATE, to: C.LINES_DATE_SLIP }],
        errors: 1,
        see: 'A red line: `toLocaleDateString` does not exist on type `string | Date`.',
        why: 'Dates come back as they were sent: maybe a `Date`, maybe text. `new Date(…)` makes a date out of either. (`timeZone: \'UTC\'`: a date with no time is read as midnight UTC, so the day stays the same everywhere.)',
      },
      {
        do: UNDO,
        edits: [{ file: LINES, from: C.LINES_DATE_SLIP, to: C.LINES_DATE }],
        see: 'The red line goes.',
      },
      {
        do: 'Another slip on purpose: in `packages/frontend/src/lib/lake.ts`, delete the marked `.select([\'storeKey\'])` line in `storeKeysIn`.',
        file: LAKE_TS,
        edits: [{ file: LAKE_TS, from: "    .select(['storeKey'])\n", to: '' }],
        see: 'No red line. The page starts again on **Overview**: open **Order lines**, and it shows its error panel: **A read requires an explicit .select([...]).**',
        why: 'A query chain must say which columns it wants (`SELECTION_REQUIRED`). The default list in `connectorConfig.entities` never applies to a chain.',
      },
      {
        do: UNDO,
        edits: [{ file: LAKE_TS, from: "  const stores = await client.connectors.lake.Store\n    .where(", to: "  const stores = await client.connectors.lake.Store\n    .select(['storeKey'])\n    .where(" }],
        see: 'The lines are back.',
      },
      {
        do: 'In a real project, this is where the connector goes live:',
        run: 'npx rayfin up connector apply --name lake',
        point: 'terminal',
        see: 'The playground says what the real command does.',
        why: '`rayfin dev` doesn\'t wire connectors. `connector apply` sends the connector\'s entities to the deployed app, which must exist already: we deployed in **Take it to Fabric**. Rayfin marks the command as Preview.',
      },
    ],
    summary: [
      'A lakehouse connector goes in `configs` only: no `runtime` entry.',
      'Read it with `select`, `where`, `orderBy`, `first` and `execute`: it returns rows, or throws. Without `select`, it throws.',
      'Dates arrive as `Date | string`: make a `Date` before using one.',
    ],
    fabric: {
      text: 'On Fabric, a read goes to the app\'s backend, which queries the lakehouse\'s SQL analytics endpoint. Rayfin\'s docs say to prove a connector with a real query from the deployed app before building more on it.',
      links: [rayfin.clientSetup, rayfin.sqlRead, learn.query],
    },
  },

  {
    id: 'rows-or-measures',
    title: 'Rows or measures',
    goal: 'tell which numbers come from the lakehouse and which from the model',
    builds: ['lakehouse-rows', 'measure-or-query'],
    pbi: 'In a report, a total comes from a measure over every row the filters allow. Nobody adds up a table visual\'s rows by hand.',
    idea: 'We try to get France\'s 2023 revenue from the lakehouse rows, and compare it with the model\'s `[Revenue]`. A slip on purpose, the kind an agent makes.',
    steps: [
      {
        do: 'A slip on purpose: at the end of `packages/frontend/src/lib/lake.ts`, add a revenue total over the lines:',
        code: C.REVENUE_ONE_PAGE.trimStart(),
        edits: [{ file: LAKE_TS, from: LATEST_LINES_END, to: LATEST_LINES_END + C.REVENUE_ONE_PAGE }],
        see: 'No red lines.',
      },
      {
        do: 'Show it on the page: **Do it for me** adds a **Revenue (from lines)** card to `packages/frontend/src/LinesPage.tsx` (two imports, the hook line, the card).',
        code: C.REVENUE_CARD.trim(),
        edits: [
          { file: LINES, from: IMP_ERR, to: IMP_ERR + COMP_IMPORT },
          { file: LINES, from: "import { latestLines, storeKeysIn } from './lib/lake';", to: "import { latestLines, revenueFromLines, storeKeysIn } from './lib/lake';" },
          { file: LINES, from: LINES_HOOK, to: LINES_HOOK + C.REVENUE_HOOK },
          { file: LINES, from: LINES_END, to: `      </section>\n${C.REVENUE_CARD}    </div>\n  );\n}\n` },
        ],
        see: 'The page starts again on **Overview**. Open **Order lines**: **Revenue (from lines)**, 142.3K.',
      },
      {
        do: 'Open **Overview**, pick **2023** on the slicer, and click **France** on the countries chart.',
        point: 'preview',
        see: 'Its **Revenue** card: 369K. Far apart.',
        why: 'The lakehouse holds France\'s 2023 lines only, so this is the same slice. The model\'s `[Revenue]` is `SUMX ( sales, sales[Quantity] * sales[NetPrice] )`: the same formula the page used.',
      },
      {
        do: 'In the **Log**, click the `lake.Sales` read with 100 rows (it selects `quantity` and `netPrice`: the one behind the card).',
        point: 'log',
        see: 'It returned exactly 100 rows, though France has more lines.',
        why: '`execute()` returns one [[page of rows|page-of-rows]], 100 by default, and doesn\'t say there are more. No red line, no error: just a wrong total.',
      },
      {
        do: 'Page through every line instead: click **Show me in the code** to select `revenueFromLines`, and paste this over it.',
        code: C.REVENUE_PAGED.trimStart(),
        file: LAKE_TS,
        edits: [{ file: LAKE_TS, from: C.REVENUE_ONE_PAGE, to: C.REVENUE_PAGED }],
        see: 'Open **Order lines** again: 369K, as on **Overview**. In the Log: three `lake.Sales` reads for the card, of 100, 100 and 83 rows.',
        why: '`executePaginated()` returns a page with `hasNextPage` and `endCursor`; `after(endCursor)` asks for the next one, with the same `select`, `where` and a stable `orderBy`. Now the numbers match, because the page copies the model\'s formula: a second copy, which can drift without a warning.',
      },
      {
        do: 'Keep totals in the model: **Do it for me** takes the card and `revenueFromLines` out again.',
        edits: [
          { file: LINES, from: IMP_ERR + COMP_IMPORT, to: IMP_ERR },
          { file: LINES, from: "import { latestLines, revenueFromLines, storeKeysIn } from './lib/lake';", to: "import { latestLines, storeKeysIn } from './lib/lake';" },
          { file: LINES, from: LINES_HOOK + C.REVENUE_HOOK, to: LINES_HOOK },
          { file: LINES, from: `      </section>\n${C.REVENUE_CARD}    </div>\n  );\n}\n`, to: LINES_END },
          { file: LAKE_TS, from: C.REVENUE_PAGED, to: '' },
        ],
        done: { file: LAKE_TS, absent: 'revenueFromLines' },
        see: '**Order lines** shows only the lines; **Overview** keeps the totals.',
        why: 'Fetching every row to add it up is slow on a big table. The lakehouse can sum on its side with `aggregate`, but one numeric column per entry: no quantity × net price in one call. Totals belong to the model\'s measures; the lakehouse gives the detail behind them.',
      },
    ],
    summary: [
      'Totals come from the model\'s measures, and the detail behind them from rows.',
      '`execute()` stops at one page, 100 rows by default, without a word. `executePaginated()` and `after()` page through the rest.',
      'A total computed on the page copies a formula the model already owns.',
    ],
    fabric: {
      text: 'Rayfin lists one-page reads as a known limitation of its data layer (Data API Builder): a longer list is silently cut. Aggregations run on the source, one numeric column per entry.',
      links: [rayfin.onePage, rayfin.sqlAggregate],
    },
  },

  {
    id: 'who-runs-it',
    title: 'Who runs this query',
    goal: 'say whose permissions a lakehouse query runs with, and how to change it safely',
    builds: ['rows-or-measures', 'to-fabric'],
    pbi: 'Like a data source with stored credentials versus single sign-on. With stored credentials, every viewer sees what that one account sees. With single sign-on, each viewer\'s own access counts.',
    idea: 'Our semantic models run as the person using the app; the lakehouse runs as the app\'s owner. We look at both kinds, try a write, then see what re-adding the lakehouse as `delegated` would do, with a slip on the way, and keep `application`.',
    steps: [
      {
        do: 'Open `rayfin/rayfin.yml` and look at the `lake` connector\'s `auth`.',
        file: YML,
        find: '      type: application',
        see: '`type: application`.',
        why: 'Every lakehouse query runs as the app\'s identity, the owner of the app. Everyone using the app sees the same rows, and any row-level security in the lakehouse is checked against the app\'s owner, not against them.',
      },
      {
        do: 'Now look at the `contoso` connector\'s `auth`.',
        file: YML,
        find: '      type: delegated',
        see: '`type: delegated`.',
        why: 'Semantic model connectors only run as the person using the app, so each person needs Read and Build permission on the model.',
      },
      {
        do: 'In the **Log**, click a `contoso` query and a `lake` read to open them.',
        point: 'log',
        see: '`runs as: the signed-in user (delegated)` and `runs as: the app owner (application)`.',
        why: 'The playground prints this line; a real app doesn\'t. `connector add` and `inspect` ran as you, the developer: discovery and the running app use different identities.',
      },
      {
        do: 'A slip on purpose: at the end of `packages/frontend/src/lib/lake.ts`, add a write:',
        code: C.ADD_LINE.trimStart(),
        edits: [{ file: LAKE_TS, from: LATEST_LINES_END, to: LATEST_LINES_END + C.ADD_LINE }],
        errors: 1,
        see: 'A red line under `create`: it does not exist on the lakehouse\'s `Sales`.',
        why: '`operations: [\'read\']` in `connectorConfig` leaves only the read methods. The types are a help, not the lock: the lock is the connector\'s operations (a call that gets past the types is refused with `OPERATION_NOT_ALLOWED`) and the lakehouse itself, which is read-only.',
      },
      {
        do: UNDO,
        edits: [{ file: LAKE_TS, from: C.ADD_LINE, to: '' }],
        see: 'The red line goes.',
      },
      {
        do: 'Try `delegated`: add the connector again with `--auth delegated`, without `--yes`, and answer yes to its question:',
        run: LAKE_READD,
        point: 'terminal',
        see: '`type: delegated` for `lake` in `rayfin.yml`. The CLI says it kept our `schema.ts`, and warns that `connectors.ts` has manual edits: `lake` is already in it, so there is nothing to merge.',
        why: 'Re-adding rewrites the connector\'s entry in `rayfin.yml`, and keeps a `schema.ts` that exists. With `--yes` it would skip the question and also replace our hand-written `schema.ts` with a placeholder: the connectors skill says never to re-add with `--yes` once the entities are written.',
      },
      {
        do: 'Put it back: add it again with `--auth application`, and answer yes:',
        run: LAKE_READD_APP,
        point: 'terminal',
        see: '`lake` is `application` again, and `schema.ts` is still ours.',
        why: 'Without `--auth`, re-adding uses the connector type\'s default, which is `application` for a lakehouse (the `connector add` reference). Always say which one you mean.',
      },
      {
        do: 'Which to choose? Read this card.',
        see: '`application`: one shared view, and the app\'s owner needs access to the lakehouse. `delegated`: each person sees what they may see at the source, and each needs their own access.',
        why: 'Rayfin\'s docs: don\'t choose `application` for per-user access control. For shared sales lines that everyone may see, `application` is a fair choice; we keep it. **Who is using it**, a later chapter, comes back to identities for every part of the app.',
      },
    ],
    summary: [
      'A lakehouse connector runs as the app\'s owner unless you choose `delegated`; a semantic model connector always runs as the person using the app.',
      'A lakehouse connector has no write methods: its operations are `read`, and the source is read-only.',
      'Re-adding resets `auth` unless you pass `--auth`, and `--yes` replaces your `schema.ts`.',
    ],
    fabric: {
      text: 'Changing the identity grants no permission: with `application`, give the app\'s identity access to the lakehouse; with `delegated`, each user needs their own. Microsoft Learn: client-side types aren\'t an authorization boundary; limit operations and use `@role`.',
      links: [rayfin.connectorAuth, learn.secureConnector, learn.addConnector],
    },
  },
  // ================================================================== Chapter 4: Store your own data
  // ================================================================== Model it
  {
    id: 'data-service',
    title: 'Turn on the data service',
    goal: 'give the app a database of its own',
    builds: ['to-fabric', 'lakehouse-connector'],
    pbi: 'So far every number was borrowed: the model\'s and the lakehouse\'s. Sales targets don\'t exist anywhere yet. The app will own them, in a database of its own, a bit like a translytical task flow writing to a SQL database in Fabric, except that here the app creates and keeps the database.',
    idea: 'Our story from here on: country managers set sales targets, a director signs them off, and reports show actuals against targets. First, the app needs somewhere to keep them. One of the template\'s packs turns the [[data service|data-service]] on; then we look at where the data will live.',
    steps: [
      {
        do: 'Open `rayfin/rayfin.yml` and find the marked `data:` under `services`.',
        file: YML,
        find: '  data:',
        see: '`enabled: false`, with `path: packages/data`.',
        why: 'Microsoft Learn: in the default template, Data is opt-in. It stays off until the app needs to keep records of its own.',
      },
      {
        do: 'Turn it on with the template\'s data-modeling pack:',
        run: 'npm run pack:add -- data-modeling',
        point: 'terminal',
        see: '`data.enabled = true` and `data.dialect = mssql` in `rayfin.yml`, and three files copied: a starter entity, `packages/data/src/Item.ts`, and the two `index.ts` files that register it.',
        why: 'Microsoft Learn names this pack as the way to turn Data on in the default template. Without `dialect: mssql`, Rayfin stops with "Dialect is required when Data module is enabled". No packages to install: the template already lists them.',
      },
      {
        do: 'Open `packages/data/src/Item.ts`, the starter, and find the marked `@role`.',
        file: DATA_ITEM_FILE,
        find: "@role('authenticated', '*', {",
        see: 'A small table of to-do items. Each row has an `owner_id`, and the policy lets a signed-in person reach only their own rows.',
        why: 'The data-modeling skill says to start from it, or to replace it with the real model. We write our own entity in the next lesson, and register it in place of `Item`.',
      },
      {
        do: 'Open `packages/frontend/package.json` and find the marked `@microsoft/rayfin-data`.',
        file: 'packages/frontend/package.json',
        find: '"@microsoft/rayfin-data"',
        see: '`@microsoft/rayfin-data` and `@microsoft/rayfin-core` are already in `dependencies`.',
        why: 'The template lists them, and `npm create` installed them. That is why the pack had nothing to install.',
      },
      {
        do: 'Where will the data live? Read this card.',
        see: 'When we apply our [[schema|schema-apply]], Rayfin creates tables in the app\'s own SQL database, which belongs to the Fabric app item. The page reaches it through the app\'s data API (Data API builder), as the person signed in.',
        why: 'The tables come from our code, so we change them with Rayfin commands, not in the Fabric portal: Microsoft Learn warns that changes made there are overwritten at the next deploy. A connector can\'t point at this database: `connector add` rejects it. Connectors are for data the app doesn\'t own.',
      },
      {
        do: 'Look at the new **Data** tab, beside **Queries**.',
        point: 'data',
        see: 'No tables yet. The tab will show each table, its rows, and who may do what. In the top bar: **Signed in as: Alice**.',
        why: 'Both are the playground\'s. The Data tab shows every row, whatever the permissions: no real app has this view. Sign-in is simulated too: on Fabric, people sign in with Microsoft Entra ID, and **Who is using it** comes back to it.',
      },
    ],
    summary: [
      'The data-modeling pack turns the data service on (`enabled: true`, `dialect: mssql`) and plants a starter entity.',
      'The database belongs to the Fabric app item, and its tables come from code.',
      'Connectors are for data the app doesn\'t own; they can\'t point at the app\'s own database.',
    ],
    fabric: {
      text: 'In a real project, `rayfin dev` applies the declared schema when it starts, and `npx rayfin up` deploys it with the app. The app\'s SQL database is one of the app item\'s child services.',
      links: [learn.dataModels, rayfin.data, rayfin.childServices, rayfin.ymlData],
    },
  },

  {
    id: 'sales-target',
    title: 'Model a sales target',
    goal: 'write an entity with field decorators and an explicit permission',
    builds: ['data-service', 'lakehouse-entities'],
    pbi: 'Like designing a table: columns, data types, which ones are required. The [[decorators|decorator]] are the table design.',
    idea: 'One class, `SalesTarget`: a country, a year, an amount. Then a slip that shows why every entity names its permissions.',
    steps: [
      {
        do: 'Click **+ New file**, at the top of the file list, and type `packages/data/src/SalesTarget.ts` in place of the `packages/frontend/src/` already there.',
        edits: [{ file: TARGET, from: '', to: '' }],
        point: 'files',
        see: 'A new, empty `SalesTarget.ts`, in the data package beside `Item.ts` and `index.ts`, open in the editor.',
      },
      {
        do: 'Paste the import into it:',
        code: C.TARGET_IMPORTS.trim(),
        edits: [{ file: TARGET, from: '', to: C.TARGET_IMPORTS }],
        see: 'No red lines.',
        why: 'The same package as the lakehouse entities, `@microsoft/rayfin-core`, with more decorators: `uuid` for the key, `authenticated` for who may do what.',
      },
      {
        do: 'Under the import, add the class:',
        code: C.TARGET_CLASS.trim(),
        edits: [{ file: TARGET, from: C.TARGET_IMPORTS, to: C.TARGET_IMPORTS + C.TARGET_CLASS }],
        see: 'No red lines.',
        why: 'Each decorator sets a column\'s type and rules: text up to 50 characters, a whole number from 2023 to 2030, an amount with two decimals. No `Source` this time: Rayfin creates the table. `id` is the key, generated on create. The `!` tells TypeScript the value is filled in for us.',
      },
      {
        do: 'Look at the marked `@authenticated(\'*\')`.',
        file: TARGET,
        find: "@authenticated('*')",
        see: 'Every signed-in person may create, read, update and delete every target. For now.',
        why: '`\'*\'` means all four actions. **Who is using it** narrows it down.',
      },
      {
        do: 'A slip on purpose: delete the marked `@authenticated(\'*\')` line.',
        file: TARGET,
        edits: [{ file: TARGET, from: C.TARGET_RULE_ALL, to: '' }],
        see: 'No red line.',
      },
      {
        do: 'In the **Data** tab, look at **Access** for `SalesTarget`.',
        point: 'data',
        see: 'It still says: any signed-in person: create, read, update and delete.',
        why: 'An entity with no permission decorator isn\'t locked: it silently gets full access for every signed-in person (Rayfin\'s docs). So we name the permissions on every entity, even when the default looks right.',
      },
      {
        do: UNDO,
        edits: [{ file: TARGET, from: '@entity()\nexport class SalesTarget', to: `@entity()\n${C.TARGET_RULE_ALL}export class SalesTarget` }],
        see: 'The decorator is back. **Access** looks the same, but now it\'s written down.',
      },
    ],
    summary: [
      'An entity is a class with a decorator per field: type, length, range, required or not.',
      '`id` is the key, and the server generates it.',
      'With no permission decorator, every signed-in person gets full access, so always write one.',
    ],
    fabric: {
      text: 'Rayfin\'s docs: start every entity with an explicit permission decorator, and never rely on the default.',
      links: [rayfin.modeling, rayfin.fieldTypes, rayfin.noDecorator],
    },
  },

  {
    id: 'register-apply',
    title: 'Register and apply',
    goal: 'register the entity, apply the schema, and check that it really arrived',
    builds: ['sales-target'],
    pbi: 'Like publishing a model change: the definition is ready, but nothing changes in the service until it\'s applied, and a successful publish doesn\'t prove the report works yet.',
    idea: 'We list the entity in the schema, [[apply|schema-apply]] it, and check the deployment. Then a slip that a successful apply hides.',
    steps: [
      {
        do: 'Open `packages/data/src/index.ts`, beside `SalesTarget.ts`: the template\'s list of the app\'s entities.',
        file: DATA_SCHEMA,
        find: 'export const schema = [Item];',
        point: 'files',
        see: 'The starter\'s registration: `Item`, exported, and listed in the array `schema`. The type, `UniversalAppSchema`, comes from the shared package.',
      },
      {
        do: 'Replace everything in it with this (select all, then paste):',
        code: C.DATA_SCHEMA,
        edits: [{ file: DATA_SCHEMA, from: DATA_KIT_INDEX, to: C.DATA_SCHEMA }],
        see: 'No red lines.',
        why: '`schema` is the list Rayfin\'s docs ask you to keep, and the class is exported too. `db apply` reads only what this file exports, so `Item` now stays out of the database. (The data-modeling skill says to remove an unused starter: you can delete `Item.ts` from the file list.)',
      },
      {
        do: 'Now the type the browser\'s client reads: replace everything in `packages/shared/src/index.ts` with this.',
        code: C.SHARED_SCHEMA,
        file: SHARED_SCHEMA,
        edits: [{ file: SHARED_SCHEMA, from: SHARED_KIT_INDEX, to: C.SHARED_SCHEMA }],
        see: 'No red lines.',
        why: 'Two lists, kept in step: the record in the shared package (`UniversalAppSchema`, for the client\'s types; Rayfin\'s docs call theirs `AppSchema`) and the array `schema` in the data package. The shared package holds no decorated class, so the browser can use it: the data-modeling skill keeps the two apart this way. Every new entity goes in both. As in **Entities from the metadata**, the data package\'s own imports end in `.js`.',
      },
      {
        do: 'Apply the schema:',
        run: DB_APPLY,
        point: 'terminal',
        see: '`create table for SalesTarget (…)`, and its permissions. The **Data** tab shows `SalesTarget`, with no rows.',
        why: 'Writing a class changes nothing until it\'s applied. `db apply` builds the data package and reads the entities its `index.ts` exports (by name, or in an array such as `schema`). It applies only the database part (tables and permissions) to an app that already exists: we deployed in **Take it to Fabric**.',
      },
      {
        do: 'Check the deployment:',
        run: 'npx rayfin up status',
        see: 'Healthy.',
        why: 'Rayfin\'s docs warn that a successful apply doesn\'t guarantee the data API can read the entity yet. Check the status before testing.',
      },
      {
        do: 'A slip on purpose: in `SalesTarget.ts`, change the marked `@text({ max: 50 })` to `@text()`.',
        file: TARGET,
        edits: [{ file: TARGET, from: C.COUNTRY_TEXT, to: C.COUNTRY_TEXT_SLIP }],
        see: 'No red line.',
      },
      {
        do: 'Apply again:',
        run: DB_APPLY,
        see: 'It reports success: `country` becomes `NVARCHAR(MAX)`.',
        why: 'Wider text loses nothing, so nothing stops it.',
      },
      {
        do: 'In the **Data** tab, press **Read SalesTarget**.',
        point: 'data',
        see: '"Internal server error".',
        why: 'Text with no `max` becomes `NVARCHAR(MAX)` in the database, which can break the data API\'s schema. It shows up only now, after a successful apply. The playground replays the failure Rayfin\'s docs describe.',
      },
      {
        do: 'Put the length back: change `@text()` to `@text({ max: 50 })`.',
        file: TARGET,
        edits: [{ file: TARGET, from: C.COUNTRY_TEXT_SLIP, to: C.COUNTRY_TEXT }],
      },
      {
        do: 'Apply again:',
        run: DB_APPLY,
        commandFails: true,
        see: 'Stopped: `country` would get narrower, which is potentially destructive. Nothing was applied.',
        why: 'Going from unlimited text to 50 characters could cut data, so the command lists what it would do and stops.',
      },
      {
        do: 'The table is empty, so nothing can be lost. Apply with `--force`:',
        run: `${DB_APPLY} --force`,
        see: 'Applied. **Read SalesTarget** now returns an empty list.',
        why: '`--force` only after reading what it lists. On a table with data, think twice.',
      },
    ],
    summary: [
      'Register each entity twice: its record in `UniversalAppSchema` (the shared package) and its class in the `schema` array (the data package).',
      '`db apply` changes the database; `up status` checks the deployment. Neither proves every query works.',
      'Every `@text()` needs a `max`. `--force` only after reading what it lists.',
    ],
    fabric: {
      text: 'Rayfin\'s fix for the `NVARCHAR(MAX)` failure is the one we used: add `max`, then `npx rayfin up db apply --force`. During development, restarting `npm run dev` applies the declared schema too.',
      links: [rayfin.migrations, rayfin.textMax, learn.applySchema],
    },
  },

  // ================================================================== Use it
  {
    id: 'read-write',
    title: 'Read and write targets',
    goal: 'list, add and change targets from a page',
    builds: ['register-apply', 'lakehouse-rows'],
    pbi: 'A table visual you can type into. The data API checks every write against the entity\'s permissions, as row-level security checks every query.',
    idea: 'The template\'s client already has a data service. We read the targets with the query chain from **Rows on a page**, and add a **Targets** page that can add and change them.',
    steps: [
      {
        do: 'Open `packages/frontend/src/lib/rayfin-client.ts` and look at the marked data service.',
        file: CLIENT,
        find: 'data: dataService<UniversalAppSchema>(),',
        see: 'The template\'s client already has the data service, typed by `UniversalAppSchema`. Now that the shared package lists `SalesTarget`, so does `client.data`.',
        why: 'In the default template the client comes with it: we only register the entity, in the data and shared packages.',
      },
      {
        do: 'Click **+ New file**, at the top of the file list, and type `lib/targets.ts` after the `packages/frontend/src/` already there.',
        edits: [{ file: TARGETS_TS, from: '', to: '' }],
        point: 'files',
        see: 'A new, empty `packages/frontend/src/lib/targets.ts`, open in the editor.',
      },
      {
        do: 'Paste a read into it:',
        code: C.TARGETS_LOAD,
        edits: [{ file: TARGETS_TS, from: '', to: C.TARGETS_LOAD }],
        see: 'No red lines.',
        why: 'The same chain as the lakehouse: `select`, `where`, `orderBy`, `execute`. `execute()` returns one page (100 rows), which is plenty here: we add one target per country and year (nothing enforces that: the `unique` option on a field covers that one field, and Rayfin\'s guide says a rule over two fields is a unique constraint you add in the database itself).',
      },
      {
        do: 'Add the page: **Do it for me** writes `packages/frontend/src/TargetsPage.tsx` and adds it to the report as **Targets** (page id, `PAGES` entry and import).',
        code: "targets: { title: 'Targets', Component: TargetsPage },",
        edits: [
          { file: TARGETS_PAGE, from: '', to: C.TARGETS_PAGE },
          { from: "type PageId = 'overview' | 'years' | 'agent' | 'pareto' | 'lines';", to: "type PageId = 'overview' | 'years' | 'agent' | 'pareto' | 'lines' | 'targets';" },
          { from: "  lines: { title: 'Order lines', Component: LinesPage },\n", to: "  lines: { title: 'Order lines', Component: LinesPage },\n  targets: { title: 'Targets', Component: TargetsPage },\n" },
          { from: "import LinesPage from './LinesPage';\n", to: "import LinesPage from './LinesPage';\nimport TargetsPage from './TargetsPage';\n" },
        ],
        see: 'Click **Targets** in the page list: "No targets for 2026 yet." The Log shows the read, and who it ran as.',
      },
      {
        do: 'At the end of `packages/frontend/src/lib/targets.ts`, add the writes:',
        code: C.TARGETS_WRITES.trimStart(),
        edits: [{ file: TARGETS_TS, from: C.TARGETS_LOAD, to: C.TARGETS_LOAD + C.TARGETS_WRITES }],
        see: 'No red lines.',
        why: '`create` gets the fields, but no `id`: the server makes one. `update` changes only the fields we send, and finds the row by `id` only. Both return the key plus the fields we sent, not the whole row.',
      },
      {
        do: 'Let the page use them: **Do it for me** gives **Targets** an **Add** form and an **Edit** button on each row.',
        file: TARGETS_PAGE,
        edits: [{ file: TARGETS_PAGE, from: C.TARGETS_PAGE, to: C.TARGETS_PAGE_EDIT }],
        see: 'The form on the right.',
        why: 'After each write, `saved` goes up by one. It\'s part of the load key, so the list loads again, as a new key did in **Rows on a page**. A refused write shows its message.',
      },
      {
        do: 'How does **Add** call the write? Read this card.',
        file: TARGETS_PAGE,
        find: 'save(() => addTarget(country, year, Number(amount)))',
        see: '`save(() => addTarget(…))` hands `save` a function to run later, so one `save` can run any write, then load the list again.',
        why: 'The same `save` runs `changeTarget` for **Edit**. It also catches a refused write and shows its message, and after a successful one it empties the form.',
      },
      {
        do: 'On **Targets**, type `Germany` and `3000000`, and press **Add**.',
        point: 'preview',
        see: 'The row appears: Germany, 3,000,000. The **Data** tab shows one row, and the **Log** the create.',
      },
      {
        do: 'A slip on purpose: in `packages/frontend/src/lib/targets.ts`, delete `\'amount\', ` from the marked `select` list.',
        file: TARGETS_TS,
        find: "    .select(['id', 'country', 'year', 'amount'])",
        edits: [{ file: TARGETS_TS, from: "    .select(['id', 'country', 'year', 'amount'])", to: "    .select(['id', 'country', 'year'])" }],
        errors: 2,
        see: 'Red lines in `TargetsPage.tsx`, where the page reads `t.amount`.',
        why: 'A result has only the fields we select (with no `select` at all, only `id`). TypeScript knows, so reading an unselected field is a red line, not a quiet `undefined`.',
      },
      {
        do: UNDO,
        edits: [{ file: TARGETS_TS, from: "    .select(['id', 'country', 'year'])", to: "    .select(['id', 'country', 'year', 'amount'])" }],
        see: 'The red lines go.',
      },
      {
        do: 'Press **Edit** on the Germany row, type `3200000`, and press **Save**.',
        point: 'preview',
        see: '3,200,000 in the table. In the Log: an update with `amount` and `updatedAt`.',
      },
    ],
    summary: [
      'The template\'s client has the data service, typed by `UniversalAppSchema`; read with the same chain as the lakehouse.',
      '`create` and `update` take typed fields; writes return the key and what you sent.',
      'A result has only the fields you select: reading another one is a red line.',
    ],
    fabric: {
      text: 'On Fabric, each call goes to the app\'s data API as the person signed in, and the entity\'s permissions decide. Microsoft Learn\'s pages still show the 1.x client (`new RayfinClient<…>`); Rayfin 2.0 uses `RayfinClient.create` with `dataService`.',
      links: [rayfin.dataClient, rayfin.querying, rayfin.mutations],
    },
  },

  {
    id: 'change-model',
    title: 'Change the model',
    goal: 'add a field safely, and see why a rename costs data',
    builds: ['read-write', 'register-apply'],
    pbi: 'Like changing a table in a model that already has data: adding a column is easy, renaming one breaks what used it.',
    idea: 'An optional note on each target, with a slip on the way. Then a rename, and what it would do to our targets.',
    steps: [
      {
        do: 'A slip on purpose: in `SalesTarget.ts`, add a note on a new line under the marked `amount`:',
        code: C.NOTE_FIELD_SLIP.trim(),
        file: TARGET,
        edits: [{ file: TARGET, from: AMOUNT_FIELD, to: AMOUNT_FIELD + C.NOTE_FIELD_SLIP }],
        see: 'No red line.',
        why: 'The `?` tells TypeScript the note may be missing, so `addTarget` doesn\'t have to send one.',
      },
      {
        do: 'In the **Data** tab, look at the `note` column of `SalesTarget`.',
        point: 'data',
        see: '`note NVARCHAR(500) NOT NULL`, not applied yet.',
        why: 'The column would still be required. `?` changes only TypeScript: once applied, a target added without a note would be refused. Rayfin\'s docs: set `{ optional: true }` and mark the property `?`; either one alone is not enough.',
      },
      {
        do: 'Fix it: make the marked line `@text({ optional: true, max: 500 }) note?: string;`.',
        file: TARGET,
        edits: [{ file: TARGET, from: C.NOTE_FIELD_SLIP, to: C.NOTE_FIELD }],
        see: 'In the **Data** tab: `note NVARCHAR(500)`, nullable.',
      },
      {
        do: 'Apply it:',
        run: DB_APPLY,
        point: 'terminal',
        see: '`add column SalesTarget.note NVARCHAR(500)`. Nothing destructive.',
        why: 'A new optional column loses nothing: existing targets get no note.',
      },
      {
        do: 'A slip on purpose: rename the marked `amount` to `targetAmount`, here and in its shared record, as an agent would (**Do it for me** makes both).',
        file: TARGET,
        edits: [
          { file: TARGET, from: AMOUNT_FIELD, to: AMOUNT_RENAMED },
          { file: SHARED_SCHEMA, from: '  amount: number;\n', to: '  targetAmount: number;\n' },
        ],
        errors: '1+',
        see: 'Red lines in `packages/frontend/src/lib/targets.ts` and `packages/frontend/src/TargetsPage.tsx` wherever `amount` is used, and a few that follow from them.',
        why: 'TypeScript finds every place the old name is used. The database is another matter.',
      },
      {
        do: 'Apply it:',
        run: DB_APPLY,
        errors: '1+',
        commandFails: true,
        see: 'Stopped: `drop column SalesTarget.amount`. Nothing was applied.',
        why: 'The property names the column, so a rename is a dropped column and a new one, and the targets we typed would lose their amounts. Rayfin\'s docs list dropping a column as potentially destructive. Don\'t add `--force` here: to rename only the property, keep the column with `column: \'amount\'` (the fabric note below shows how).',
      },
      {
        do: UNDO,
        edits: [
          { file: TARGET, from: AMOUNT_RENAMED, to: AMOUNT_FIELD },
          { file: SHARED_SCHEMA, from: '  targetAmount: number;\n', to: '  amount: number;\n' },
        ],
        see: '`amount` again, the red lines go, and the database never changed.',
      },
    ],
    summary: [
      'Adding an optional field is safe. Optional means `optional: true` and `?`, together.',
      'A rename looks like a dropped column to the database, and the CLI stops to say so.',
      'TypeScript finds every use of a renamed field; the database keeps the old column until you apply.',
    ],
    fabric: {
      text: 'To rename only the property, keep the column: `@decimal({ precision: 18, scale: 2, column: \'amount\' }) targetAmount!: number;` (rayfin.ai: Modeling). To rename the column itself, plan it: add the new field, copy the values, then drop the old one.',
      links: [rayfin.modeling, rayfin.nullable, rayfin.migrations],
    },
  },

  // ================================================================== Chapter 5: Who is using it
  // ================================================================== Sign-in and claims
  {
    id: 'signed-in-as',
    title: 'Signed in as',
    goal: 'show who is signed in, and follow changes',
    builds: ['read-write', 'slicer'],
    pbi: 'Like **View as** in Power BI: test a report as someone else. Here the playground\'s **Signed in as** switch plays that part.',
    idea: 'Every call to our own data runs as the person signed in. We show who that is on the page, and make the page notice when it changes.',
    steps: [
      {
        do: 'Click the **Signed in as: Alice** switch in the top bar.',
        point: 'signin',
        see: 'Four people: Alice, Carol, Bob and Dan.',
        why: 'Simulated. On Fabric, people sign in with Microsoft Entra ID through Fabric, and nobody can switch to someone else.',
      },
      {
        do: 'Click **+ New file**, at the top of the file list, and type `lib/session.ts` after the `packages/frontend/src/` already there.',
        edits: [{ file: SESSION_TS, from: '', to: '' }],
        point: 'files',
        see: 'A new, empty `packages/frontend/src/lib/session.ts`, open in the editor.',
      },
      {
        do: 'Paste this into it:',
        code: C.SESSION_READ,
        edits: [{ file: SESSION_TS, from: '', to: C.SESSION_READ }],
        see: 'No red lines.',
        why: '`getSession()` says who is signed in right now. `isAuthenticated` is true only while the sign-in is still valid. `user` has an `id` and an `email`.',
      },
      {
        do: 'Show it: **Do it for me** adds `Signed in as {signedInEmail()}` above the page list in `App.tsx`, with its import.',
        edits: [
          { from: SESSION_ANCHOR_IMPORT, to: SESSION_ANCHOR_IMPORT + "import { signedInEmail } from './lib/session';\n" },
          { from: NAV_OPEN, to: NAV_OPEN + C.SIGNED_IN_ONCE },
        ],
        see: '"Signed in as alice@contoso.example".',
      },
      {
        do: 'Switch to Bob.',
        point: 'signin',
        see: 'The page still says Alice.',
        why: 'The page read the session once, when it drew, and didn\'t hear about the change. We need [[state]] that listens, as **State as a slicer** taught.',
      },
      newFile(USE_SESSION, 'Listening is a hook\'s job, so it gets a file in `packages/frontend/src/hooks`: ', {
        why: 'The template\'s own sign-in hooks are beside it, locked (`use-auth.tsx`, `auth.context.ts`): in a real project they run the Fabric sign-in. Ours only listens to Rayfin\'s session, which the playground simulates.',
      }),
      {
        do: 'Paste the hook into it:',
        code: C.USE_SESSION,
        edits: [{ file: USE_SESSION, from: '', to: C.USE_SESSION }],
        see: 'No red lines.',
        why: '`onSessionChange` calls us back at each sign-in, sign-out or refresh, and returns a function that stops listening. Returning it from `useEffect` stops it when the page goes away.',
      },
      {
        do: 'Use it: **Do it for me** makes the page list use `useSession()`, and takes `signedInEmail` out of `packages/frontend/src/lib/session.ts`: nothing uses it any more, and only the client import stays there for now.',
        edits: [
          { from: "import { signedInEmail } from './lib/session';\n", to: "import { useSession } from './hooks/use-session';\n" },
          { from: APP_PAGE_STATE, to: `${APP_PAGE_STATE}  const session = useSession();\n${C.SIGNED_IN_STATE}` },
          { from: C.SIGNED_IN_ONCE, to: C.SIGNED_IN_LIVE },
          { file: SESSION_TS, from: SESSION_ONCE_FN, to: '' },
        ],
        done: { file: SESSION_TS, absent: 'signedInEmail' },
        see: '"Signed in as bob@contoso.example". Switch to Carol, and it follows.',
      },
      {
        do: 'Read this card on [[claims|claim]].',
        see: 'A sign-in carries claims: `sub`, the person\'s id (the same value as `session.user.id`), `email`, and `role`.',
        why: 'Permissions compare claims with the fields of each row. `sub` stays the same for a person, so it\'s the one to store. It\'s still personal data: don\'t log it.',
      },
      {
        do: 'How does a real app sign in? Read this card.',
        see: 'A button calls `ensureSignedInWithFabric(…)` from `@microsoft/rayfin-auth-provider-fabric`, which opens a Fabric sign-in window. Inside the Fabric portal, `initEmbeddedAuth()` at startup signs in with no click.',
        why: 'The template comes with this, in `packages/frontend/src/services/rayfin-auth.service.ts`. The playground skips it, and signs in whoever the switch says.',
      },
    ],
    summary: [
      '`getSession()` says who is signed in; `onSessionChange` follows changes.',
      'A page that reads the session once doesn\'t notice a new one: keep it in state.',
      '`claims.sub` is the stable id that permissions compare.',
    ],
    fabric: {
      text: 'On Fabric, Microsoft Entra ID signs people in through Fabric single sign-on. `onSessionChange` is the callback: there is no `onAuthStateChange`.',
      links: [rayfin.sessions, rayfin.fabricSso, learn.authentication],
    },
  },

  {
    id: 'my-rows',
    title: 'My rows only',
    goal: 'stamp an owner on each row and let only the owner change it',
    builds: ['signed-in-as', 'change-model'],
    pbi: 'Like row-level security with `[Owner] = USERPRINCIPALNAME()`, except that RLS only filters what people read. Here each action has its own rule: everyone reads, only the owner changes.',
    idea: 'Each target gets an owner, stamped when it\'s added. Then a [[policy]] lets only the owner change it. And a slip that no red line catches.',
    steps: [
      {
        do: 'Empty the table first: in the **Data** tab, press **Delete all rows**.',
        point: 'data',
        see: '`SalesTarget`: no rows. (Undo is offered.)',
        why: 'We\'re adding a required field, and existing rows would have no value for it. What the real apply does with them isn\'t documented, so the playground stops if there are any. On a real project, decide what existing rows should get first.',
      },
      {
        do: 'In `SalesTarget.ts`, add an owner on a new line under the marked `updatedAt`. **Do it for me** also adds `owner_id: string;` to its record in `packages/shared/src/index.ts`, which the client is typed by.',
        code: C.OWNER_FIELD.trim(),
        file: TARGET,
        edits: [
          { file: TARGET, from: UPDATED_FIELD, to: UPDATED_FIELD + C.OWNER_FIELD },
          { file: SHARED_SCHEMA, from: C.SHARED_UPDATED, to: C.SHARED_UPDATED + C.SHARED_OWNER },
        ],
        errors: 1,
        see: 'A red line in `packages/frontend/src/lib/targets.ts`: `create` is missing `owner_id`.',
        why: 'The field is required, and TypeScript checks every create.',
      },
      {
        do: 'Stamp the person signed in: click **Show me in the code** to select `addTarget`, and paste this over it:',
        code: C.ADD_TARGET_STAMPED,
        file: TARGETS_TS,
        edits: [{ file: TARGETS_TS, from: C.ADD_TARGET, to: C.ADD_TARGET_STAMPED }],
        see: 'The red line goes.',
        why: '`session.user.id` is the value permissions see as `claims.sub`. Policies check the owner but never fill it in: the code that writes the row does.',
      },
      {
        do: 'Replace the marked `@authenticated(\'*\')` with two rules:',
        code: C.OWNER_RULES.trim(),
        file: TARGET,
        edits: [{ file: TARGET, from: C.TARGET_RULE_ALL, to: C.OWNER_RULES }],
        see: 'No red lines. In the **Data** tab, **Access** shows the new rules, not applied yet.',
        why: 'A `policy` is a test on each row: here, "the row\'s `owner_id` is the person signed in". `item.owner_id` is checked against the entity\'s fields, so a typo is a red line.',
      },
      {
        do: 'Apply both changes:',
        run: DB_APPLY,
        point: 'terminal',
        see: 'A new column, `owner_id`, and the new permissions.',
      },
      {
        do: 'As Alice, on **Targets**, add Germany at `3000000`.',
        point: 'preview',
        see: 'The row appears. The Log: the create, run as alice@contoso.example, allowed by the `read, create` rule.',
      },
      {
        do: 'Switch to Carol.',
        point: 'signin',
        see: 'Carol sees Germany too: everyone reads.',
      },
      {
        do: 'As Carol, press **Edit** on Germany, type `3100000`, and press **Save**.',
        point: 'preview',
        see: 'Refused: the message under the row says the row doesn\'t pass `claims.sub.eq(item.owner_id)` for this person. *(Playground wording.)*',
        why: 'Carol may read every row, but her update reaches only rows that pass the policy, and this one doesn\'t. The data API adds the policy to the update as a condition, so the update matches no row (Data API builder\'s docs). The real client then fails with its own error; the exact wording isn\'t documented.',
      },
      {
        do: 'Switch back to Alice.',
        point: 'signin',
        see: '**Signed in as: Alice**.',
      },
      {
        do: 'A slip on purpose: in `addTarget`, change `owner_id: session.user.id` to `owner_id: session.user.email`.',
        file: TARGETS_TS,
        edits: [{ file: TARGETS_TS, from: 'owner_id: session.user.id', to: 'owner_id: session.user.email' }],
        see: 'No red line.',
      },
      {
        do: 'As Alice, on **Targets**, add France at `1000000`.',
        point: 'preview',
        see: 'The France row appears.',
      },
      {
        do: 'Press **Edit** on France, and **Save**.',
        point: 'preview',
        see: 'Refused: Alice can\'t change the row she just added.',
        why: 'The policy compares the id (`claims.sub`), and we stored the email. Both are text, so there\'s no red line: the values just never match.',
      },
      {
        do: UNDO,
        edits: [{ file: TARGETS_TS, from: 'owner_id: session.user.email', to: 'owner_id: session.user.id' }],
        see: '`session.user.id` again.',
      },
      {
        do: 'In the **Data** tab, press **×** on the France row to delete it.',
        point: 'data',
        see: 'Only Germany is left. (The Data tab can do this because it ignores permissions: no real app has it.)',
      },
      {
        do: 'Why is `create` outside the policy? Read this card.',
        see: 'We kept `create` out of the policy on purpose. Rayfin\'s examples put policies on `create`, but Microsoft\'s Data API builder pages disagree on whether a create policy is enforced.',
        why: 'So here, anyone signed in may add a target, and the code stamps the owner. **Each country, its own targets** puts a rule on `create` anyway, and says how to test it.',
      },
    ],
    summary: [
      'Stamp the owner on create, from `session.user.id`: policies check it but don\'t fill it in.',
      'A policy decides, per action, which rows a person may touch: everyone reads, only the owner changes.',
      'A wrong value in the owner field gives no red line, just a row nobody can change.',
    ],
    fabric: {
      text: 'On Fabric the data API (Data API builder) runs the policy for every request, on the server. The playground runs it in this browser, from your decorators.',
      links: [rayfin.policies, rayfin.stampOwner, learn.dataPermissions],
    },
  },

  {
    id: 'two-identities',
    title: 'Two identities',
    goal: 'say, for every call in the app, whether it runs as the signed-in person or as the app',
    builds: ['my-rows', 'who-runs-it'],
    pbi: 'The same question as a data source\'s credentials: single sign-on (each viewer\'s own access) or stored credentials (one account for everyone).',
    idea: 'No code to write in this lesson: we read the Log and one function, and sort every kind of call by the identity it runs as.',
    steps: [
      {
        do: 'As Alice, open **Overview**, and open a `contoso` query in the **Log**.',
        point: 'log',
        see: '`runs as: the signed-in user (delegated)`, then alice@contoso.example.',
        why: 'Semantic model queries always run as the person, so Power BI\'s own security applies: Read and Build permission, and each model\'s RLS roles. Neither of our models has any, so everyone gets the same numbers.',
      },
      {
        do: 'Open **Order lines**, and open a `lake` read in the **Log**.',
        point: 'log',
        see: '`runs as: the app owner (application)`.',
      },
      {
        do: 'Open **Targets**, and open a `SalesTarget` read in the **Log**.',
        point: 'log',
        see: '`runs as: the signed-in user`, alice@contoso.example, and the rule that allowed it.',
        why: 'The app\'s own data always runs as the person, and its policies decide.',
      },
      {
        do: 'Read this function, adapted from Rayfin\'s docs. It isn\'t in our project.',
        code: C.IDENTITIES_FUNCTION,
        see: 'In one function, two identities: `ctx.getDataClient()` reads targets, then `ctx.Tokens.Fabric` calls a Fabric API.',
        why: 'The data client runs as the person who called the function. The token is the app\'s: the owner of the Fabric app item, whoever calls.',
      },
      {
        do: 'What does that mean for the app\'s owner? Read this card.',
        see: 'Everything the app does with `ctx.Tokens` (Fabric APIs, OneLake, SQL) can reach what the owner of the app item can reach, for every user. Give that account only what the app needs.',
        why: 'Rayfin\'s docs: for current Fabric apps, the app identity is the owner of the Fabric app item. There is no separate service identity, and Functions accept only application auth for their connections.',
      },
      {
        do: 'Works on my machine? Read this card.',
        see: 'While developing (`rayfin dev`), `ctx.Tokens` hold **your** tokens. A call that works locally can fail once deployed, if the app\'s owner lacks the access you have.',
        why: 'Test function connections on the deployed app.',
      },
      {
        do: 'Sort every call by identity. Read this card.',
        see: 'The signed-in person: semantic model connectors, `client.data`, `ctx.getDataClient()`, and SQL connectors set to `delegated`. The app (the item\'s owner): `ctx.Tokens.*`, `ctx.sql`, and SQL connectors set to `application`.',
        why: 'The questions right after this lesson ask about it.',
      },
    ],
    summary: [
      'Two identities: the person (semantic models, the app\'s own data, delegated connectors) and the app\'s owner (function tokens, application connectors).',
      'The app identity is the owner of the Fabric app item: it reaches what that account reaches, for every user.',
      'Test function connections on the deployed app: locally, the tokens are yours.',
    ],
    fabric: {
      text: 'Rayfin\'s delegated access page has the full table, including `ctx.sql` (Experimental), which runs as the app and skips entity policies.',
      links: [rayfin.delegatedAccess, rayfin.functionTokens, rayfin.localTokens],
    },
  },

  // ================================================================== Roles from the business
  {
    id: 'business-roles',
    title: 'Roles the business knows',
    goal: 'add a sales role and a country to each person\'s sign-in with dynamic claims',
    builds: ['two-identities', 'my-rows'],
    pbi: 'Dynamic RLS usually needs a security table: who belongs to which country. [[Dynamic claims|dynamic-claim]] are that table, read at sign-in and carried in the person\'s sign-in token.',
    idea: 'Microsoft Entra ID knows who someone is, not that Alice manages Germany. A small function answers that at sign-in.',
    steps: [
      {
        do: 'Why not `claims.role`? Read this card.',
        see: 'Rayfin\'s built-in `role` only says whether someone is signed in (its auth package types it as `Anonymous` or `Authenticated`), not their job. Permission decorators accept only `anonymous` and `authenticated`.',
        why: 'Microsoft Learn\'s examples compare `claims.role` with `\'admin\'`, but how a Fabric sign-in would carry that isn\'t documented. Business roles come from the app, and that\'s what dynamic claims are for.',
      },
      {
        do: 'Set up [[functions|function]] with the template\'s functions pack:',
        run: 'npm run pack:add -- functions',
        point: 'terminal',
        see: 'A new package, `packages/functions`, with `src/function_app.ts`; in `rayfin.yml`, Functions on, with their `path` and `auth` of type `application`.',
        why: 'The claims provider is a function. The template\'s functions skill sets Functions up with this pack, and says not to run `rayfin functions init` in this template. Functions use the app identity for their connections.',
      },
      {
        do: 'Turn dynamic claims on: **Do it for me** adds `dynamicClaims:` with `enabled: true` under `auth:` in `rayfin.yml`.',
        file: YML,
        edits: [{ file: YML, from: FABRIC_AUTH, to: FABRIC_AUTH + C.DYNAMIC_CLAIMS_YML }],
        see: 'The two lines after the `fabric:` block, at the same depth as `fabric:`.',
        why: 'Rayfin\'s docs: `services.auth.dynamicClaims` is the only switch.',
      },
      {
        do: 'Open `packages/functions/src/function_app.ts`, click **Show me in the code** to select all of it, and paste this over it:',
        code: C.CLAIMS_FUNCTION,
        file: FUNCTION_APP,
        edits: [{ file: FUNCTION_APP, from: FUNCTION_APP_TEMPLATE, to: C.CLAIMS_FUNCTION }],
        see: 'No red lines.',
        why: 'Rayfin calls it at each sign-in and refresh, and adds what it returns to the token. `ctx.auth.email` comes from the sign-in, never typed by the person. No entitlement means no sign-in at all: never a broad default. `denySignIn` never returns, so after the `if`, TypeScript knows `entitlement` exists.',
      },
      {
        do: 'A slip on purpose: **Do it for me** renames the claim `salesRole` to `role`, in the return type and in the returned object.',
        file: FUNCTION_APP,
        edits: [
          { file: FUNCTION_APP, from: C.CLAIMS_RETURN, to: C.CLAIMS_RETURN_SLIP },
          { file: FUNCTION_APP, from: C.CLAIMS_VALUE, to: C.CLAIMS_VALUE_SLIP },
        ],
        see: 'No red line.',
      },
      {
        do: 'Generate the claim types: start the dev loop again.',
        run: 'npm run dev',
        commandFails: true,
        point: 'terminal',
        see: 'It stops: `Claim \'role\' is a reserved claim name and cannot be used as a custom claim.`',
        why: '`role`, `sub`, `email`, `name` and a few more belong to the platform. `rayfin dev` generates the function and claim types when it starts, and checks the names; the backend checks every result at sign-in. (In a real project, stop the running loop first. While it runs, it regenerates the types as you edit the functions, the functions skill says.)',
      },
      {
        do: 'Undo it: **Do it for me** puts `salesRole` back.',
        edits: [
          { file: FUNCTION_APP, from: C.CLAIMS_RETURN_SLIP, to: C.CLAIMS_RETURN },
          { file: FUNCTION_APP, from: C.CLAIMS_VALUE_SLIP, to: C.CLAIMS_VALUE },
        ],
        see: '`salesRole` again.',
      },
      {
        do: 'Start the dev loop again:',
        run: 'npm run dev',
        point: 'terminal',
        see: 'No error, and a new file, `packages/auth/claims.generated.d.ts`: `claims.salesRole` and `claims.country` now exist for policies.',
        why: 'Until it exists, `claims.salesRole` in a policy is a red line. The data package\'s TypeScript settings include `../auth/*.d.ts`, so the policies in `packages/data/src` see these claims.',
      },
      {
        do: 'Switch to Dan.',
        point: 'signin',
        see: 'Sign-in refused: "You have no sales role in this app. Ask your administrator." The page starts again and says "Not signed in", and **Overview** shows an error: model queries run as the signed-in person, and there is none.',
        why: 'The playground runs your claims function at each switch. A real app gets the error code `SIGN_IN_DENIED` with the reason as its message, and should show that message.',
      },
      {
        do: 'Before relying on it, read this card.',
        see: 'Dynamic claims need Functions, which aren\'t in every region or tenant, and the backend must have them on for your workspace\'s region: until then, sign-in carries only the base claims. If the function throws, nobody signs in. The first sign-in after a deploy can time out once (`AUTH_CLAIMS_UNAVAILABLE`). A changed entitlement counts from the next sign-in or refresh.',
        why: 'Test with the deployed app: `rayfin dev` runs your functions locally, but sign-in still calls the deployed claims function.',
      },
    ],
    summary: [
      'Business roles come from a `udf.authClaims` function at sign-in, turned on with `dynamicClaims` in `rayfin.yml`.',
      'Claim names avoid the reserved ones, such as `role`; `npm run dev` generates their types.',
      'It fails closed, and depends on Functions and your workspace\'s region.',
    ],
    fabric: {
      text: 'Look people up by `ctx.auth.userId` (stable) or a normalized `ctx.auth.email`, keep secrets out of the deny reason, and throw on any lookup failure rather than return a default.',
      links: [rayfin.dynamicClaims, rayfin.claimRules, rayfin.regionLimit],
    },
  },

  {
    id: 'country-targets',
    title: 'Each country, its own targets',
    goal: 'scope targets by country, and see why hiding a button isn\'t security',
    builds: ['business-roles', 'my-rows'],
    pbi: 'Dynamic RLS by country, but per action: country managers read their own country, and only the director changes targets.',
    idea: 'New rules that compare the claims from our function with each row. Then we hide **Add** from people who can\'t use it, and try the API anyway.',
    steps: [
      {
        do: 'Click **Show me in the code** to select the two rules on `SalesTarget`, and paste this over them:',
        code: C.COUNTRY_RULES.trim(),
        file: TARGET,
        edits: [{ file: TARGET, from: C.OWNER_RULES, to: C.COUNTRY_RULES }],
        see: 'No red lines.',
        why: 'A country manager reads their own country\'s rows; the director reads everything and is the only one who writes. `owner_id` stays: it still records who added a row.',
      },
      {
        do: 'Apply it:',
        run: DB_APPLY,
        point: 'terminal',
        see: 'The new permissions of `SalesTarget`.',
      },
      {
        do: 'Make **Targets** load again when someone else signs in: **Do it for me** adds `useSession()` to the page and puts the user\'s id in the load key.',
        file: TARGETS_PAGE,
        edits: [
          { file: TARGETS_PAGE, from: "import { useLoad } from './hooks/use-load';\n", to: "import { useLoad } from './hooks/use-load';\nimport { useSession } from './hooks/use-session';\n" },
          { file: TARGETS_PAGE, from: TARGETS_STATE_END, to: `${TARGETS_STATE_END}  const session = useSession();\n` },
          { file: TARGETS_PAGE, from: C.TARGETS_KEY, to: C.TARGETS_KEY_SESSION },
        ],
        see: 'No red lines.',
        why: 'What a person may read now depends on who they are, so a new person means a new read. The key decides when `useLoad` runs again.',
      },
      {
        do: 'Switch to Bob.',
        point: 'signin',
        see: '**Signed in as: Bob**, in the top bar.',
      },
      {
        do: 'On **Targets**, add France at `1000000`.',
        point: 'preview',
        see: 'The France row.',
        why: 'Bob is the director, so the create rule lets him.',
      },
      {
        do: 'If Germany isn\'t there, add it at `3000000`.',
        point: 'preview',
        see: 'Both rows.',
      },
      {
        do: 'Switch to Alice, then to Carol, on **Targets**.',
        point: 'signin',
        see: 'Alice sees Germany; Carol sees France.',
      },
      {
        do: 'A slip on purpose: in the read rule, delete the marked `.or(claims.salesRole.eq(\'director\'))`.',
        file: TARGET,
        edits: [{ file: TARGET, from: C.COUNTRY_READ_RULE, to: C.COUNTRY_READ_RULE_SLIP }],
        see: 'No red line.',
      },
      {
        do: 'Apply it:',
        run: DB_APPLY,
        see: 'The new permissions.',
      },
      {
        do: 'Switch to Bob.',
        point: 'signin',
        see: 'No targets for 2026.',
        why: 'Bob\'s country claim is `All`, which matches no row. The director needs a rule of his own.',
      },
      {
        do: 'Undo it: put back `.or(claims.salesRole.eq(\'director\'))` (or **Do it for me**).',
        edits: [{ file: TARGET, from: C.COUNTRY_READ_RULE_SLIP, to: C.COUNTRY_READ_RULE }],
      },
      {
        do: 'Apply it again:',
        run: DB_APPLY,
        see: 'The director\'s rule is back. Bob sees both rows at the page\'s next read: switch to Alice and back to Bob.',
      },
      {
        do: 'Hide **Add** from people who can\'t use it. At the end of `packages/frontend/src/lib/session.ts`, add:',
        code: C.IS_DIRECTOR.trimStart(),
        edits: [{ file: SESSION_TS, from: SESSION_CLIENT_IMPORT, to: SESSION_CLIENT_IMPORT + C.IS_DIRECTOR }],
        see: 'No red lines.',
        why: 'In the browser, claims come back as text (`\'director\'`), and they\'re a hint for what to show. They decide nothing.',
      },
      {
        do: 'Use it: **Do it for me** shows **Add** on **Targets** only when `isDirector()` says so.',
        file: TARGETS_PAGE,
        edits: [
          { file: TARGETS_PAGE, from: "import { Fragment, useState } from 'react';\n", to: "import { Fragment, useEffect, useState } from 'react';\n" },
          { file: TARGETS_PAGE, from: "import { addTarget, changeTarget, loadTargets } from './lib/targets';\n", to: "import { isDirector } from './lib/session';\nimport { addTarget, changeTarget, loadTargets } from './lib/targets';\n" },
          { file: TARGETS_PAGE, from: '  const session = useSession();\n', to: `  const session = useSession();\n${C.DIRECTOR_STATE}` },
          { file: TARGETS_PAGE, from: C.TARGETS_ADD_BUTTON, to: C.TARGETS_ADD_BUTTON_DIRECTOR },
        ],
        see: 'As Bob, **Add** is there. Switch to Alice: no **Add** button.',
      },
      {
        do: 'As Alice, in the **Data** tab, use **Send directly** to send the create it suggests: Germany 2027.',
        point: 'data',
        see: 'Refused by the data API. (The playground enforces create policies; the next card says why to test that.)',
        why: 'Hiding a button stops nobody who calls the API another way. The policy on the server is the security: with `create` open to every signed-in person, as in **My rows only**, this would have worked.',
      },
      {
        do: 'Read the watch-out card.',
        see: 'Our create rule relies on create policies being enforced. Rayfin\'s examples use them, but Microsoft\'s Data API builder pages disagree: one says `create` doesn\'t support policies, another says it does for SQL Server.',
        why: 'Before relying on it, test it on the deployed app: sign in as a country manager, and send a create from outside the page. **Approvals**, a later chapter, stamps who asked in a function instead.',
      },
    ],
    summary: [
      'A policy can compare dynamic claims with row fields, per action. The director needs his own `.or`.',
      'What a person may read depends on who they are: load again when the session changes.',
      'Hiding a button is a hint; the policy on the server is the security.',
    ],
    fabric: {
      text: 'In the browser, `getClaims()` returns claims as strings, for UI hints only. If dynamic claims are off for your region, `claims.salesRole` is missing from the token. Data API builder\'s docs say a policy that names a missing claim is refused with 403; Rayfin\'s docs don\'t say.',
      links: [rayfin.filterClaims, rayfin.browserClaims, learn.secureConnector],
    },
  },
];
