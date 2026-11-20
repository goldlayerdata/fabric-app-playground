// Types from @microsoft/rayfin-connector-fabric-semanticmodel 2.0.0 (MIT, Microsoft Corporation),
// copied from dist/queryResult.d.ts, dist/types.d.ts, dist/marker.d.ts and dist/runtime.d.ts with
// comments shortened. A subset: the result shape, the executeQuery input, the type marker and the
// runtime factory. FabricSemanticModelOptions keeps one of its options; all of them apply to the CLI path
// only (a browser app ignores them).
declare module '@microsoft/rayfin-connector-fabric-semanticmodel' {
  import type { ConnectorConfig, ConnectorMarker, ConnectorRuntime, OperationDef, TypedConnectorClient } from '@microsoft/rayfin-connectors';

  /** Input payload for the `executeQuery` operation. */
  export interface ExecuteQueryInput {
    /** A DAX query string. */
    query: string;
    /**
     * Cap the number of rows returned for this query. A truncated result comes back as an
     * error with category `'overflow'`, so it announces itself rather than looking complete.
     */
    resultSetRowCountLimit?: number;
  }

  export type QueryErrorCategory = 'api' | 'query' | 'network' | 'overflow' | 'unknown';

  /** A single column's metadata in a normalised query result. */
  export interface QueryColumn {
    /** Column name, e.g. `"Sales[Amount]"` or `"[Total]"`. */
    name: string;
    /** Power-BI-style dataType, e.g. `"Int64"`, `"String"`, `"DateTime"`. */
    dataType: string;
  }

  /** A normalised query result table. Each row is an array of values aligned with `columns`. */
  export interface QueryTable {
    /** Column definitions in display order. */
    columns: QueryColumn[];
    /** Row-major data. Each row is an array of values aligned with `columns`. */
    rows: unknown[][];
  }

  /** Structured error in a normalised query result. */
  export interface QueryError {
    category: QueryErrorCategory;
    /** Human-readable message. */
    message: string;
    /** Error code, when known. */
    code?: string;
    /** Raw error detail for debugging. */
    details?: string;
    /** Remediation supplied by the producer, when the usual reading of a failure is misleading. */
    recoveryHint?: string;
  }

  /** Discriminated union representing a normalised query result. Check `status` before reading `table`. */
  export type SemanticModelQueryResult =
    | {
        status: 'success';
        table: QueryTable;
        /** Power BI `RequestId` header value, or empty string when unavailable. */
        requestId: string;
      }
    | {
        status: 'error';
        error: QueryError;
        requestId: string;
      };

  /** Union of all operation names this connector category supports. */
  export type FabricSemanticModelOperation = 'executeQuery';

  /** The full catalog of typed operations for `fabric-semanticmodel`. */
  export interface FabricSemanticModelOperationCatalog {
    executeQuery: OperationDef<ExecuteQueryInput, SemanticModelQueryResult>;
  }

  /**
   * Type marker for a `fabric-semanticmodel` connector instance.
   *
   * @example
   * type AppConnectorsSchema = {
   *   salesModel: FabricSemanticModel<'executeQuery'>;
   * };
   */
  export type FabricSemanticModel<TOps extends FabricSemanticModelOperation = FabricSemanticModelOperation> = ConnectorMarker<
    TypedConnectorClient<Pick<FabricSemanticModelOperationCatalog, TOps>>,
    ConnectorConfig & { connector: 'fabric-semanticmodel' }
  > & {
    readonly __operations?: Pick<FabricSemanticModelOperationCatalog, TOps>;
  };

  /**
   * Options accepted by {@link fabricSemanticModel} (subset): target model, endpoint and DAX query options
   * for the CLI path. A browser app doesn't use them; it caps rows per call, with
   * `executeQuery({ query, resultSetRowCountLimit })`.
   */
  export interface FabricSemanticModelOptions {
    /** Row cap for queries on the CLI path. */
    resultSetRowCountLimit?: number;
  }

  /**
   * Build the runtime hooks for a `fabric-semanticmodel` connector instance. Pass the result to
   * the `runtime` map of `connectorsService` under the same connector name used in the typed
   * schema. Without it, `executeQuery` returns the raw payload instead of a
   * `SemanticModelQueryResult`.
   */
  export function fabricSemanticModel(options?: FabricSemanticModelOptions): ConnectorRuntime;
}
