// Simulated Fabric IQ connector (Rayfin 2.0, @microsoft/rayfin-connector-fabric-iq-mcp): `ask()`
// answers a fixed set of questions with replayed answers. No AI runs here. Every answer is composed
// only from the saved model snapshots in data/snapshots.json (the queries in data/catalog.json, run
// once on the owner's Contoso model in Power BI Desktop), and every answer text starts with
// "Playground: replayed answer". A question outside the set gets `isError: true` with a plain
// message, never an invented answer.
//
// Mirrored from the docs and the installed 2.0.0 package (connector.js):
// - ask(artifactId, messages, options) resolves to { result, messages }, where messages is the
//   whole history followed by { role: 'assistant', content: result }:
//   https://rayfin.ai/docs/connectors/fabric-iq#ask-a-question
// - The checks before any request, with the package's own messages: artifactId a nonzero GUID;
//   messages non-empty, every entry user text or assistant text/tool result, the last a nonempty
//   user message; the question at most 20,000 characters and the serialized earlier history at most
//   40,000 (FabricIqMcpAdapterError, history never truncated):
//   https://rayfin.ai/docs/reference/sdk/rayfin-connector-fabric-iq-mcp#conversation-wrapper
// - The service keeps no memory: the history passed is the only context
//   (https://rayfin.ai/docs/connectors/fabric-iq#continue-the-conversation). Here, the earlier user
//   questions in the history are re-read to know what "What about 2025?" refers to; without the
//   history it refers to nothing, and the answer covers every country.
// - Only a task that completes resolves, and a completed tool failure resolves with
//   result.isError: true rather than throwing
//   (https://rayfin.ai/docs/reference/sdk/rayfin-connector-fabric-iq-mcp#conversation-types). A task
//   that ends 'failed' throws FabricIqMcpAdapterError (the task's error message, else `Fabric IQ MCP
//   task ended with status "failed".`), and one that ends 'cancelled' throws an AbortError ("Fabric
//   IQ MCP task was cancelled."): installed fabricIqMcpClient.js, terminalResult. Modes
//   'task-failed' and 'task-cancelled' play both (the sim's failed task carries no error object).
// - Aborting the signal rejects with an AbortError (#progress-and-cancellation); close() makes later
//   calls throw FabricIqMcpAdapterError ("Fabric IQ MCP connector is closed.", installed connector.js).
// - createFabricIqMcpConnectorClient() checks nothing and connects lazily, on the first call
//   (installed connector.js). callTool() checks, after connecting: "Tool name must be non-empty.",
//   then "Tool arguments must be an object." (fabricIqMcpClient.js).
// - A non-2xx answer from the Rayfin backend throws FabricIqMcpAdapterError "Fabric IQ MCP connector
//   invocation failed (HTTP <status>)." (rawInvoke.js); a non-2xx answer from Fabric IQ itself throws
//   FabricIqMcpHttpError "Fabric IQ MCP returned HTTP <status>." The message carries only the status.
// - Mode 'not-enabled': "authoring support does not guarantee that the Fabric IQ backend adapter is
//   enabled in your Fabric environment"; then every question fails
//   (https://rayfin.ai/docs/connectors/fabric-iq#troubleshoot-fabric-iq). NOT DOCUMENTED: what a
//   real environment answers then. Here: the backend's non-2xx error, with HTTP 404 (a playground
//   choice), and the explanation in the error's `playgroundNote`.
// - Runs as the signed-in user, delegated only (https://rayfin.ai/docs/connectors/fabric-iq#add-the-connector).
//   Learn (https://learn.microsoft.com/fabric/iq/connectors/fabric-iq-mcp): delegated Power BI
//   Service `Item.Read.All` and `Item.Execute.All`, no service principal or app-only access, the
//   caller's own permissions, and RLS and OLS apply, so two people can get different results for
//   the same question. HERE every signed-in persona gets the same replayed answer: the snapshots were
//   run once by the owner, on a model with no RLS or OLS roles. With `getUser`, a signed-out caller
//   fails like a non-2xx backend answer (HTTP 401, a playground choice; NOT DOCUMENTED).
//
// Tools: Learn lists six tools (DiscoverArtifacts, ResolveFabricItem, GetReportMetadata,
// GetSemanticModelSchema, ValueSearch, ExecuteQuery) for the `Fabric.Routing.FabricIQ.V2` toolset,
// and says that toolset has no natural-language answering tool. Rayfin pins another toolset,
// `X-Variants: Fabric.Routing.M365.V1` (installed fabricIqMcpTypeB.js), and sends questions to an
// `AskPowerBI` tool (https://rayfin.ai/docs/connectors/fabric-iq#ask-a-question). The tool list of
// M365.V1 is NOT DOCUMENTED, so listTools() here returns AskPowerBI only.
//
// NOT DOCUMENTED, chosen here: the non-terminal task status onTaskUpdate receives (here: 'working',
// the MCP Tasks name), and the shape of a real answer's structuredContent (here: the snapshot id,
// its DAX and its table, marked as playground).

