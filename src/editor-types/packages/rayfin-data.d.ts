// Types from @microsoft/rayfin-data 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/graphql/types.d.ts with comments shortened. A subset: what a connector entity read uses
// (the response value of a field, the filter and sort inputs, a page of results).
// ProjectionScalar leaves out Node's Buffer; FilterValue leaves out the nested and relationship forms.
declare module '@microsoft/rayfin-data' {
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
}
