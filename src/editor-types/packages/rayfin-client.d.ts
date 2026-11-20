// Types from @microsoft/rayfin-client and @microsoft/rayfin-lib 2.0.0 (MIT, Microsoft Corporation),
// copied from rayfin-client dist/client.d.ts and rayfin-lib dist/ClientService.d.ts and
// dist/ApiClient.d.ts, with comments shortened. A subset: what creating a client uses.
declare module '@microsoft/rayfin-lib' {
  /** The composed client's HTTP transport (opaque here). */
  export interface ApiClient {}

  export interface ClientLifecycle {
    onDispose(cleanup: () => void): void;
  }

  /** Creates a service using the composed client's authenticated HTTP transport. Returns synchronously. */
  export type ClientServiceFactory<TService extends object = object> = ((
    http: ApiClient,
    lifecycle: ClientLifecycle,
  ) => Exclude<TService, PromiseLike<unknown>>) & {
    readonly __synchronousServiceFactory?: true;
  };

  /** Attaches an authentication mode to a composed client's HTTP transport. */
  export type ClientAuthFactory<TAuth extends object | undefined = object | undefined> = (
    http: ApiClient,
    lifecycle: ClientLifecycle,
  ) => TAuth;

  export interface ApiClientConfig {
    /** Base URL of the Rayfin backend the client targets. */
    baseUrl: string;
    /** Publishable key used for service-level authentication. Required. */
    publishableKey: string;
    functionsBaseUrl?: string;
    headers?: Record<string, string>;
    moniker?: string;
    /** Default request timeout in milliseconds (defaults to 30000). */
    timeout?: number;
  }
}

declare module '@microsoft/rayfin-client' {
  import type { ApiClientConfig, ClientAuthFactory, ClientServiceFactory } from '@microsoft/rayfin-lib';

  /** Subset: the real union has more names, and the real types reject a service using one. */
  export type ReservedServiceName = 'auth' | 'runtimeConfig' | 'dispose' | 'constructor' | 'prototype' | '__proto__' | 'then' | 'catch' | 'finally';

  /** Service factories keyed by the namespaces they expose on a client. */
  export type ClientServices = Record<string, ClientServiceFactory>;

  /** Readonly service APIs inferred from their registered factories. */
  export type ClientServiceApis<TServices extends ClientServices> = {
    readonly [K in keyof TServices]: ReturnType<TServices[K]>;
  };

  /** A composed client with exactly its registered services and session API. */
  export type ComposedRayfinClient<TServices extends ClientServices = {}, TAuth extends object | undefined = undefined> = RayfinClient &
    ClientServiceApis<TServices> &
    ([TAuth] extends [undefined] ? {} : { readonly auth: TAuth });

  /** Configuration for {@link RayfinClient.create}. */
  export interface RayfinClientConfig<TAuth extends object | undefined = object | undefined, TServices extends ClientServices = {}>
    extends ApiClientConfig {
    /** Authentication adapter, such as `browserSession` or `suppliedToken`. */
    auth: ClientAuthFactory<TAuth>;
    /** Synchronous factories for the service namespaces this client exposes. */
    services?: ClientServices & TServices;
  }

  /** One application client, composed from independently typed capabilities. */
  export class RayfinClient {
    private constructor();
    /** Create a client with exactly the service and authentication APIs selected. */
    static create<TAuth extends object | undefined, const TServices extends ClientServices = {}>(
      config: RayfinClientConfig<TAuth, TServices>,
    ): ComposedRayfinClient<TServices, TAuth>;
    /** Release local resources once. Does not sign out. */
    dispose(): void;
  }

  export interface SuppliedTokenOptions {
    accessToken?: string | (() => string | null | Promise<string | null>);
  }

  /** Authenticate without a browser session; token refresh is the provider's job. */
  export function suppliedToken(options?: SuppliedTokenOptions): ClientAuthFactory<undefined>;
}
