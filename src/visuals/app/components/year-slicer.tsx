import { useMemo, useState } from "react";
import { DropdownSlicer, type DropdownSlicerInputParams } from "@microsoft/fabric-slicers";
import { useCssTheme } from "@microsoft/fabric-visuals";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { salesByYear } from "@/queries/sales";
import { RevenueByCategoryChart } from "./revenue-by-category-chart";

// fabric-slicers brings its own, newer fabric-visuals-core (5.4.0), so its events have
// a different shape from the 1.0.0 chart's. Take the type from the slicer itself.
type SlicerEvents = Parameters<NonNullable<DropdownSlicerInputParams["onInteraction"]>>[0];

export function YearSlicer() {
  const theme = useCssTheme();
  const [years, setYears] = useState<number[]>([]);
  const { connection, query, columnMetadata } = salesByYear();
  const { data, error } = useSemanticModelQuery({ connection, query });

  const table = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  function handleSlicerInteraction(events: SlicerEvents) {
    for (const event of events) {
      if (event.action === "clear") {
        setYears([]);
        continue;
      }
      const picked = event.selections
        .flatMap((s) => s.predicates)
        .find((p) => p.fieldId === "dateYear");
      if (picked?.type !== "set") continue;
      setYears(picked.values.flatMap((v) => (v.kind === "value" ? [Number(v.value)] : [])).sort());
    }
  }

  if (error) return <p role="alert">Could not load the years: {error.message}</p>;
  if (!table) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <DropdownSlicer data={table} column="dateYear" title="Year" theme={theme}
        onInteraction={handleSlicerInteraction} />
      <RevenueByCategoryChart years={years} />
    </div>
  );
}
