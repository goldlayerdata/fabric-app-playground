// Types from @microsoft/fabric-user-data-functions 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/userDataFunctions.d.ts, dist/types/rayfinContext.d.ts and dist/types/connection.d.ts with
// comments shortened. Checked against https://rayfin.ai/docs/functions and
// https://rayfin.ai/docs/functions/connections (Rayfin 2.0 pins this worker package to the CLI's
// version, 2.0.0: https://rayfin.ai/docs/functions#match-the-worker-package-to-the-cli).
// A minimal subset: `new UserDataFunctions()`, `udf.func(name, handler, [])`, `AudienceType`, and
// the part of `RayfinContext` a function with a connection uses (`ctx.user`, `ctx.Tokens`).
// Left out: udf.connection() and the Connection class (deprecated for new code: keep the third
// argument `[]`), udf.authClaims and AuthClaimsContext (dynamic claims), ctx.getDataClient()
// (needs @microsoft/rayfin-data's DataApi), ctx.Secrets / getSecret, ctx.getClaims(),
// ctx.getToken() (deprecated), ctx.sql (Experimental), the error classes, and FabricItem.
declare module '@microsoft/fabric-user-data-functions' {
  /** The only built-in audiences. Other Entra-protected resources are custom audiences. */
  export enum AudienceType {
    /** Fabric Lakehouse SQL analytics, Warehouse, SQL Database, Mirrored Database, Azure SQL. */
    Sql = 'Sql',
    /** Fabric OneLake files, and Azure Blob, Table or Queue Storage. */
    Storage = 'Storage',
    /** Microsoft Fabric REST APIs. */
    Fabric = 'Fabric',
    /** Azure AI Foundry endpoints. */
    AzureAI = 'AzureAI',
    /** Azure DevOps APIs. */
    ADO = 'ADO',
  }

  /**
   * A resource with no `AudienceType` member: its application id (a GUID), or an https:// or api://
   * resource URI. Whose token it is, the sources disagree: this package says the function item's own
   * identity, the Rayfin guide says the app identity.
   */
  export type CustomAudience = `https://${string}` | `api://${string}` | `${string}-${string}-${string}-${string}-${string}`;

  export type ConnectionAudience = AudienceType | CustomAudience;

  /** Pseudonymous caller identity. Treat as personal data. */
  export interface RayfinUser {
    /** The caller's subject id: the same value policies see as `claims.sub` and the frontend as `session.user.id`. */
    readonly id: string;
  }

  /**
   * What Rayfin supplies to a parameter annotated with this type, wherever it is declared (usually
   * first). Declare the audiences it needs as the second type argument:
   * `RayfinContext<AppSchema, AudienceType.Storage>`. The annotation is the declaration.
   */
  export class RayfinContext<
    TSchema extends Record<string, any> = Record<string, any>,
    TokenTypes extends ConnectionAudience = never,
  > {
    private constructor();
    /** Type-only: makes `TokenTypes` checked strictly. */
    readonly __audienceVariance?: (audiences: TokenTypes) => void;
    /** Type-only: keeps the schema type argument (the real class uses it in getDataClient()). */
    readonly __schema?: TSchema;
    /** The signed-in caller. Use `ctx.user.id` to stamp owner fields. */
    readonly user: Readonly<RayfinUser>;
    /**
     * Tokens for the declared audiences only (reading another one is a compile error). They are
     * the Fabric app identity's: for current Fabric apps, the owner of the Fabric app item. During
     * `rayfin dev` they are the local Functions host's sign-in, so test the deployed app too. A
     * declared audience that produced no token throws when read: "No token available for audience
     * '<Audience>'. Ensure a connection with this audience is declared." Never return a token to the
     * frontend.
     */
    readonly Tokens: Readonly<Record<TokenTypes, string>>;
  }

  /** Create one before any function is registered. */
  export class UserDataFunctions {
    constructor();
    /**
     * Registers a function. `name` becomes its route. Rayfin supplies the `RayfinContext`
     * parameter; callers pass the rest. Keep the third argument `[]` in new code: connections
     * passed there still work (generic ones join the annotated audiences) but add no typed tokens.
     */
    func(name: string, fn: (...args: any[]) => any, connections?: readonly unknown[]): void;
  }
}
