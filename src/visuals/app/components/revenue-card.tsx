import { useMemo } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueCard } from "@/queries/sales";

export function RevenueCard() {
  const theme = useCssTheme();
  const { connection, query, columnMetadata, vegaLiteSpec } = revenueCard();
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  if (error) return <p role="alert">Could not load revenue: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return <VegaVisual spec={vegaLiteSpec} data={dataTable} theme={theme} style={{ height: 140 }} />;
}
