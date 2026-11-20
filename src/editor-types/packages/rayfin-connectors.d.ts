// Types from @microsoft/rayfin-connectors 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/connectorsService.d.ts, dist/ConnectorsSchema.d.ts, dist/Connectors.d.ts and
// dist/contracts.d.ts with comments shortened. A subset: what a semantic model connector uses.
// ConnectorConfig leaves out `entities` (entity connectors only).
declare module '@microsoft/rayfin-connectors' {
  import type { ClientServiceFactory } from '@microsoft/rayfin-lib';

  export type ConnectorType =
    | 'fabric-sqlanalytics'
    | 'fabric-warehouse'
    | 'fabric-sqldatabase'
    | 'fabric-semanticmodel'
    | 'fabriciqmcp'
    | 'eventhouse'
    | 'fabric-dataagent'
    | 'office365users'
    | 'sharepointonline'
    | 'office365'
    | 'excelonlinebusiness'
    | 'teams'
    | 'onedriveforbusiness'
    | 'office365groups'
    | 'microsoftforms'
    | 'planner'
    | 'azuread';

  /** Per-operation input/output binding (type level only). */
  export interface OperationDef<TInput = unknown, TOutput = unknown> {
    readonly __input?: TInput;
    readonly __output?: TOutput;
  }

  export type OperationCatalog = Record<string, OperationDef<unknown, unknown>>;

  /** Type marker for a connector: pins its client shape and its accepted configuration. */
  export interface ConnectorMarker<TClient = unknown, TConfig extends ConnectorConfig = ConnectorConfig> {
    readonly __client?: TClient;
    readonly __config?: TConfig;
  }

  /** Maps connector instance names (as declared in `rayfin.yml`) to their markers. */
  export type ConnectorsSchema = Record<string, ConnectorMarker>;

  /** Configuration for every connector in a schema, checked against each marker's config type. */
  export type ConnectorConfigs<TSchema extends ConnectorsSchema> = {
    [K in keyof TSchema & string]: TSchema[K] extends ConnectorMarker<unknown, infer TConfig> ? TConfig : never;
  };

  /** Options for a single connector operation call. */
  export interface InvokeOptions {
    headers?: Record<string, string>;
    /** Per-call timeout in milliseconds; capped at the 5-minute default. */
    timeoutMs?: number;
  }

  export type ConnectorConnectionState = 'Connected' | 'ConsentRequired' | 'Provisioning' | 'NotRequired';

  export interface ConnectorConnectionStatus {
    connector: string;
    status: ConnectorConnectionState;
    consentUrl?: string;
    retryAfterSeconds?: number;
  }

  export interface ConnectorConnection {
    status(): Promise<ConnectorConnectionStatus>;
    connect(options?: { mode?: 'popup' | 'redirect'; pollIntervalMs?: number; timeoutMs?: number; signal?: AbortSignal }): Promise<ConnectorConnectionStatus>;
  }

  /** The typed `client.connectors.<name>` entry for an operation-catalog connector. */
  export type TypedConnectorClient<TCatalog extends OperationCatalog> = {
    [K in Exclude<keyof TCatalog & string, 'connection'>]: TCatalog[K] extends OperationDef<infer TIn, infer TOut>
      ? unknown extends TIn
        ? (input?: TIn, options?: InvokeOptions) => Promise<TOut>
        : (input: TIn, options?: InvokeOptions) => Promise<TOut>
      : never;
  } & {
    readonly connection: ConnectorConnection;
  };

  /** Runtime config passed per connector, mirrored from its generated `schema.ts`. */
  export interface ConnectorConfig {
    /** Connector type from `rayfin.yml`. */
    connector: ConnectorType;
    /** Optional CRUD allow-list (entity connectors only). */
    operations?: readonly ('read' | 'create' | 'update' | 'delete')[];
  }

  export interface OperationRuntime {}

  /** Runtime hooks for one connector, supplied by its connector package. */
  export interface ConnectorRuntime {
    operations?: Record<string, OperationRuntime>;
  }

  export type ConnectorsRuntime = Record<string, ConnectorRuntime>;

  export interface HostEnvironment {
    type: 'embedded' | 'standalone' | 'cli';
  }

  /** `client.connectors`: one typed client per schema entry. */
  export type TypedConnectorsApi<TSchema extends ConnectorsSchema> = {
    [K in keyof TSchema & string]: TSchema[K] extends ConnectorMarker<infer C> ? C : never;
  };

  export interface ConnectorsServiceOptions<TSchema extends ConnectorsSchema> {
    /** Configuration matching every connector's type in the declared schema. */
    configs: ConnectorConfigs<TSchema>;
    /** Operation middleware and decoders. Semantic model connectors need theirs here. */
    runtime?: ConnectorsRuntime;
    /** Execution environment; defaults to standalone in browsers. */
    host?: HostEnvironment;
  }

  /** Register typed connectors on a composed Rayfin client. */
  export function connectorsService<TSchema extends ConnectorsSchema>(
    options: ConnectorsServiceOptions<TSchema>,
  ): ClientServiceFactory<TypedConnectorsApi<TSchema>>;
}
