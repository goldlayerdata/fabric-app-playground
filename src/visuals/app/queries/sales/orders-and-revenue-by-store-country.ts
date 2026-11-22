import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./orders-and-revenue-by-store-country.dax?raw";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "store[CountryName]": { name: "storeCountryName", displayName: "Country" },
  "[Orders]": { name: "Orders", displayName: "Orders", format: "#,0" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

export function ordersAndRevenueByStoreCountry() {
  return { connection, query, columnMetadata };
}
