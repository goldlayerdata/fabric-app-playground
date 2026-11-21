// Types from @microsoft/rayfin-data 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/graphql/types.d.ts, dist/graphql/GraphQLQueryBuilder.d.ts, dist/graphql/GraphQLEntityClient.d.ts,
// dist/client/DataApi.d.ts and dist/dataService.d.ts, with comments shortened. A subset: what a
// read through a connector uses (the response value of a field, the filter and sort inputs, a page
// of results), and the app's own data: `dataService`, the typed entity clients, the query chain and
// the mutations, for scalar fields. Left out: relationships and nested selections, aggregations,
// `upsert`, and Node's Buffer in ProjectionScalar. FilterValue leaves out the nested and
// relationship forms; `create` and `update` keep their first overload, and their input and result
// types are the scalar-field forms of the real ones.
declare module '@microsoft/rayfin-data' {
  import type { ClientServiceFactory } from '@microsoft/rayfin-lib';
  import type { PrimaryKeyField } from '@microsoft/rayfin-core';

  /** Scalar values that stay whole in a projection. */
  export type ProjectionScalar = string | number | boolean | Date | bigint;

  /**
   * Values returned by GraphQL without runtime field metadata: dates and booleans may arrive
   * as strings, so a `Date` field reads as `Date | string`.
   */
  export type GraphQLResponseValue<T> = unknown extends T
    ? T
    : T extends Date
      ? Date | string
      : T extends boolean
        ? T | `${T}`
        : T extends ProjectionScalar
          ? T
          : T extends readonly unknown[]
            ? { [K in keyof T]: GraphQLResponseValue<T[K]> }
            : T extends object
              ? { [K in keyof T]: GraphQLResponseValue<T[K]> }
              : T;

  /** Comparison operators for text fields. */
  export interface StringFilterInput {
    eq?: string;
    neq?: string;
    gt?: string;
    gte?: string;
    lt?: string;
    lte?: string;
    contains?: string;
    notContains?: string;
    startsWith?: string;
    endsWith?: string;
    isNull?: boolean;
    in?: string[];
  }

  /** Comparison operators for numeric fields. */
  export interface NumberFilterInput {
    eq?: number;
    neq?: number;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
    isNull?: boolean;
    in?: number[];
  }

  /** Comparison operators for boolean fields. */
  export interface BooleanFilterInput {
    eq?: boolean;
    neq?: boolean;
    isNull?: boolean;
    in?: boolean[];
  }

  /** Comparison operators for date fields. */
  export interface DateFilterInput {
    eq?: Date;
    neq?: Date;
    gt?: Date;
    gte?: Date;
    lt?: Date;
    lte?: Date;
    isNull?: boolean;
    in?: Date[];
  }

  export interface GenericFilterInput<T> {
    eq?: Partial<T>;
    neq?: Partial<T>;
  }

  export type FieldFilterInput<T> = T extends string
    ? StringFilterInput
    : T extends number
      ? NumberFilterInput
      : T extends boolean
        ? BooleanFilterInput
        : T extends Date
          ? DateFilterInput
          : GenericFilterInput<T>;

  /** A field's filter: a value, or operators such as `{ gt: 100 }`. */
  export type FilterValue<T, K extends keyof T> = T[K] | FieldFilterInput<NonNullable<T[K]>>;

  /** DAB-compliant filter input. */
  export type FilterInput<T> = {
    [K in keyof T]?: FilterValue<T, K>;
  } & {
    and?: FilterInput<T>[];
    or?: FilterInput<T>[];
  };

  /** DAB order by input: lowercase `'asc'` or `'desc'` per field. */
  export type OrderByInput<T> = {
    [K in keyof T]?: 'asc' | 'desc';
  };

  /** Forward-pagination result returned by `executePaginated()`. */
  export interface PagedResult<T> {
    /** The records in the current page. */
    items: T[];
    /** Whether another page is available after this one. */
    hasNextPage: boolean;
    /** Cursor to pass to `after()` to fetch the next page. */
    endCursor?: string;
    /** Total count of matching records, when provided by the server. */
    totalCount?: number;
  }
  // ---------------------------------------------------------------- the app's own data (data path)
  /** A map of entity names to entity types: `{ SalesTarget: SalesTarget }`. */
  export type EntitySchema = Record<string, any>;

