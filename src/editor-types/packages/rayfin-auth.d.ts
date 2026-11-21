// Types from @microsoft/rayfin-auth 2.0.0 (MIT, Microsoft Corporation), from dist/browserSession.d.ts
// (the function), dist/Auth.d.ts (Auth, AuthOptions) and dist/types.d.ts (OpaqueSession, User,
// TokenResponse), with comments shortened. A subset: the Auth class is declared as an interface of
// the members a page uses here (the session, its changes, the claims, refresh and sign-out), and
// AuthOptions is reduced to `storage`. In the data app template, Fabric sign-in itself comes
// from the companion package @microsoft/rayfin-auth-provider-fabric.
declare module '@microsoft/rayfin-auth' {
  import type { ClientAuthFactory } from '@microsoft/rayfin-lib';
  import type { ClientClaims } from '@microsoft/rayfin-core';

  /** A signed-in user. */
  export interface User {
    /** The unique identifier of the user: the value policies compare as `claims.sub`. */
    id: string;
    /** The user's email address. */
    email: string;
    /** The user's assigned role, when known. */
    role?: string;
    emailVerified?: boolean;
    emailVerifiedAt?: string | null;
  }

  /** The session surface returned to app code. Raw tokens stay inside the Auth SDK. */
  export interface OpaqueSession {
    /** The signed-in user, or `null` when signed out. */
    user: User | null;
    /** The user's role for the session, when known. */
    role?: string;
    /** When the access token expires. */
    expiresAt?: Date;
    /** Whether the session holds an access token that has not expired. */
    isAuthenticated: boolean;
    /** Whether the current session is an anonymous session. */
    isAnonymous: boolean;
  }

  /** What a refresh returns. */
  export interface TokenResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken?: string | null;
    scope?: string | null;
  }

  /** The session API exposed as `client.auth` (subset). */
  export interface Auth {
    /** The current session, synchronously. */
    getSession(): OpaqueSession;
    /** The current token's claims: base claims plus app-defined ones, each as a string. For UI hints only. */
    getClaims(): Promise<ClientClaims>;
    /** Calls back at each sign-in, sign-out and refresh. Returns a function that stops listening. */
    onSessionChange(callback: (session: OpaqueSession | null) => void): () => void;
    /** Mints a new access token, with the claims as they are now. */
    refreshSession(opts?: { timeout?: number; signal?: AbortSignal }): Promise<TokenResponse>;
    /** Revokes the current access token and clears the local session. */
    signOut(): Promise<void>;
  }

  export interface AuthOptions {
    /** Keep the session in browser storage between page loads. */
    storage?: boolean;
  }

  /**
   * Select browser-session authentication for a composed Rayfin client. Storage, refresh and multi-tab
   * synchronization are configured here. Exposes `client.auth`.
   */
  export function browserSession(options?: AuthOptions): ClientAuthFactory<Auth>;
}
