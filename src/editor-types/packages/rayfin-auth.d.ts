// Types from @microsoft/rayfin-auth 2.0.0 (MIT, Microsoft Corporation), from dist/browserSession.d.ts
// (the function) and dist/Auth.d.ts (Auth, AuthOptions), with comments shortened. A subset: Auth and
// AuthOptions are reduced to the members a page uses here. In the data app template, Fabric sign-in
// itself comes from the companion package @microsoft/rayfin-auth-provider-fabric.
declare module '@microsoft/rayfin-auth' {
  import type { ClientAuthFactory } from '@microsoft/rayfin-lib';

  /** The session API exposed as `client.auth` (subset). */
  export interface Auth {
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
