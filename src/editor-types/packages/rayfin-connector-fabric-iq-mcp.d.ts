// Types from @microsoft/rayfin-connector-fabric-iq-mcp 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/index.d.ts, dist/connector.d.ts, dist/fabricIqMcpClient.d.ts and dist/fabricIqMcpTypeB.d.ts
// with comments shortened. Checked against https://rayfin.ai/docs/connectors/fabric-iq and
// https://rayfin.ai/docs/reference/sdk/rayfin-connector-fabric-iq-mcp.
// A subset: the marker `connector add` generates, the runtime, the conversation wrapper and its
// message, result, progress and error types. Left out: the low-level client
// (connectFabricIqMcpClient, FabricIqMcpClient, the Type B transport), the envelope helpers
// (createFabricIqMcpTypeBInput, validateFabricIqMcpTypeBInput/Output), the protocol constants and
// the limit constants other than the invoke timeout. FabricIqMcpOptions.clientInfo is typed as a
// plain { name, version } here (the real one is the MCP SDK's Implementation type).
declare module '@microsoft/rayfin-connector-fabric-iq-mcp' {
  import type { ConnectorRuntime, InvokeOptions } from '@microsoft/rayfin-connectors';

  /** Headers carried as data in the request and response envelopes. */
  export type FabricIqMcpTypeBHeaders = Readonly<Record<string, string>>;

  /** One request envelope for `executeQuery` (MCP protocol 2026-07-28). */
  export interface FabricIqMcpTypeBInput<TMessage = unknown> {
    readonly protocolVersion: '2026-07-28';
    readonly headers: FabricIqMcpTypeBHeaders;
    readonly message: TMessage;
    readonly [key: string]: unknown;
  }

  /** The buffered upstream HTTP response `executeQuery` returns. */
  export interface FabricIqMcpTypeBOutput {
    /** The upstream HTTP status. */
    readonly status: number;
    readonly headers: FabricIqMcpTypeBHeaders;
    /** The complete UTF-8 body. */
    readonly message: string;
    readonly [key: string]: unknown;
  }

  /** Per-invocation settings. */
  export interface FabricIqMcpInvokeOptions extends InvokeOptions {
    readonly signal?: AbortSignal;
    /** Bounds one HTTP invocation, in milliseconds. */
    readonly timeout?: number;
  }

  /** The operation catalog of a Fabric IQ connector. */
  export interface FabricIqMcpOperations {
    readonly executeQuery: {
      readonly __input?: FabricIqMcpTypeBInput;
      readonly __output?: FabricIqMcpTypeBOutput;
    };
  }

  /** The connector marker `rayfin connector add --type fabriciqmcp` writes into `schema.ts`. */
  export type FabricIqMcp<TOperation extends keyof FabricIqMcpOperations = 'executeQuery'> = {
    readonly __client?: {
      [K in TOperation]: (input: FabricIqMcpTypeBInput, options?: FabricIqMcpInvokeOptions) => Promise<FabricIqMcpTypeBOutput>;
    };
    readonly __operations?: Pick<FabricIqMcpOperations, TOperation>;
  };

  /** A tool result. A text answer is `{ type: 'text', text }` in `content`. */
  export interface FabricIqMcpToolResult {
    readonly content: readonly unknown[];
    /** `true` when the tool reported a failure: show it as an error, not an answer. */
    readonly isError?: boolean;
    readonly structuredContent?: unknown;
    readonly _meta?: unknown;
    readonly resources?: unknown;
  }

  export interface FabricIqMcpToolsResult {
    readonly tools: readonly {
      readonly name: string;
      readonly [key: string]: unknown;
    }[];
  }

  /** One conversation entry. Keep tool results whole for follow-up questions. */
  export type FabricIqMcpChatMessage =
    | { readonly role: 'user'; readonly content: string }
    | { readonly role: 'assistant'; readonly content: string | FabricIqMcpToolResult };

  /** A completed turn, and a new history ready for the next user message. */
  export interface FabricIqMcpChatResponse {
    readonly result: FabricIqMcpToolResult;
    /** Everything you passed, followed by the assistant's result. */
    readonly messages: readonly FabricIqMcpChatMessage[];
  }

  export interface FabricIqMcpTaskUpdate {
    readonly status: string;
  }

