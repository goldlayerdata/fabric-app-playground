import { useMemo, useState } from "react";
import { DataGrid } from "@microsoft/fabric-datagrid";
import { useCssTheme } from "@microsoft/fabric-visuals";
import { filterRows, sliceRows, type InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByCategory, revenueByCategoryAndYear } from "@/queries/sales";
import { RevenueByCategoryChart } from "./revenue-by-category-chart";

const byCategory = revenueByCategory();
const byYear = revenueByCategoryAndYear();

export function CategoryCrossFilter() {
  const theme = useCssTheme();
  const [category, setCategory] = useState<string>();
  const top = useSemanticModelQuery({ connection: byCategory.connection, query: byCategory.query });
  const years = useSemanticModelQuery({ connection: byYear.connection, query: byYear.query });

  // No bar picked: the top 5 categories. A bar picked: that category, year by year.
  const table = useMemo(() => {
    if (category && years.data?.status === "success") {
      const all = toDataTable(years.data.table, byYear.columnMetadata);
      const col = all.columns.findIndex((c) => c.name === "productCategoryName");
      return filterRows(all, (row) => row[col] === category);
    }
    if (top.data?.status === "success") {
      return sliceRows(toDataTable(top.data.table, byCategory.columnMetadata), 0, 5);
    }
    return null;
  }, [category, years.data, top.data]);

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

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <RevenueByCategoryChart highlight={category} onInteraction={handleBarInteraction} />
      <div style={{ overflow: "auto" }}>
        {table && <DataGrid data={table} theme={theme} />}
      </div>
    </div>
  );
}
