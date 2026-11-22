import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./revenue-by-month.dax?raw";
import spec from "./revenue-by-month-area.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "date[YearMonthNumber]": { name: "MonthNumber", displayName: "Month number" },
  "date[YearMonthShort]": { name: "Month", displayName: "Month" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

interface RevenueByMonthAreaParams {
  /** Dim every marker except this one (modifies the Vega-Lite spec). */
  highlight?: string;
}

export function revenueByMonthArea(params?: RevenueByMonthAreaParams) {
  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? "" }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
