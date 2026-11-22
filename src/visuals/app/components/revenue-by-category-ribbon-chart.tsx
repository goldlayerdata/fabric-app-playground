import { useMemo, useState } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { getUniqueColumnValues, type DataTable, type InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByCategoryAndYearRibbon } from "@/queries/sales";

export function RevenueByCategoryRibbonChart() {
  const theme = useCssTheme();
  const [category, setCategory] = useState<string>();
  const { connection, query, columnMetadata, vegaLiteSpec } = useMemo(
    () => revenueByCategoryAndYearRibbon({ highlight: category }),
    [category],
  );
  const { data, error } = useSemanticModelQuery({ connection, query });

  // Vega-Lite has no ribbon mark: rank the categories inside every year, smallest first,
  // and work out where each one starts and ends in its column.
  const ranked = useMemo((): DataTable | null => {
    if (data?.status !== "success") return null;
    const table = toDataTable(data.table, columnMetadata);
    const rows = getUniqueColumnValues(table, "dateYear").flatMap((year) => {
      let runningTotal = 0;
      return table.rows
        .filter((row) => row[1] === year)
        .sort((a, b) => Number(a[2]) - Number(b[2]))
        .map(([name, , revenue]) => {
          const start = runningTotal;
          runningTotal += Number(revenue);
          return [name, year, revenue, start, runningTotal];
        });
    });
    const money = { format: "$#,0" };
    return { columns: [...table.columns, { name: "Start", ...money }, { name: "End", ...money }], rows };
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

  if (error) return <p role="alert">Could not load revenue by category and year: {error.message}</p>;
  if (!ranked) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <VegaVisual
        spec={vegaLiteSpec}
        data={ranked}
        theme={theme}
        onInteraction={handleColumnInteraction}
        style={{ height: 360 }}
      />
      <p>{category === undefined ? "Nothing picked yet." : `Picked: ${category}. Click it again to clear.`}</p>
    </div>
  );
}
