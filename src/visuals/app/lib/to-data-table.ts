//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------
// TEMPLATE FILE, not counted as code you write. Same function as the Rayfin 2.0 data-app template's
// src/lib/to-data-table.ts. One change: `QueryTable` comes from the stand-in hook,
// because @microsoft/fabric-app-data (which needs Fabric) is not installed here.

import type { QueryTable } from '@/hooks/use-semantic-model-query';
import type { ColumnDef, DataTable } from '@microsoft/fabric-visuals-core';

/**
 * Dictionary keyed by the original column name from the DAX query result.
 * Each value holds the `ColumnDef` metadata for that column.
 */
export type ColumnMetadataMap = Record<string, ColumnDef>;

/**
 * Merges a raw SDK query table with static column metadata to produce
 * a `DataTable` that `VegaVisual` and `DataGrid` accept directly.
 */
export function toDataTable(
  queryTable: QueryTable,
  columnMetadata: ColumnMetadataMap
): DataTable {
  const columns: ColumnDef[] = queryTable.columns.map((col) => {
    return columnMetadata[col.name] ?? { name: col.name };
  });

  return { columns, rows: queryTable.rows };
}
