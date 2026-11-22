import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./sales-by-year.dax?raw";
import spec from "./sales-by-year-columns.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "date[Year]": { name: "dateYear", displayName: "Year" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
  "[Orders]": { name: "Orders", displayName: "Orders", format: "#,0" },
};

interface SalesByYearColumnsParams {
  /** Dim every column except this one (modifies the Vega-Lite spec). */
  highlight?: number;
}

export function salesByYearColumns(params?: SalesByYearColumnsParams) {
  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? 0 }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
