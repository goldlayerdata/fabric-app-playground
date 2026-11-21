// Types from @microsoft/rayfin-core 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/decorators/decorators.d.ts, dist/options.d.ts and dist/schema.d.ts with comments shortened.
// A subset: the class decorators `entity` and `role`, the field decorators a connector entity file
// uses (`date`, `decimal`, `int`, `text`), their options, and the primary-key phantom `Source()`
// carries. The other decorators (`uuid`, `boolean`, `one`, `many`…) are left out.
declare module '@microsoft/rayfin-core' {
  /** Type-only key under which `Source({ primaryKey })` records the entity's key on the class. */
  export const RayfinPrimaryKey: unique symbol;

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
   * `RayfinPrimaryKey` phantom and is treated as a connector entity (any key shape).
   */
  type EntityDecoratorTarget = constructor<IEntity> | (constructor<object> & { readonly [RayfinPrimaryKey]: readonly string[] });

  /** Actions a role may take (dist/options.d.ts). */
  export type SimpleAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | '*';

  /**
   * Declares what a built-in role may do with this entity. On a connector entity, the actions must
   * be a subset of the connector's `operations:`. (Its third parameter, the policy and field
   * options, is left out of this subset.)
   */
  export function role<TEntity extends object = object>(
    roleName: 'authenticated' | 'anonymous',
    actions: SimpleAction | SimpleAction[],
  ): (target: constructor<TEntity>, context: ClassDecoratorContext<constructor<TEntity>>) => void;

  /** Marks a class as an entity. `name` defaults to the class name. */
  export function entity(name?: string): <T extends EntityDecoratorTarget>(target: T, context: ClassDecoratorContext<T>) => void;

  /** Options common to every field. */
  export interface BaseFieldOptions<TJSType extends Scalars> {
    unique?: boolean;
    /** The field is optional (nullable). Fields are required by default. */
    optional?: boolean;
    default?: TJSType;
    /** SQL column name, when it differs from the property name (on the connector path, the existing table's column). */
    column?: string;
  }

  export interface TextFieldOptions extends BaseFieldOptions<string> {
    max?: number;
    min?: number;
    regex?: RegExp;
  }

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

  export interface DateFieldOptions extends BaseFieldOptions<Date> {}

  /** A text column. */
  export function text(options?: TextFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, string | undefined>) => void;
  /** A whole-number column. */
  export function int(options?: IntFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, number | undefined>) => void;
  /** A decimal column, such as a price. */
  export function decimal(options?: DecimalFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, number | undefined>) => void;
  /** A date or date-time column. */
  export function date(options?: DateFieldOptions): <T>(_: T, context: ClassFieldDecoratorContext<unknown, Date | undefined>) => void;
}