import catalog from '../../data/catalog.json';
import snapshotFile from '../../data/snapshots.json';
import { PLACEHOLDER } from '../project.mjs';
import { pg, wait } from './playground';

// ---------------------------------------------------------------- types (as in the package)

export type FabricIqMcpToolResult = {
  readonly content: readonly unknown[];
  readonly isError?: boolean;
  readonly structuredContent?: unknown;
  readonly _meta?: unknown;
  readonly resources?: unknown;
};
export type FabricIqMcpChatMessage =
  | { readonly role: 'user'; readonly content: string }
  | { readonly role: 'assistant'; readonly content: string | FabricIqMcpToolResult };
export type FabricIqMcpChatResponse = { readonly result: FabricIqMcpToolResult; readonly messages: readonly FabricIqMcpChatMessage[] };
export type FabricIqMcpTaskUpdate = { readonly status: string };
export type FabricIqMcpToolCallOptions = {
  readonly signal?: AbortSignal;
  readonly onTaskUpdate?: (update: FabricIqMcpTaskUpdate) => void;
  readonly onTaskProgress?: (progress: FabricIqMcpTaskUpdate & Record<string, unknown>) => void;
};
export type FabricIqMcpToolsResult = { readonly tools: readonly { readonly name: string; readonly [key: string]: unknown }[] };

/** The package's adapter error (invalid input, closed wrapper, non-2xx answer from the backend). */
export class FabricIqMcpAdapterError extends Error {
  override readonly name = 'FabricIqMcpAdapterError';
  /** Playground only: why the simulation threw, when the real message can't say. */
  playgroundNote?: string;
}

