import { useMemo, useState } from "react";
import { DataGrid } from "@microsoft/fabric-datagrid";
import { useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { ordersAndRevenueByStoreCountry } from "@/queries/sales";

export function SalesByCountryTable() {
  const theme = useCssTheme();
  const [country, setCountry] = useState<string>();
  const { connection, query, columnMetadata } = ordersAndRevenueByStoreCountry();
  const { data, error } = useSemanticModelQuery({ connection, query });
  const dataTable = useMemo(
    () => (data?.status === "success" ? toDataTable(data.table, columnMetadata) : null),
    [data, columnMetadata],
  );

  function handleRowInteraction(events: InteractionEvent[]) {
    for (const event of events) {
      if (event.action === "clear") {
        setCountry(undefined);
        continue;
      }
      const picked = event.selections[0]?.predicates.find((p) => p.name === "storeCountryName");
      setCountry(picked?.type === "set" ? String(picked.values[0]) : undefined);
    }
  }

  if (error) return <p role="alert">Could not load sales by country: {error.message}</p>;
  if (!dataTable) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ overflow: "auto" }}>
        <DataGrid data={dataTable} theme={theme} onInteraction={handleRowInteraction} />
      </div>
      <p>{country === undefined ? "Nothing picked yet." : `Picked: ${country}. Click it again to clear.`}</p>
    </div>
  );
}
