import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./revenue-by-category-and-year.dax?raw";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "product[CategoryName]": { name: "productCategoryName", displayName: "Category" },
  "date[Year]": { name: "dateYear", displayName: "Year" },
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

export function revenueByCategoryAndYear() {
  return { connection, query, columnMetadata };
}
