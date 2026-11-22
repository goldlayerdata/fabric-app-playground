import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./revenue-by-category-and-year.dax?raw";
import spec from "./revenue-by-category-and-year-ribbon.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "product[CategoryName]": { name: "productCategoryName", displayName: "Category" },
  "date[Year]": { name: "dateYear", displayName: "Year" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

interface RevenueByCategoryAndYearRibbonParams {
  /** Dim every category except this one (modifies the Vega-Lite spec). */
  highlight?: string;
}

export function revenueByCategoryAndYearRibbon(params?: RevenueByCategoryAndYearRibbonParams) {
  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? "" }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
