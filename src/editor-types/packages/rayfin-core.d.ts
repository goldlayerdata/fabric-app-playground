// Types from @microsoft/rayfin-core 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/decorators/decorators.d.ts, dist/options.d.ts, dist/policy.d.ts, dist/claims-augmentation.d.ts,
// dist/schema.d.ts and dist/experimental/index.d.ts, with comments shortened. A subset: the class
// decorators `entity`, `role`, `authenticated` and `anonymous` with their options (policy, include,
// exclude), the policy DSL, the claims a policy can name, the field decorators the course uses (`uuid`, `text`, `int`,
// `decimal`, `date`, `boolean`, `set`), and the primary-key phantom `Source()` carries.
// Left out: `email`, `one`, `many`, `blob` and the storage types.
declare module '@microsoft/rayfin-core' {
  /** Type-only key under which `Source({ primaryKey })` records the entity's key on the class. */
  export const RayfinPrimaryKey: unique symbol;

  /** The primary key of every data-path entity. */
  export type PrimaryKeyField = 'id';

  /** Constructor type for a class producing instances of `T`. */
  export type constructor<T> = new (...args: unknown[]) => T;

  /** A data-path entity (the app's own database). */
  export interface IEntity {
    id?: string;
    [key: string]: any;
  }

  /** Maps Rayfin scalar keys to their TypeScript types (Buffer left out). */
  export interface ScalarMapping {
    string: string;
    number: number;
    boolean: boolean;
    Date: Date;
  }
  export type Scalars = ScalarMapping[keyof ScalarMapping];

  /** A class decorated with `@entity()` (opaque here). */
  export type EntityClass<T extends object = object> = constructor<T>;

  /**
   * Accepted `@entity()` targets. A class extending `Source({...})` carries the static
   * `RayfinPrimaryKey` phantom and is treated as a connector entity (any key shape). Every other
   * class is a data-path entity constrained by `IEntity`.
   */
  type EntityDecoratorTarget = constructor<IEntity> | (constructor<object> & { readonly [RayfinPrimaryKey]: readonly string[] });

  // ---------------------------------------------------------------- claims (dist/claims-augmentation.d.ts)
  /** The always-present base claims minted for every signed-in user. */
  export interface RayfinBaseClaims {
    /** The user's unique identifier (`sub`). */
    sub: string;
    /** The user's email address. */
    email: string;
    /** The user's role. */
    role: string;
  }

  /**
   * Augmentation target for an app's custom auth claims. The generated
   * `rayfin/auth/claims.generated.d.ts` merges the `udf.authClaims` return type into it.
   * Empty by default: an app with no claims function sees only the base claims.
   */
  export interface RayfinCustomClaims {}

  /** All claims on the signed-in user's token: base claims plus app-defined ones. */
  export type AllClaims = RayfinBaseClaims & RayfinCustomClaims;

  /**
   * Claims as the client's `Auth.getClaims()` returns them: every app-defined claim is a string
   * (a provider's `false` arrives as `'false'`). Server-side policies see the declared types.
   */
  export type ClientClaims = RayfinBaseClaims & { [K in keyof RayfinCustomClaims]: string };

  // ---------------------------------------------------------------- the policy DSL (dist/policy.d.ts)
  /** The names of claims available on the signed-in user's token. */
  export type ClaimName = Extract<keyof AllClaims, string>;

  /** A composable policy expression that serializes to a Data API builder policy predicate. */
  export interface PolicyExpression {
    toString(): string;
    /** Combines this expression with another using logical AND. */
    and(expr: PolicyExpression): PolicyExpression;
    /** Combines this expression with another using logical OR. */
    or(expr: PolicyExpression): PolicyExpression;
  }

  /** Base class for policy expressions, providing the `and`/`or` combinators. */
  export abstract class BaseExpression implements PolicyExpression {
    abstract toString(): string;
    and(expr: PolicyExpression): PolicyExpression;
    or(expr: PolicyExpression): PolicyExpression;
  }

  /** A reference to a claim on the signed-in user's token (for example, `claims.sub`). */
  export class ClaimRef<T extends ClaimName = ClaimName> extends BaseExpression {
    readonly name: T;
    constructor(name: T);
    /** An equality comparison (`claim eq value`). */
    eq(value: Operand): PolicyExpression;
    /** An inequality comparison (`claim ne value`). */
    neq(value: Operand): PolicyExpression;
    toString(): string;
  }

  /** A reference to a field on the target item (for example, `item.user_id`). */
  export class FieldRef extends BaseExpression {
    readonly name: string;
    constructor(name: string);
    /** An equality comparison (`field eq value`). */
    eq(value: Operand): PolicyExpression;
    /** An inequality comparison (`field ne value`). */
    neq(value: Operand): PolicyExpression;
    toString(): string;
  }

  /** A value on either side of a comparison: an expression, primitive, `Date`, or `null`. */
  export type Operand = BaseExpression | string | number | boolean | Date | null;

  /** A typed proxy over the target type's fields: each property name on `T`, and only those. */
  export type ItemProxy<T = unknown> = (T extends object ? { [K in keyof T]-?: FieldRef } : {}) & {
    readonly [Symbol.toStringTag]?: 'ItemProxy';
  };

  /** One `ClaimRef` per claim name: the base claims, plus the app's own once generated. */
  export type ClaimsDsl = { [K in ClaimName]-?: ClaimRef<K> };

