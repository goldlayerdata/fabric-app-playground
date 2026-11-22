import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./revenue.dax?raw";
import spec from "./revenue-card.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "[Revenue]": { name: "Revenue", displayName: "Revenue", format: "$#,0" },
};

const vegaLiteSpec = spec as VisualizationSpec;

export function revenueCard() {
  return { connection, query, columnMetadata, vegaLiteSpec };
}
