import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./margin-pct.dax?raw";
import spec from "./margin-pct-gauge.json";

const connection = "contoso"; // from fabric.yaml

/** Column metadata keyed by original DAX column name. */
const columnMetadata: ColumnMetadataMap = {
  "[Margin %]": { name: "MarginPct", displayName: "Margin %", format: "0.0%" },
};

const vegaLiteSpec = spec as VisualizationSpec;

export function marginPctGauge() {
  return { connection, query, columnMetadata, vegaLiteSpec };
}
