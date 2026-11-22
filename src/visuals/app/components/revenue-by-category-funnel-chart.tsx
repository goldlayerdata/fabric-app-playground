import { useMemo, useState } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByCategoryFunnel } from "@/queries/sales";

export function RevenueByCategoryFunnelChart() {
  const theme = useCssTheme();
  const [category, setCategory] = useState<string>();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => revenueByCategoryFunnel({ highlight: category }),
    [category],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  function handleBarInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setCategory(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "productCategoryName");
      const value = picked?.type === "set" ? String(picked.values[0]) : undefined;
      // The chart is rebuilt when `highlight` changes, so it forgets the bar it reported.
      // A second click on the same bar therefore arrives as `select`: treat it as clear here.
      setCategory((current) => (current === value ? undefined : value));
    }
  }

  if (error) return <p role="alert">Could not load revenue by category: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <VegaVisual
        spec={vegaLiteSpec}
        data={dataTable}
        theme={theme}
        onInteraction={handleBarInteraction}
        style={{ height: 300 }}
      />
      <p>{category === undefined ? "Nothing picked yet." : `Picked: ${category}. Click it again to clear.`}</p>
    </div>
  );
}
