import { useMemo, useState } from "react";
import { DataGrid } from "@microsoft/fabric-datagrid";
import { useCssTheme } from "@microsoft/fabric-visuals";
import { getUniqueColumnValues, type DataTable, type InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { revenueByCategoryAndYear } from "@/queries/sales";

export function RevenueByCategoryMatrix() {
  const theme = useCssTheme();
  const [category, setCategory] = useState<string>();
  const { connection, query, columnMetadata } = revenueByCategoryAndYear();
  const { data, error } = useSemanticModelQuery({ connection, query });

  // The grid has no Columns well: turn one row per category and year into one row per category.
  const pivoted = useMemo((): DataTable | null => {
    if (data?.status !== "success") return null;
    const table = toDataTable(data.table, columnMetadata);
    const [categoryColumn, , revenueColumn] = table.columns;
    const years = getUniqueColumnValues(table, "dateYear");
    const byCategory = new Map<unknown, unknown[]>();
    for (const [name, year, revenue] of table.rows) {
      const row = byCategory.get(name) ?? [name, ...years.map(() => null)];
      row[1 + years.indexOf(year)] = revenue;
      byCategory.set(name, row);
    }
    return {
      columns: [categoryColumn, ...years.map((year) => ({ ...revenueColumn, name: `y${year}`, displayName: String(year) }))],
      rows: [...byCategory.values()],
    };
  }, [data, columnMetadata]);

  function handleRowInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setCategory(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "productCategoryName");
      setCategory(picked?.type === "set" ? String(picked.values[0]) : undefined);
    }
  }

  if (error) return <p role="alert">Could not load revenue by category and year: {error.message}</p>;
  if (!pivoted) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ overflow: "auto" }}>
        <DataGrid data={pivoted} theme={theme} onInteraction={handleRowInteraction} />
      </div>
      <p>{category === undefined ? "Nothing picked yet." : `Picked: ${category}. Click it again to clear.`}</p>
    </div>
  );
}
