import { useMemo, useState } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByStoreCountryPie } from "@/queries/sales";

export function RevenueByCountryPieChart() {
  const theme = useCssTheme();
  const [country, setCountry] = useState<string>();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => revenueByStoreCountryPie({ highlight: country }),
    [country],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  function handleSliceInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setCountry(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "storeCountryName");
      const value = picked?.type === "set" ? String(picked.values[0]) : undefined;
      // The chart is rebuilt when `highlight` changes, so it forgets the slice it reported.
      // A second click on the same slice therefore arrives as `select`: treat it as clear here.
      setCountry((current) => (current === value ? undefined : value));
    }
  }

  if (error) return <p role="alert">Could not load revenue by country: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <VegaVisual
        spec={vegaLiteSpec}
        data={dataTable}
        theme={theme}
        onInteraction={handleSliceInteraction}
        style={{ height: 320 }}
      />
      <p>{country === undefined ? "Nothing picked yet." : `Picked: ${country}. Click it again to clear.`}</p>
    </div>
  );
}