  export type CleanEntityKeys<T> = keyof { [K in keyof T as T[K] extends Function ? never : K]: T[K] };

  export type Simplify<T> = { [K in keyof T]: T[K] } & {};

  type GraphQLPick<T, K extends keyof T> = { [P in K]: GraphQLResponseValue<T[P]> };

  /** The scalar fields a selection can name. */
  export type SelectionLeafKeys<T> = T extends object
    ? { [K in CleanEntityKeys<T>]-?: NonNullable<T[K]> extends ProjectionScalar ? K : never }[CleanEntityKeys<T>] & string
    : never;

  /** The field names `select([...])` accepts. */
  export type FieldSelection<T> = readonly SelectionLeafKeys<T>[];

  /** Only the primary key: what a read returns when nothing is selected. */
  export type PrimaryKeyOnly<T> = T extends unknown
    ? PrimaryKeyField extends keyof T
      ? { -readonly [P in PrimaryKeyField]-?: NonNullable<T[P]> }
      : { [K in PrimaryKeyField]: string }
    : never;

  /** A result row holds exactly the selected fields; an empty selection gives the key only. */
  export type SelectionResult<T, TFields extends FieldSelection<T>> = TFields extends readonly []
    ? GraphQLResponseValue<PrimaryKeyOnly<T>>
    : Simplify<GraphQLPick<T, Extract<keyof T, TFields[number]>>>;

  /** `create` input: every field the entity declares, with `id` optional (the server generates it). */
  export type CreateInput<T> = PrimaryKeyField extends keyof T ? Omit<T, PrimaryKeyField> & Partial<Pick<T, PrimaryKeyField>> : T;
  /** `update` input: a partial patch. */
  export type UpdateInput<T> = Partial<T>;
  /** Mutations find a row by its key only. */
  export type WhereUniqueInput<T> = { [K in PrimaryKeyField]: string };

  export type UnionKeys<T> = T extends unknown ? keyof T : never;
  /** Rejects keys the entity doesn't have. */
  export type NoExtraKeys<TInput, TShape> = Exclude<UnionKeys<TInput>, keyof TShape> extends never ? [] : [invalidKeys: never];

  /** What a mutation returns: the primary key plus the fields sent. */
  export type MutationResult<T, TInput> = GraphQLResponseValue<Simplify<PrimaryKeyOnly<T> & { [K in Extract<keyof T, keyof TInput>]: T[K] }>>;

  /** The query chain after `select`, `orderBy` or `first`. */
  export type RowQueryBuilder<TSchema extends EntitySchema, TEntity extends keyof TSchema, TResult = GraphQLResponseValue<PrimaryKeyOnly<TSchema[TEntity]>>> = {
    select<const TFields extends FieldSelection<TSchema[TEntity]>>(fields: TFields): RowQueryBuilder<TSchema, TEntity, SelectionResult<TSchema[TEntity], TFields>>;
    where(conditions: FilterInput<TSchema[TEntity]>): RowQueryBuilder<TSchema, TEntity, TResult>;
    orderBy(order: OrderByInput<TSchema[TEntity]>): RowQueryBuilder<TSchema, TEntity, TResult>;
    first(count: number): RowQueryBuilder<TSchema, TEntity, TResult>;
    after(cursor: string): RowQueryBuilder<TSchema, TEntity, TResult>;
    /** One page: 100 records unless `first` says otherwise. */
    execute(): Promise<TResult[]>;
    executePaginated(): Promise<PagedResult<TResult>>;
    findFirst(): Promise<TResult | null>;
  };

