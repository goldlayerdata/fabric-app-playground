// TEMPLATE FILE (stand-in), not counted as code you write.
// Same signature and state handling as the Rayfin 2.0 data-app template's
// src/hooks/use-semantic-model-query.ts. The real hook sends the DAX to a Power BI semantic model
// through @microsoft/fabric-app-data. This stand-in answers from saved Contoso answers instead
// (the playground's snapshots), matched on connection + query text.

import { useState, useEffect, useCallback } from 'react';
import { answerQuery } from '../../sim/answer-book';

/** The `table` part of a query result: column names as the model returns them, then the rows. */
export interface QueryTable {
  columns: { name: string; dataType: string }[];
  rows: unknown[][];
}

export type CachedQueryResult =
  | { status: 'success'; table: QueryTable; fromCache: boolean }
  | { status: 'error'; error: { message: string } };

interface UseSemanticModelQueryOptions {
  /** Connection alias from fabric.yaml (e.g., "salesModel"). */
  connection: string;
  /** DAX query string. */
  query: string;
  /** If true, skip reading from cache (still writes the fresh result). */
  bypassCache?: boolean;
}

interface UseSemanticModelQueryResult {
  data: CachedQueryResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

export function useSemanticModelQuery(
  options: UseSemanticModelQueryOptions
): UseSemanticModelQueryResult {
  const { connection, query } = options;
  const [data, setData] = useState<CachedQueryResult | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const canExecute = Boolean(connection && query);

  const execute = useCallback(async () => {
    if (!canExecute) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await answerQuery(connection, query);
      setData(result);
      if (result.status === 'error') setError(new Error(result.error.message));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [connection, query, canExecute]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}
