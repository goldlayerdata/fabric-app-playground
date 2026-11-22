import { useMemo } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEventCallback } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByCategory } from "@/queries/sales";

interface RevenueByCategoryChartProps {
  years?: number[];
  highlight?: string;
  onInteraction?: InteractionEventCallback;
}

export function RevenueByCategoryChart({ years, highlight, onInteraction }: RevenueByCategoryChartProps) {
  const theme = useCssTheme();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => revenueByCategory({ years, highlight }),
    [years, highlight],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  if (error) return <p role="alert">Could not load revenue by category: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return (
    <VegaVisual
      spec={vegaLiteSpec}
      data={dataTable}
      theme={theme}
      onInteraction={onInteraction}
      style={{ height: 320 }}
    />
  );
}
