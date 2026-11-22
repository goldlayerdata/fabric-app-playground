import { useMemo } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { marginPctGauge } from "@/queries/sales";

export function MarginGauge() {
  const theme = useCssTheme();
  const { connection, query, columnMetadata, vegaLiteSpec } = marginPctGauge();
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  if (error) return <p role="alert">Could not load the margin: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return <VegaVisual spec={vegaLiteSpec} data={dataTable} theme={theme} style={{ height: 240 }} />;
}
