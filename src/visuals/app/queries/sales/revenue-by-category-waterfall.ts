import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./revenue-by-category.dax?raw";
import spec from "./revenue-by-category-waterfall.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "product[CategoryName]": { name: "productCategoryName", displayName: "Category" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

interface RevenueByCategoryWaterfallParams {
  /** Dim every column except this one (modifies the Vega-Lite spec). */
  highlight?: string;
}

export function revenueByCategoryWaterfall(params?: RevenueByCategoryWaterfallParams) {
  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? "" }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