/** The package's error for a non-2xx answer from Fabric IQ itself (installed fabricIqMcpClient.js). */
export class FabricIqMcpHttpError extends Error {
  override readonly name = 'FabricIqMcpHttpError';
  readonly status: number;
  readonly #headers: Readonly<Record<string, string>>;
  constructor(status: number, headers: Readonly<Record<string, string>> = {}) {
    super(`Fabric IQ MCP returned HTTP ${status}.`);
    this.status = status;
    this.#headers = Object.freeze({ ...headers });
  }
  /** Reads a response header, ignoring case. */
  getResponseHeader(name: string): string | undefined {
    const key = Object.keys(this.#headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return key === undefined ? undefined : this.#headers[key];
  }
}

export type FabricIqMcpContractErrorCode = 'INVALID_ENVELOPE' | 'INVALID_PROTOCOL' | 'INVALID_HEADERS' | 'LIMIT_EXCEEDED';

/** The package's error for an envelope that breaks the connector contract (installed fabricIqMcpTypeB.js). Never thrown here. */
export class FabricIqMcpContractError extends Error {
  override readonly name = 'FabricIqMcpContractError';
  readonly code: FabricIqMcpContractErrorCode;
  constructor(code: FabricIqMcpContractErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** The AbortError the package creates (fabricIqMcpClient.js, createAbortError). */
function abortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

// ---------------------------------------------------------------- the recording

export const REPLAY_LABEL = 'Playground: replayed answer';
/** The artifact the saved answers belong to: the course's placeholder id for the Contoso model. */
export const CONTOSO_ARTIFACT_ID: string = PLACEHOLDER.itemId;

type Table = { columns: { name: string; dataType: string }[]; rows: unknown[][] };
type Saved = { status: 'success'; table: Table } | { status: 'error'; error: { category: string; message: string } };
const snapshots = snapshotFile.snapshots as unknown as Record<string, Saved>;
const queries = new Map(catalog.queries.map((q) => [q.id, q.query]));
const YEARS: number[] = catalog.years;
const COUNTRIES: string[] = catalog.countries;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

type Measure = 'revenue' | 'orders' | 'customers' | 'categories' | 'ranking' | 'by-year' | 'margin';
type Slots = { measure: Measure; country?: string; year?: number };
/** A full question sets every slot; a follow-up changes some and keeps the rest from the history. */
type FollowChange = Partial<Slots> & { allCountries?: true; allYears?: true };
type Intent = { kind: 'full'; slots: Slots } | { kind: 'follow-up'; change: FollowChange };

/** Questions match ignoring case, spacing, curly quotes and a final ? . or !. */
export const normalizeQuestion = (q: string) =>
  q.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '').trim().toLowerCase();

const intents = new Map<string, Intent>();
/** First questions, in the order the lesson suggests them. */
const suggested: string[] = [];
/** Follow-ups, which need the history to mean anything specific. */
const followUps: string[] = [];

function full(text: string, slots: Slots, suggest = false) {
  intents.set(normalizeQuestion(text), { kind: 'full', slots });
  if (suggest) suggested.push(text);
}
function follow(text: string, change: FollowChange, list = true) {
  intents.set(normalizeQuestion(text), { kind: 'follow-up', change });
  if (list) followUps.push(text);
}

full('What was total revenue?', { measure: 'revenue' }, true);
full('Which store country had the most revenue?', { measure: 'ranking' }, true);
full('Which store country had the most revenue in 2024?', { measure: 'ranking', year: 2024 });
full('How did revenue change by year?', { measure: 'by-year' }, true);
full('What is the margin %?', { measure: 'margin' }, true);
full('What were the top product categories?', { measure: 'categories' }, true);
for (const y of YEARS) {
  full(`What was revenue in ${y}?`, { measure: 'revenue', year: y });
  full(`What were the top product categories in ${y}?`, { measure: 'categories', year: y });
  follow(`What about ${y}?`, { year: y }, y === 2025);
  follow(`And in ${y}?`, { year: y }, false);
}
for (const c of COUNTRIES) {
  for (const prep of ['in', 'for']) {
    full(`What was revenue ${prep} ${c}?`, { measure: 'revenue', country: c });
    full(`What were the top product categories ${prep} ${c}?`, { measure: 'categories', country: c });
    for (const y of YEARS) {
      full(`What was revenue ${prep} ${c} in ${y}?`, { measure: 'revenue', country: c, year: y }, prep === 'in' && c === 'Germany' && y === 2024);
      full(`What were the top product categories ${prep} ${c} in ${y}?`, { measure: 'categories', country: c, year: y });
    }
  }
  follow(`What about ${c}?`, { country: c }, c === 'France');
  follow(`And in ${c}?`, { country: c }, false);
}
follow('How many orders was that?', { measure: 'orders' });
follow('How many customers was that?', { measure: 'customers' });
follow('Break that down by category.', { measure: 'categories' });
follow('What about all countries?', { allCountries: true });
follow('What about all years?', { allYears: true }, false);

/** Questions to offer as buttons: first questions, then follow-ups. Anything else is "not in the recording". */
export const SUGGESTED_QUESTIONS: readonly string[] = suggested;
export const FOLLOW_UP_QUESTIONS: readonly string[] = followUps;
/** Every question with a replayed answer (normalized), for the checker. */
export const allQuestions = (): string[] => [...intents.keys()];

function apply(slots: Slots | undefined, intent: Intent): Slots {
  if (intent.kind === 'full') return { ...intent.slots };
  const next: Slots = { measure: 'revenue', ...slots };
  const { allCountries, allYears, ...change } = intent.change;
  Object.assign(next, change);
  if (allCountries) delete next.country;
  if (allYears) delete next.year;
  return next;
}

/** The snapshot that answers these slots, if one was saved. */
function snapshotFor(s: Slots): string | undefined {
  const parts = (base: string) => [base, s.year, s.country && slug(s.country)].filter(Boolean).join('-');
  let id: string;
  switch (s.measure) {
    case 'revenue':
    case 'orders':
    case 'customers':
      id = s.year || s.country ? parts('totals') : 'totals';
      break;
    case 'categories':
      id = parts('sales-by-category');
      break;
    case 'ranking':
      if (s.country) return undefined;
      id = s.year ? `sales-by-country-${s.year}` : 'sales-by-country';
      break;
    case 'by-year':
      if (s.country || s.year) return undefined;
      id = 'sales-by-year';
      break;
    case 'margin':
      if (s.country || s.year) return undefined;
      id = 'margin-from-model';
      break;
  }
  return snapshots[id]?.status === 'success' ? id : undefined;
}

const money = (n: unknown) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = (n: unknown) => Number(n).toLocaleString('en-US');
const where = (s: Slots) =>
  `${s.country ? (s.country === 'Online' ? 'the Online store' : s.country) : 'all store countries'}, ${s.year ?? 'all years'}`;

function compose(s: Slots, table: Table): string {
  const r = table.rows;
  switch (s.measure) {
    case 'revenue':
      return `Revenue (${where(s)}): ${money(r[0][0])}.`;
    case 'orders':
      return `Orders (${where(s)}): ${count(r[0][1])}.`;
    case 'customers':
      return `Customers (${where(s)}): ${count(r[0][2])}.`;
    case 'categories':
      return [`Revenue by product category (${where(s)}):`, ...r.map((row, i) => `${i + 1}. ${row[0]}: ${money(row[1])}`)].join('\n');
    case 'ranking':
      return [`Revenue by store country (${s.year ?? 'all years'}), highest first:`, ...r.map((row, i) => `${i + 1}. ${row[0]}: ${money(row[1])}`)].join('\n');
    case 'by-year':
      return ['Revenue and orders by year:', ...r.map((row) => `${row[0]}: ${money(row[1])} (${count(row[2])} orders)`)].join('\n');
    case 'margin':
      return `Margin % (all store countries, all years): ${(Number(r[0][0]) * 100).toFixed(1)}%.`;
  }
}

function errorResult(text: string): FabricIqMcpToolResult {
  return { content: [{ type: 'text', text: pg(text) }], isError: true };
}

/** Answers one question with the earlier messages as context. Never invents data. */
export function replay(artifactId: string, query: string, context: readonly FabricIqMcpChatMessage[]): FabricIqMcpToolResult {
  if (artifactId.toLowerCase() !== CONTOSO_ARTIFACT_ID.toLowerCase()) {
    return errorResult(`answers were saved only for the Contoso model (artifact ${CONTOSO_ARTIFACT_ID}). No other model can be asked here.`);
  }
  let slots: Slots | undefined;
  for (const m of context) {
    if (m.role !== 'user') continue;
    const earlier = intents.get(normalizeQuestion(m.content));
    if (earlier) slots = apply(slots, earlier);
  }
  const intent = intents.get(normalizeQuestion(query));
  if (!intent) {
    return errorResult(
      'this question is not in the recording. No AI runs in the playground: only the suggested questions and follow-ups have replayed answers, composed from saved query results.',
    );
  }
  const now = apply(slots, intent);
  const id = snapshotFor(now);
  if (!id) return errorResult(`no saved query result answers this (${now.measure}, ${where(now)}), so there is no replayed answer.`);
  const table = (snapshots[id] as Extract<Saved, { status: 'success' }>).table;
  return {
    content: [{ type: 'text', text: `${REPLAY_LABEL}.\n${compose(now, table)}` }],
    structuredContent: {
      playground: `${REPLAY_LABEL}: composed from the saved result of one DAX query; the shape of a real answer's structured content is not documented.`,
      snapshot: id,
      dax: queries.get(id),
      table: structuredClone(table),
    },
  };
}

// ---------------------------------------------------------------- the wrapper

export type FabricIqMode = 'normal' | 'not-enabled' | 'task-failed' | 'task-cancelled';

export type FabricIqSimOptions = {
  /**
   * Read at each request: 'not-enabled' makes every request fail, as when the backend adapter is
   * off; 'task-failed' and 'task-cancelled' end every task that way.
   */
  mode?: () => FabricIqMode;
  /** The signed-in persona, or null when nobody is signed in. Read at each request. Omit for "always signed in". */
  getUser?: () => { readonly sub: string } | null;
  /** Simulated time per answer, in milliseconds (0 in tests). */
  delayMs?: number;
  /** Called after each ask, for the Log. `runsAs` is the signed-in persona's `sub` (delegated), when `getUser` is given. */
  onAsk?: (entry: { artifactId: string; question: string; historyLength: number; isError: boolean; snapshot?: string; runsAs?: string }) => void;
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The checks `ask` makes before any request, with the installed package's messages. */
export function validateAsk(artifactId: unknown, messages: unknown): { query: string; context: string; snapshot: FabricIqMcpChatMessage[] } {
  if (typeof artifactId !== 'string' || !GUID.test(artifactId) || artifactId === '00000000-0000-0000-0000-000000000000') {
    throw new FabricIqMcpAdapterError('AskPowerBI requires a nonempty artifact GUID as a tool argument.');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new FabricIqMcpAdapterError('Supply the complete conversation ending with a user message.');
  }
  for (const m of messages as FabricIqMcpChatMessage[]) {
    if (
      !m ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      (typeof m.content !== 'string' && (m.role !== 'assistant' || !m.content || !Array.isArray((m.content as FabricIqMcpToolResult).content)))
    ) {
      throw new FabricIqMcpAdapterError('Conversation entries must contain user text or assistant text/tool results.');
    }
  }
  const current = messages[messages.length - 1] as FabricIqMcpChatMessage;
  if (current.role !== 'user' || !current.content.trim()) {
    throw new FabricIqMcpAdapterError('The last conversation entry must be a nonempty user message.');
  }
  const snapshot = structuredClone(messages) as FabricIqMcpChatMessage[];
  const query = current.content;
  const context = JSON.stringify(snapshot.slice(0, -1));
  if (query.length > 20_000 || context.length > 40_000) {
    throw new FabricIqMcpAdapterError(
      'AskPowerBI accepts at most 20000 query characters and 40000 context characters. Start a new conversation; history was not truncated.',
    );
  }
  return { query, context, snapshot };
}


/** The real message for a non-2xx answer from the Rayfin backend (rawInvoke.js), with a playground note on why. */
function backendError(status: number, note: string): FabricIqMcpAdapterError {
  const error = new FabricIqMcpAdapterError(`Fabric IQ MCP connector invocation failed (HTTP ${status}).`);
  error.playgroundNote = pg(note);
  return error;
}

const NOT_ENABLED_NOTE =
  "every request fails here, as it does when the Fabric IQ backend adapter is not enabled in a Fabric environment. Check availability with your Fabric administrator. What a real environment answers then is not documented: the status 404 is the playground's choice.";
const SIGNED_OUT_NOTE =
  "nobody is signed in, and Fabric IQ runs only as the signed-in user (delegated). The status a real backend answers then is not documented: 401 is the playground's choice.";

/** The package's isPlainRecord check for tool arguments. */
const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

/** The simulated FabricIqMcpConnectorClient. */
export class SimFabricIqClient {
  #closed = false;
  #connected = false;
  /** `connector` is what createFabricIqMcpConnectorClient() got; it is checked on the first call, as the real wrapper connects then. */
  constructor(
    private readonly options: FabricIqSimOptions = {},
    private readonly connector?: unknown,
  ) {}

  #assertOpen() {
    if (this.#closed) throw new FabricIqMcpAdapterError('Fabric IQ MCP connector is closed.');
  }

  #mode(): FabricIqMode {
    return this.options.mode?.() ?? 'normal';
  }

  /** What fails any request before Fabric IQ answers: the backend adapter, then the sign-in. */
  #checkRequest() {
    if (this.#mode() === 'not-enabled') throw backendError(404, NOT_ENABLED_NOTE);
    if (this.options.getUser && !this.options.getUser()) throw backendError(401, SIGNED_OUT_NOTE);
  }

  /** The lazy connect: the first call uses the connector, and a failed connect is retried on the next call. */
  #connect() {
    this.#assertOpen();
    if (this.#connected) return;
    if (this.connector !== undefined) {
      const c = this.connector as { executeQuery?: unknown } | null;
      if (!c || typeof c.executeQuery !== 'function') {
        throw new TypeError(pg('the connector passed to createFabricIqMcpConnectorClient() has no executeQuery. Pass client.connectors.<name>.'));
      }
    }
    this.#checkRequest();
    this.#connected = true;
  }

  /** The tool call: the backend check, the simulated task, then its terminal status. */
  async #run(artifactId: string, query: string, context: readonly FabricIqMcpChatMessage[], options: FabricIqMcpToolCallOptions) {
    this.#checkRequest();
    options.onTaskUpdate?.({ status: 'working' });
    await wait(this.options.delayMs ?? 600, options.signal);
    const mode = this.#mode();
    if (mode === 'task-failed') {
      options.onTaskUpdate?.({ status: 'failed' });
      const error = new FabricIqMcpAdapterError('Fabric IQ MCP task ended with status "failed".');
      error.playgroundNote = pg("mode 'task-failed': the simulated task ended 'failed', with no error object.");
      throw error;
    }
    if (mode === 'task-cancelled') {
      options.onTaskUpdate?.({ status: 'cancelled' });
      throw abortError('Fabric IQ MCP task was cancelled.');
    }
    const result = replay(artifactId, query, context);
    options.onTaskUpdate?.({ status: 'completed' });
    return result;
  }

