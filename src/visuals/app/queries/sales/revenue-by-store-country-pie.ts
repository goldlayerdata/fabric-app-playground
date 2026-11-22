import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./revenue-by-store-country.dax?raw";
import spec from "./revenue-by-store-country-pie.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "store[CountryName]": { name: "storeCountryName", displayName: "Country" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

interface RevenueByStoreCountryPieParams {
  /** Dim every slice except this one (modifies the Vega-Lite spec). */
  highlight?: string;
}

export function revenueByStoreCountryPie(params?: RevenueByStoreCountryPieParams) {
  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? "" }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
