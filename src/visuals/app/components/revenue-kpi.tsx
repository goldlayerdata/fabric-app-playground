import { useMemo } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { salesByYearKpi } from "@/queries/sales";

export function RevenueKpi() {
  const theme = useCssTheme();
  const { connection, query, columnMetadata, vegaLiteSpec } = salesByYearKpi();
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  if (error) return <p role="alert">Could not load revenue by year: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return <VegaVisual spec={vegaLiteSpec} data={dataTable} theme={theme} style={{ height: 180 }} />;
}