  /** The query chain after `where`. */
  export class GraphQLQueryBuilder<TSchema extends EntitySchema, TEntity extends keyof TSchema, TResult = PrimaryKeyOnly<TSchema[TEntity]>> {
    private constructor();
    select<const TFields extends FieldSelection<TSchema[TEntity]>>(fields: TFields): RowQueryBuilder<TSchema, TEntity, SelectionResult<TSchema[TEntity], TFields>>;
    where(conditions: FilterInput<TSchema[TEntity]>): this;
    orderBy(order: OrderByInput<TSchema[TEntity]>): RowQueryBuilder<TSchema, TEntity, GraphQLResponseValue<TResult>>;
    first(count: number): RowQueryBuilder<TSchema, TEntity, GraphQLResponseValue<TResult>>;
    after(cursor: string): RowQueryBuilder<TSchema, TEntity, GraphQLResponseValue<TResult>>;
    execute(): Promise<GraphQLResponseValue<TResult>[]>;
    executePaginated(): Promise<PagedResult<GraphQLResponseValue<TResult>>>;
    findFirst(): Promise<GraphQLResponseValue<TResult> | null>;
  }

  /** `client.data.<Entity>`: reads and writes for one entity. */
  export class GraphQLEntityClient<TSchema extends EntitySchema, TEntity extends keyof TSchema> {
    private constructor();
    /** Choose the fields to read. A read without `select` returns only `id`. */
    select<const TFields extends FieldSelection<TSchema[TEntity]>>(fields: TFields): RowQueryBuilder<TSchema, TEntity, SelectionResult<TSchema[TEntity], TFields>>;
    where(conditions: FilterInput<TSchema[TEntity]>): GraphQLQueryBuilder<TSchema, TEntity>;
    orderBy(order: OrderByInput<TSchema[TEntity]>): RowQueryBuilder<TSchema, TEntity>;
    first(count: number): RowQueryBuilder<TSchema, TEntity>;
    /** These return only the primary key. */
    findMany(filter?: FilterInput<TSchema[TEntity]>): Promise<GraphQLResponseValue<PrimaryKeyOnly<TSchema[TEntity]>>[]>;
    findFirst(filter?: FilterInput<TSchema[TEntity]>): Promise<GraphQLResponseValue<PrimaryKeyOnly<TSchema[TEntity]>> | null>;
    findById(id: string): Promise<GraphQLResponseValue<PrimaryKeyOnly<TSchema[TEntity]>> | null>;
    /** Create a record. `id` may be left out: the server generates it. Returns the key plus the fields sent. */
    create<const TInput extends CreateInput<TSchema[TEntity]>>(
      input: TInput,
      ..._invalidKeys: NoExtraKeys<TInput, CreateInput<TSchema[TEntity]>>
    ): Promise<MutationResult<TSchema[TEntity], TInput>>;
    /** A partial patch, found by `id` only. Returns the key plus the fields sent. */
    update<const TInput extends UpdateInput<TSchema[TEntity]>>(
      where: WhereUniqueInput<TSchema[TEntity]>,
      data: TInput,
      ..._invalidKeys: NoExtraKeys<TInput, UpdateInput<TSchema[TEntity]>>
    ): Promise<MutationResult<TSchema[TEntity], TInput>>;
    /** Delete a record by `id`. Returns the key. */
    delete(where: WhereUniqueInput<TSchema[TEntity]>): Promise<GraphQLResponseValue<PrimaryKeyOnly<TSchema[TEntity]>>>;
  }

  /** One typed client per entity in the schema. */
  export type TypedDataClients<TSchema extends EntitySchema> = { [K in keyof TSchema]: GraphQLEntityClient<TSchema, K> };

  /** The data API behind `client.data` (its own members left out here). */
  export class DataApi<TSchema extends EntitySchema = Record<string, any>> {
    private constructor();
    getEntityNames(): (keyof TSchema)[];
  }

  /**
   * Register typed app-owned data on a composed Rayfin client:
   * `services: { data: dataService<AppSchema>() }` adds `client.data`.
   */
  export function dataService<TSchema extends EntitySchema>(): ClientServiceFactory<DataApi<TSchema> & TypedDataClients<TSchema>>;
}