  // ---------------------------------------------------------------- permissions (dist/options.d.ts)
  /** The actions a role can be granted on an entity. `'*'` grants all of them. */
  export type SimpleAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | '*';

  /** Options passed to the `@role()`, `@authenticated()` and `@anonymous()` decorators. */
  export interface RoleDeclarationOptions<TEntity extends object = object> {
    /** Builds a row-level policy from the request's claims and the target item. */
    policy?(claims: ClaimsDsl, item: ItemProxy<TEntity>): PolicyExpression;
    /** Field names the role may access. When set, all other fields are excluded. */
    include?: (keyof TEntity)[];
    /** Field names the role may not access. */
    exclude?: (keyof TEntity)[];
  }

  /** Declares what a built-in role may do with this entity. */
  export function role<TEntity extends object = object>(
    roleName: 'authenticated' | 'anonymous',
    actions: SimpleAction | SimpleAction[],
    options?: RoleDeclarationOptions<TEntity>,
  ): (target: constructor<TEntity>, context: ClassDecoratorContext<constructor<TEntity>>) => void;

  /** Shorthand for `@role('authenticated', actions, options)`: requires a signed-in user. */
  export function authenticated<TEntity extends object = object>(
    actions?: SimpleAction | SimpleAction[],
    options?: RoleDeclarationOptions<TEntity>,
  ): (target: constructor<TEntity>, context: ClassDecoratorContext<constructor<TEntity>>) => void;

  /**
   * Shorthand for `@role('anonymous', actions, options)`: public access without a session. On
   * Microsoft Fabric a tenant administrator must allow anonymous data access for Fabric Apps.
   */
  export function anonymous<TEntity extends object = object>(
    actions?: SimpleAction | SimpleAction[],
    options?: RoleDeclarationOptions<TEntity>,
  ): (target: constructor<TEntity>, context: ClassDecoratorContext<constructor<TEntity>>) => void;

  /** Marks a class as an entity. `name` defaults to the class name. */
  export function entity(name?: string): <T extends EntityDecoratorTarget>(target: T, context: ClassDecoratorContext<T>) => void;

  // ---------------------------------------------------------------- fields (dist/decorators/decorators.d.ts)
  /** Options common to every field. */
  export interface BaseFieldOptions<TJSType extends Scalars> {
    unique?: boolean;
    /** The field is optional (nullable). Fields are required by default. */
    optional?: boolean;
    default?: TJSType;
    /** SQL column name, when it differs from the property name. */
    column?: string;
  }

  export interface TextFieldOptions extends BaseFieldOptions<string> {
    max?: number;
    min?: number;
    regex?: RegExp;
  }

  export interface UUIDFieldOptions extends BaseFieldOptions<string> {}

  export interface IntFieldOptions extends BaseFieldOptions<number> {
    max?: number;
    min?: number;
  }

  export interface DecimalFieldOptions extends BaseFieldOptions<number> {
    max?: number;
    min?: number;
    /** Total number of digits. Must be defined together with `scale`. */
    precision?: number;
    /** Digits after the decimal point. Must be defined together with `precision`. */
    scale?: number;
  }

  export interface BooleanFieldOptions extends BaseFieldOptions<boolean> {}

  export interface DateFieldOptions extends BaseFieldOptions<Date> {}

  export interface SetFieldOptions<T extends [string, ...string[]]> extends BaseFieldOptions<T[number]> {
    /** The allowed string values. */
    enum: T;
  }

  /** A text column. Without `max`, MSSQL gets NVARCHAR(MAX). */
  export function text(options?: TextFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, string | undefined>) => void;
  /** A UUID column. A field named `id` is the primary key. */
  export function uuid(options?: UUIDFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, string | undefined>) => void;
  /** A whole-number column. */
  export function int(options?: IntFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, number | undefined>) => void;
  /** A decimal column, such as an amount. Defaults to DECIMAL(18,2). */
  export function decimal(options?: DecimalFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, number | undefined>) => void;
  /** A true/false column. */
  export function boolean(options?: BooleanFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, boolean | undefined>) => void;
  /** A date or date-time column. */
  export function date(options?: DateFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, Date | undefined>) => void;
  /** A string enum: one of the given values. */
  export function set<T extends [string, ...string[]]>(
    ...values: T
  ): (target: unknown, context: ClassFieldDecoratorContext<unknown, T[number] | undefined>) => void;
  export function set<T extends [string, ...string[]]>(
    options: SetFieldOptions<T>,
  ): (target: unknown, context: ClassFieldDecoratorContext<unknown, T[number] | undefined>) => void;
  export function set<T extends [string, ...string[]]>(
    options: Omit<SetFieldOptions<T>, 'enum'>,
    ...values: T
  ): (target: unknown, context: ClassFieldDecoratorContext<unknown, T[number] | undefined>) => void;
}

// dist/experimental/index.d.ts: the claims types again, from the package's experimental entry. The generated
// rayfin/auth/claims.generated.d.ts augments this module; it merges into the same RayfinCustomClaims.
declare module '@microsoft/rayfin-core/experimental/index' {
  export type { RayfinBaseClaims, RayfinCustomClaims, AllClaims, ClientClaims, ClaimsDsl } from '@microsoft/rayfin-core';
  export { ClaimRef } from '@microsoft/rayfin-core';
}
