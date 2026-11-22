import { useMemo, useState } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByMonthArea } from "@/queries/sales";

export function RevenueByMonthAreaChart() {
  const theme = useCssTheme();
  const [month, setMonth] = useState<string>();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => revenueByMonthArea({ highlight: month }),
    [month],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  function handleMarkerInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setMonth(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "Month");
      const value = picked?.type === "set" ? String(picked.values[0]) : undefined;
      // The chart is rebuilt when `highlight` changes, so it forgets the marker it reported.
      // A second click on the same marker therefore arrives as `select`: treat it as clear here.
      setMonth((current) => (current === value ? undefined : value));
    }
  }

  if (error) return <p role="alert">Could not load revenue by month: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <VegaVisual
        spec={vegaLiteSpec}
        data={dataTable}
        theme={theme}
        onInteraction={handleMarkerInteraction}
        style={{ height: 320 }}
      />
      <p>{month === undefined ? "Nothing picked yet." : `Picked: ${month}. Click it again to clear.`}</p>
    </div>
  );
}
