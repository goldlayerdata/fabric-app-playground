// Types from @microsoft/rayfin-connector-fabric-graphql 2.0.0 (MIT, Microsoft Corporation),
// copied from dist/types.d.ts with comments shortened: the marker of the entity (SQL) connectors
// and the restricted client it resolves to. The package has no runtime code.
// RestrictedEntityClient keeps only the methods the subset of ConnectorEntityClient declares.
declare module '@microsoft/rayfin-connector-fabric-graphql' {
  import type {
    ConnectorConfig,
    ConnectorEntityClient,
    ConnectorMarker,
    ConnectorType,
    CrudOperation,
    METHODS_FOR_CRUD_OPERATION,
    WhereUniqueOf,
  } from '@microsoft/rayfin-connectors';

  export type { CrudOperation };

  type EntitySchema = Record<string, unknown>;

  /** The entity-client method names a CRUD operation allows. */
  type MethodsFor<TOp extends CrudOperation> = (typeof METHODS_FOR_CRUD_OPERATION)[TOp][number];

  /** Methods that need a declared primary key. */
  type ByKeyMethod = 'findByKey' | 'update' | 'delete';

  /** `true` when the entity declares a usable primary key. */
  type HasPrimaryKey<TSchema extends EntitySchema, TEntity extends keyof TSchema> = [WhereUniqueOf<TSchema[TEntity]>] extends [never] ? false : true;

  /**
   * The client for one entity, restricted to the methods two gates allow: the connector's
   * operations (`TOps`), and a primary key (a keyless entity has no `findByKey`, `update`
   * or `delete`).
   */
  export type RestrictedEntityClient<
    TSchema extends EntitySchema,
    TEntity extends keyof TSchema & string,
    TOps extends CrudOperation,
    TDialect extends ConnectorType = ConnectorType,
  > = Pick<
    ConnectorEntityClient<TSchema, TEntity, TDialect>,
    Extract<HasPrimaryKey<TSchema, TEntity> extends true ? MethodsFor<TOps> : Exclude<MethodsFor<TOps>, ByKeyMethod>, keyof ConnectorEntityClient<TSchema, TEntity, TDialect>>
  >;

  /** One restricted client per entity in the schema. */
  export type RestrictedDataApi<TSchema extends EntitySchema, TOps extends CrudOperation = CrudOperation, TDialect extends ConnectorType = ConnectorType> = {
    [K in keyof TSchema & string]: RestrictedEntityClient<TSchema, K, TOps, TDialect>;
  };

  /** The operations a connector config allows, from its literal `operations` tuple. */
  type OpsOf<TConfig extends ConnectorConfig> = NonNullable<TConfig['operations']>[number];

  /**
   * Marker for an entity connector (`fabric-sqlanalytics`, `fabric-warehouse`,
   * `fabric-sqldatabase`). Key each entity name to its constructor (`typeof Sales`), and pass
   * `typeof connectorConfig`, declared `as const satisfies ConnectorConfig`, so the operations
   * and the connector type survive as literals.
   */
  export interface GraphQLBackedConnector<TSchema extends EntitySchema = EntitySchema, TConfig extends ConnectorConfig = ConnectorConfig>
    extends ConnectorMarker<RestrictedDataApi<TSchema, OpsOf<TConfig>, TConfig['connector']>, TConfig> {
    readonly __schema?: TSchema;
  }
}
