// Pack files the playground writes verbatim, from the Rayfin CLI 2.0.0 (templates/universal-app/.agents/skills/<pack>/kit),
// MIT, Microsoft Corporation (see THIRD-PARTY-NOTICES.md). Remade with tools/wiring/write-pack-kits.mjs.

// data-modeling/kit/data/Item.ts -> packages/data/src/Item.ts
export const DATA_KIT_ITEM = `//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import {
  boolean,
  date,
  entity,
  role,
  text,
  uuid,
} from '@microsoft/rayfin-core';

/**
 * A starter entity — rename it, change the fields, keep the shape.
 *
 * The two parts worth keeping are the \`@role\` policy and \`owner_id\`. Together
 * they mean a signed-in user only ever sees their own rows, enforced server
 * side rather than by a filter in the UI. Drop them and every user reads every
 * row.
 *
 * \`owner_id\` is not filled in for you: set it to the signed-in user's id when
 * you create a record. The policy refuses any value that is not the caller's
 * own, so it cannot be forged. If a record should instead be readable by the
 * whole team, widen the policy here rather than removing it — an entity with no
 * access control is refused at validation time.
 *
 * Every \`@text\` carries an explicit \`max\`. Without one MSSQL gets
 * \`NVARCHAR(MAX)\`, and the metadata provider can then fail to build a GraphQL
 * schema — an "Internal server error" at runtime after a deploy that reported
 * success. Keep a bound on any string field you add.
 */
@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class Item {
  @uuid() id!: string;
  @text({ min: 1, max: 200 }) title!: string;
  @text({ optional: true, max: 2000 }) notes?: string;
  @boolean({ default: false }) done!: boolean;
  @date() createdAt!: Date;
  @text({ max: 200 }) owner_id!: string;
}
`;

// data-modeling/kit/data/schema.ts -> packages/data/src/index.ts
export const DATA_KIT_INDEX = `//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Item } from './Item.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

/**
 * The app's Rayfin data schema.
 *
 * \`UniversalAppSchema\` in \`@rayfin-app/shared\` is what makes
 * \`(await getRayfinClient()).data.<Entity>\` typed, so keep it in step with \`schema\`
 * below: a class registered in \`schema\` but missing from the shared type is
 * reachable at runtime and invisible to the compiler.
 *
 * To add an entity: declare it as a decorated class next to \`Item.ts\`, export it
 * here, add its record contract to \`@rayfin-app/shared\`, and register it in the
 * array. Every entity needs explicit access control — anonymous access is
 * refused at validation time. See the \`data-modeling\` skill.
 */
export type { UniversalAppSchema };
export { Item };

export const schema = [Item];
`;

// data-modeling/kit/shared/index.ts -> packages/shared/src/index.ts
export const SHARED_KIT_INDEX = `/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * \`@rayfin-app/data\`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */
export interface ItemRecord {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  createdAt: Date;
  owner_id: string;
}

export type UniversalAppSchema = {
  Item: ItemRecord;
};
`;

// functions-capability/kit/functions/src/function_app.ts -> packages/functions/src/function_app.ts
export const FUNCTIONS_KIT_APP = `import { UserDataFunctions } from '@microsoft/fabric-user-data-functions';

const udf = new UserDataFunctions();

udf.func(
  'helloWorld',
  (firstName: string, lastName: string): string =>
    \`Hello \${firstName} \${lastName}!\`,
  []
);
`;

// functions-capability/kit/functions/package.json -> packages/functions/package.json
export const FUNCTIONS_KIT_PACKAGE = `{
  "name": "@rayfin-app/functions",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/function_app.js",
  "exports": {
    ".": "./dist/function_app.js",
    "./types": {
      "types": "./dist/types.d.ts",
      "default": "./dist/types.js"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "build:watch": "tsc --build --watch",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@microsoft/fabric-user-data-functions": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "rimraf": "^6.0.0",
    "typescript": "~6.0.2"
  }
}
`;