  async ask(artifactId: string, messages: readonly FabricIqMcpChatMessage[], options: FabricIqMcpToolCallOptions = {}): Promise<FabricIqMcpChatResponse> {
    this.#assertOpen();
    options.signal?.throwIfAborted();
    const { query, context, snapshot } = validateAsk(artifactId, messages);
    const result = await this.callTool('AskPowerBI', { artifactId, query, context }, options);
    const sc = result.structuredContent as { snapshot?: string } | undefined;
    const runsAs = this.options.getUser?.()?.sub;
    this.options.onAsk?.({
      artifactId,
      question: query,
      historyLength: snapshot.length - 1,
      isError: result.isError === true,
      snapshot: sc?.snapshot,
      ...(runsAs ? { runsAs } : {}),
    });
    return { result, messages: [...snapshot, { role: 'assistant', content: structuredClone(result) }] };
  }

  async callTool(name: string, args: Record<string, unknown> = {}, options: FabricIqMcpToolCallOptions = {}): Promise<FabricIqMcpToolResult> {
    this.#assertOpen();
    options.signal?.throwIfAborted();
    this.#connect();
    if (typeof name !== 'string' || name.trim().length === 0) throw new FabricIqMcpAdapterError('Tool name must be non-empty.');
    if (!isPlainRecord(args)) throw new FabricIqMcpAdapterError('Tool arguments must be an object.');
    options.signal?.throwIfAborted();
    if (name !== 'AskPowerBI') {
      this.#checkRequest();
      return errorResult(`the tool "${name}" is not in the recording; only AskPowerBI is simulated.`);
    }
    let context: FabricIqMcpChatMessage[] = [];
    try {
      context = typeof args.context === 'string' && args.context ? JSON.parse(args.context) : [];
    } catch {
      context = [];
    }
    return this.#run(String(args.artifactId ?? ''), String(args.query ?? ''), Array.isArray(context) ? context : [], options);
  }

