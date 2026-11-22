import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./sales-by-year.dax?raw";
import spec from "./sales-by-year-kpi.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "date[Year]": { name: "Year", displayName: "Year" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
  "[Orders]": { name: "Orders", displayName: "Orders", format: "#,0" },
};

const vegaLiteSpec = spec as VisualizationSpec;

export function salesByYearKpi() {
  return { connection, query, columnMetadata, vegaLiteSpec };
}
