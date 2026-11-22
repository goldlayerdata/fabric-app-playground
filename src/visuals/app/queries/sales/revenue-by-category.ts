import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./revenue-by-category.dax?raw";
import yearsQuery from "./revenue-by-category-for-years.dax?raw";
import spec from "./revenue-by-category.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "product[CategoryName]": { name: "productCategoryName", displayName: "Category" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

interface RevenueByCategoryParams {
  /** Only these years (modifies the DAX query). Empty or omitted: all years. */
  years?: number[];
  /** Dim every bar except this category (modifies the Vega-Lite spec). */
  highlight?: string;
}

export function revenueByCategory(params?: RevenueByCategoryParams) {
  const query = params?.years?.length
    ? yearsQuery.replace("__YEARS__", params.years.join(", "))
    : baseQuery;

  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? "" }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
