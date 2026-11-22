import { useMemo, useState } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { DataTable, InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByCategoryWaterfall } from "@/queries/sales";

export function RevenueByCategoryWaterfallChart() {
  const theme = useCssTheme();
  const [category, setCategory] = useState<string>();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => revenueByCategoryWaterfall({ highlight: category }),
    [category],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });

  // Vega-Lite has no waterfall mark: each column needs the running total before and after it.
  const steps = useMemo((): DataTable | null => {
    if (data?.status !== "success") return null;
    const table = toDataTable(data.table, columnMetadata);
    let runningTotal = 0;
    const rows = table.rows.map(([name, revenue]) => {
      const start = runningTotal;
      runningTotal += Number(revenue);
      return [name, revenue, start, runningTotal, "Increase"];
    });
    rows.push(["Total", runningTotal, 0, runningTotal, "Total"]);
    const money = { format: "$#,0" };
    return {
      columns: [...table.columns, { name: "Start", ...money }, { name: "End", ...money }, { name: "Kind" }],
      rows,
    };
  }, [data, columnMetadata]);

  function handleColumnInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setCategory(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "productCategoryName");
      const value = picked?.type === "set" ? String(picked.values[0]) : undefined;
      // The chart is rebuilt when `highlight` changes, so it forgets the column it reported.
      // A second click on the same column therefore arrives as `select`: treat it as clear here.
      setCategory((current) => (current === value ? undefined : value));
    }
  }

  if (error) return <p role="alert">Could not load revenue by category: {error.message}</p>;
  if (!steps) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <VegaVisual
        spec={vegaLiteSpec}
        data={steps}
        theme={theme}
        onInteraction={handleColumnInteraction}
        style={{ height: 360 }}
      />
      <p>{category === undefined ? "Nothing picked yet." : `Picked: ${category}. Click it again to clear.`}</p>
    </div>
  );
}
