// Types from @microsoft/fabric-user-data-functions 2.0.0 (MIT, Microsoft Corporation), copied from
// dist/userDataFunctions.d.ts and dist/types/rayfinContext.d.ts with comments shortened, and checked
// against https://rayfin.ai/docs/auth/dynamic-claims. The dynamic-claims part of the package, added to
// the subset in fabric-user-data-functions.d.ts (which leaves it out): `udf.authClaims`, what a claims
// function receives (`AuthClaimsContext`) and what it returns. Left out: `AuthClaimsContext & WithSql`
// (the overload with `ctx.sql`, Experimental) and `SignInDeniedError`.
declare module '@microsoft/fabric-user-data-functions' {
  /**
   * The identity handed to the `udf.authClaims` provider: populated by the host from the
   * already-validated base token, never supplied by the caller, and frozen.
   */
  export interface AuthClaimsIdentity {
    /** The user's unique identifier (the base `sub` claim). */
    readonly userId: string;
    /** The user's email address. */
    readonly email: string;
  }

  /** What a `udf.authClaims` provider receives. It has no data client and no tokens. */
  export interface AuthClaimsContext {
    /** Host-populated identity from the completed sign-in; immutable, never caller-supplied. */
    readonly auth: AuthClaimsIdentity;
    /** Reads an app secret for external entitlement lookups. */
    getSecret(name: string): string | undefined;
    /**
     * Refuses this sign-in on purpose: the backend answers 403 and mints no token. The reason can
     * be shown to the user, so keep secrets and other users' data out of it.
     */
    denySignIn(reason?: string): never;
  }

  /** What a `udf.authClaims` provider returns: a flat record of custom claim values. */
  export type AuthClaimsResult = Record<string, string | number | boolean>;

  interface UserDataFunctions {
    /**
     * Registers the app's claims provider (at most one, written inline). Rayfin calls it each time
     * it mints an access token, at sign-in and refresh, and adds what it returns to the token.
     */
    authClaims(handler: (ctx: AuthClaimsContext) => AuthClaimsResult | Promise<AuthClaimsResult>): void;
  }
}
