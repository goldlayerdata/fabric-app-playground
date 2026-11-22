import { useMemo, useState } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { salesByYearCombo } from "@/queries/sales";

export function RevenueAndOrdersComboChart() {
  const theme = useCssTheme();
  const [year, setYear] = useState<number>();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => salesByYearCombo({ highlight: year }),
    [year],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  function handleColumnInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setYear(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "dateYear");
      const value = picked?.type === "set" ? Number(picked.values[0]) : undefined;
      // The chart is rebuilt when `highlight` changes, so it forgets the column it reported.
      // A second click on the same column therefore arrives as `select`: treat it as clear here.
      setYear((current) => (current === value ? undefined : value));
    }
  }

  if (error) return <p role="alert">Could not load revenue and orders by year: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <VegaVisual
        spec={vegaLiteSpec}
        data={dataTable}
        theme={theme}
        onInteraction={handleColumnInteraction}
        style={{ height: 320 }}
      />
      <p>{year === undefined ? "Nothing picked yet." : `Picked: ${year}. Click it again to clear.`}</p>
    </div>
  );
}
