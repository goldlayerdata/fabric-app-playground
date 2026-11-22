import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./orders-and-revenue-by-store-country.dax?raw";
import spec from "./orders-and-revenue-by-store-country-scatter.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "store[CountryName]": { name: "storeCountryName", displayName: "Country" },
  "[Orders]": { name: "Orders", displayName: "Orders", format: "#,0" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

interface OrdersAndRevenueByStoreCountryScatterParams {
  /** Dim every point except this one (modifies the Vega-Lite spec). */
  highlight?: string;
}

export function ordersAndRevenueByStoreCountryScatter(params?: OrdersAndRevenueByStoreCountryScatterParams) {
  const vegaLiteSpec = {
    ...spec,
    params: [{ name: "highlight", value: params?.highlight ?? "" }],
  } as VisualizationSpec;

  return { connection, query, columnMetadata, vegaLiteSpec };
}
