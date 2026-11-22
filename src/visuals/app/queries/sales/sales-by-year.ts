import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./sales-by-year.dax?raw";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "date[Year]": { name: "dateYear", displayName: "Year" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
  "[Orders]": { name: "Orders", displayName: "Orders", format: "#,0" },
};

export function salesByYear() {
  return { connection, query, columnMetadata };
}