  async listTools(): Promise<FabricIqMcpToolsResult> {
    this.#connect();
    this.#checkRequest();
    return {
      tools: [
        {
          name: 'AskPowerBI',
          description: pg(
            'the only tool simulated here. Rayfin pins the Fabric.Routing.M365.V1 toolset, whose tool list is not documented; Learn lists six tools for the Fabric.Routing.FabricIQ.V2 toolset.',
          ),
        },
      ],
    };
  }

  async close(): Promise<void> {
    this.#closed = true;
  }
}

/**
 * The module the preview can serve as '@microsoft/rayfin-connector-fabric-iq-mcp': the wrapper
 * factory, the runtime and the error classes. As in the package, creating the wrapper checks
 * nothing; the connector (`client.connectors.<name>`) is used on the first call. The answers come
 * from the simulation.
 */
export function fabricIqPackage(options: FabricIqSimOptions = {}) {
  return {
    /** Same shape as the package's runtime. Its `invoke` is never reached here: no request leaves the page. */
    fabricIqMcp: () => ({
      operations: {
        executeQuery: {
          invoke: async (_context: unknown, _next: unknown): Promise<never> => {
            throw new Error(pg('no request leaves the page. Ask through createFabricIqMcpConnectorClient(); the answers are replayed.'));
          },
        },
      },
    }),
    createFabricIqMcpConnectorClient(connector: unknown, _options?: unknown) {
      return new SimFabricIqClient(options, connector);
    },
    FabricIqMcpAdapterError,
    FabricIqMcpHttpError,
    FabricIqMcpContractError,
    FABRIC_IQ_MCP_INVOKE_TIMEOUT_MS: 300_000,
  };
}