  export interface FabricIqMcpProgressEvent {
    readonly [key: string]: unknown;
    readonly type: string;
    readonly header?: string;
    readonly description?: string;
    readonly functionName?: string;
    readonly queryId?: string;
    readonly title?: string;
    readonly status?: string;
    readonly isError?: boolean;
    readonly errorMessage?: string;
  }

  /** Content-bearing progress: untrusted, never logged, rendered as HTML or added to the history. */
  export interface FabricIqMcpTaskProgress extends FabricIqMcpTaskUpdate {
    readonly statusMessage?: string;
    readonly progress?: string | number;
    readonly total?: number;
    readonly message?: string;
    readonly messages?: readonly string[];
    readonly events?: readonly FabricIqMcpProgressEvent[];
  }

  export interface FabricIqMcpToolCallOptions {
    /** Aborting sends a cooperative cancel, and the call rejects with an `AbortError`. */
    readonly signal?: AbortSignal;
    /** Status-only updates. */
    readonly onTaskUpdate?: (update: FabricIqMcpTaskUpdate) => void;
    /** Opt-in, content-bearing progress. */
    readonly onTaskProgress?: (progress: FabricIqMcpTaskProgress) => void;
  }

  export type FabricIqMcpOptions = {
    readonly headers?: FabricIqMcpTypeBHeaders;
    /** Defaults to `{ name: 'rayfin-fabric-iq-mcp', version: '1' }`. */
    readonly clientInfo?: { readonly name: string; readonly version: string; readonly [key: string]: unknown };
  };

  /** The conversation wrapper. It connects lazily on the first call. */
  export class FabricIqMcpConnectorClient {
    private constructor();
    /**
     * Asks the `AskPowerBI` tool about one Power BI artifact (a nonzero GUID). `messages` is the
     * whole conversation, ending with a nonempty user message: the service keeps no memory.
     * Throws `FabricIqMcpAdapterError` before any request when the question is over 20,000
     * characters or the serialized history over 40,000. Never truncates the history.
     */
    ask(
      artifactId: string,
      messages: readonly FabricIqMcpChatMessage[],
      options?: FabricIqMcpToolCallOptions,
    ): Promise<FabricIqMcpChatResponse>;
    /** Calls any discovered tool with schema-valid arguments; you supply the whole context. */
    callTool(name: string, args?: Record<string, unknown>, options?: FabricIqMcpToolCallOptions): Promise<FabricIqMcpToolResult>;
    /** Lists the tools, without selecting an artifact. */
    listTools(): Promise<FabricIqMcpToolsResult>;
    /** Cancels active tasks and closes the connection; later calls throw. */
    close(): Promise<void>;
  }

  /** Wraps `client.connectors.<name>`. Register `fabricIqMcp()` under the same name. */
  export function createFabricIqMcpConnectorClient(
    connector: {
      executeQuery(input: FabricIqMcpTypeBInput, options?: FabricIqMcpInvokeOptions): Promise<FabricIqMcpTypeBOutput>;
    },
    options?: FabricIqMcpOptions,
  ): FabricIqMcpConnectorClient;

  /** The runtime for `connectorsService({ runtime: { <name>: fabricIqMcp() } })`: carries cancellation and deadlines. */
  export function fabricIqMcp(): ConnectorRuntime;

  /** Invalid input, a closed wrapper, or a non-2xx answer from the Rayfin backend (the message carries only the HTTP status). */
  export class FabricIqMcpAdapterError extends Error {
    readonly name: 'FabricIqMcpAdapterError';
  }

  /** Fabric IQ answered with a non-2xx HTTP status. */
  export class FabricIqMcpHttpError extends Error {
    readonly status: number;
    readonly name: 'FabricIqMcpHttpError';
    constructor(status: number, headers: FabricIqMcpTypeBHeaders);
    /** Reads a response header case-insensitively. Do not log or replay it. */
    getResponseHeader(name: string): string | undefined;
  }

  export type FabricIqMcpContractErrorCode = 'INVALID_ENVELOPE' | 'INVALID_PROTOCOL' | 'INVALID_HEADERS' | 'LIMIT_EXCEEDED';

  /** A request or response broke the connector contract. */
  export class FabricIqMcpContractError extends Error {
    readonly code: FabricIqMcpContractErrorCode;
    readonly name: 'FabricIqMcpContractError';
    constructor(code: FabricIqMcpContractErrorCode, message: string);
  }

  /** Deadline of one invocation: 300,000 ms. */
  export const FABRIC_IQ_MCP_INVOKE_TIMEOUT_MS: number;
}
