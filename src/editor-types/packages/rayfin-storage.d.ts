// Types from @microsoft/rayfin-storage 2.0.0 and @microsoft/rayfin-core 2.0.0 (MIT, Microsoft Corporation),
// copied from rayfin-storage dist/StorageFolderClient.d.ts, dist/StorageClient.d.ts,
// dist/storageErrorCodes.d.ts and dist/storageService.d.ts, and from rayfin-core
// dist/storage-object.d.ts, dist/storage-constraints.d.ts, dist/options.d.ts (BlobFolderOptions,
// ByteSize, MimeGlob) and dist/decorators/experimental.d.ts (blob), with comments shortened.
// Checked against https://rayfin.ai/docs/reference/sdk/rayfin-storage, https://rayfin.ai/docs/storage
// and https://rayfin.ai/docs/storage/files.
// A subset. Left out: createStorageClient (it needs the raw ApiClient, and apps use storageService:
// https://rayfin.ai/docs/reference/sdk/rayfin-storage#createstorageclient-and-storageapi), the
// StorageApi constructor and its ServicePlugin base, the private members of StorageFolderClient,
// and the internal helpers mapOperationErrorCode / isRetryableStorageError.
// The folder declarations (blob, StorageObject, ContentTypes, the size helpers) live in
// @microsoft/rayfin-core, as in the real packages; they are added to that module below so they
// appear once Storage is installed. The third parameter of `role()` (the policy) is not declared
// here: it belongs to the @microsoft/rayfin-core subset in rayfin-core.d.ts.

declare module '@microsoft/rayfin-core' {
  /**
   * Declaration-only base class exposing the server-managed fields of a stored object, so a
   * folder's `@role()` policy can compare a claim with them (`claims.sub.eq(item.owner_id)`).
   * Extending it adds no metadata fields.
   */
  export abstract class StorageObject {
    /** Server-assigned object identifier. */
    readonly id: string;
    /** The uploader's `sub` claim. */
    readonly owner_id: string;
    /** The folder the object lives in. */
    readonly folder: string;
    /** The caller-facing path. */
    readonly path: string;
    /** The object name (final path segment). */
    readonly name: string;
    /** Size in bytes. */
    readonly size: number;
    readonly content_type: string;
    readonly cache_control: string;
    readonly content_disposition: string;
    readonly etag: string;
    /** ISO 8601. */
    readonly created_at: string;
    /** ISO 8601. */
    readonly updated_at: string;
    /** ISO 8601. */
    readonly last_accessed_at: string;
  }

  /** Bytes, unchanged. `bytes(1024) === 1024`. */
  export const bytes: (n: number) => number;
  /** Kibibytes to bytes. `kb(2) === 2048`. */
  export const kb: (n: number) => number;
  /** Mebibytes to bytes. `mb(2) === 2097152`. */
  export const mb: (n: number) => number;
  /** Gibibytes to bytes. `gb(1) === 1073741824`. */
  export const gb: (n: number) => number;

  /** Common content types for `@blob({ allowedContentTypes })`. */
  export const ContentTypes: {
    readonly AnyImage: 'image/*';
    readonly AnyVideo: 'video/*';
    readonly AnyAudio: 'audio/*';
    readonly AnyText: 'text/*';
    readonly Png: 'image/png';
    readonly Jpeg: 'image/jpeg';
    readonly Webp: 'image/webp';
    readonly Gif: 'image/gif';
    readonly Svg: 'image/svg+xml';
    readonly Pdf: 'application/pdf';
    readonly Json: 'application/json';
    readonly Csv: 'text/csv';
    readonly Zip: 'application/zip';
  };

  /** A byte size with a unit, such as `'2mb'`. Prefer the `mb()`-style helpers. */
  export type ByteSize = `${number}${'b' | 'kb' | 'mb' | 'gb'}`;

  /** A MIME glob, `type/subtype`, such as `'image/*'` or `'application/pdf'`. */
  export type MimeGlob = `${string}/${string}`;

  /** Options of `@blob()`. */
  export interface BlobFolderOptions {
    /** Folder name: 3-63 lowercase letters, digits or hyphens after normalization. Defaults to the normalized class name. */
    name?: string;
    /**
     * `'error'` (the default) rejects an upload to an existing path with `Conflict`; `'overwrite'`
     * replaces the object and requires an authenticated role with `update`.
     */
    onConflict?: 'error' | 'overwrite';
    /**
     * Maximum object size: a positive whole number of bytes, or a string with a binary unit
     * (`'2mb'` is 2 x 1024 x 1024). At most 5,000 MiB. Omit for the global service limit.
     */
    maxSize?: number | ByteSize;
    /** Allowed content types as MIME globs. Omit to allow any type. */
    allowedContentTypes?: MimeGlob[];
  }

  /**
   * Marks a class extending `StorageObject` as a Storage folder. Needs at least one authenticated
   * `@role()` rule. `@blob('profile-images')` is shorthand for `@blob({ name: 'profile-images' })`.
   */
  export function blob(
    folderNameOrOptions?: string | BlobFolderOptions,
  ): <T extends new (...args: any[]) => unknown>(_target: T, context: ClassDecoratorContext<T>) => void;
}

declare module '@microsoft/rayfin-storage' {
  import type { ClientServiceFactory } from '@microsoft/rayfin-lib';
  import type { StorageObject } from '@microsoft/rayfin-core';

  /** Stable error codes (`InvalidPrefix` is kept for earlier clients). */
  export const STORAGE_ERROR_CODES: readonly [
    'InvalidFolder',
    'InvalidPath',
    'InvalidName',
    'InvalidPrefix',
    'InvalidSasExpiry',
    'TooLarge',
    'UnsupportedContentType',
    'Conflict',
    'NotFound',
    'PermissionDenied',
    'Unauthenticated',
    'InvalidContinuation',
    'UploadSessionExpired',
    'CommitFailed',
    'RateLimited',
    'Unexpected',
    'Aborted',
    'MissingOrMalformedOperationId',
    'NoStorageEntitiesConfigured',
  ];
  export type StorageErrorCode = (typeof STORAGE_ERROR_CODES)[number];

  /** The error every Storage operation throws. */
  export interface StorageError extends Error {
    code: StorageErrorCode;
    status: number;
    correlationId: string;
    /** Present only when the transport returned a Response. */
    response?: Response;
    /**
     * `true` for statuses of 500 and above and for rate limiting. A recommendation only: the SDK
     * never retries, and calling the operation again starts it over.
     */
    retryable: boolean;
  }

  /** Narrows an unknown error to a `StorageError`. */
  export function isStorageError(error: unknown): error is StorageError;

  /** Object metadata returned by the service. */
  export interface StorageObjectRef {
    id: string;
    /** Folder name, after normalization. */
    folder: string;
    /** The complete relative path, including the file name. */
    path: string;
    /** The last segment of `path`. */
    name: string;
    /** Size in bytes, capped at `Number.MAX_SAFE_INTEGER`. */
    size: number;
    /** Exact size of larger objects. */
    sizeBig?: bigint;
    contentType?: string;
    contentDisposition?: string;
    cacheControl?: string;
    /** ISO 8601, when the service supplies it. */
    createdAt?: string;
    /** ISO 8601, when the service supplies it. */
    updatedAt?: string;
    lastAccessedAt?: string | null;
    etag?: string;
  }

  /** The app-specific fields of a folder type: everything but the built-in object fields. */
  export type StorageCustomFields<TObject> = Omit<TObject, keyof StorageObjectRef | keyof StorageObject>;

  export interface StorageUploadResult<TObject = StorageObjectRef> {
    /** Built from the request: `id` is empty, and `size` is 0 for a ReadableStream. */
    object: TObject;
    correlationId: string;
  }

  export interface StorageDownloadResult {
    stream: ReadableStream<Uint8Array>;
    /** The type OneLake reports. */
    contentType?: string;
    contentDisposition?: string;
    contentLength?: number;
    etag?: string;
    correlationId: string;
  }

  export interface StorageDeleteResult {
    success: boolean;
    deleted: number;
    correlationId: string;
  }

  export interface StorageListResult<TObject = StorageObjectRef> {
    items: TObject[];
    /** Pass it to the next `list()` for another page. */
    continuation?: string;
    correlationId: string;
  }

  export interface UploadOptions<TObject extends StorageObjectRef = StorageObjectRef> {
    signal?: AbortSignal;
    /** Overrides the type taken from Blob data. Other data defaults to `application/octet-stream`. */
    contentType?: string;
    contentDisposition?: string;
    cacheControl?: string;
    /** Lifetime of the temporary upload URL, in seconds (the service clamps it to 60-3600). */
    expiresInSeconds?: number;
    /** Custom metadata declared on the `@blob` class. Never the built-in `StorageObject` fields. */
    fields?: Partial<StorageCustomFields<TObject>>;
  }

  export interface DownloadOptions {
    signal?: AbortSignal;
    /** Lifetime of the temporary download URL, in seconds (server-clamped). */
    expiresInSeconds?: number;
  }

  export interface DeleteOptions {
    signal?: AbortSignal;
  }

  export interface ListOptions {
    limit?: number;
    continuation?: string;
    signal?: AbortSignal;
  }

  /**
   * One folder: `client.storage.<folder>`. Paths are complete paths inside the folder, segments
   * separated by `/`, with no leading or trailing `/`, no empty, `.` or `..` segment and no
   * backslash; a path that breaks a rule throws `InvalidName` (400) before any request.
   */
  export class StorageFolderClient<TObject extends StorageObjectRef = StorageObjectRef> {
    private constructor();
    upload(
      path: string,
      data: Blob | ArrayBuffer | Uint8Array | ReadableStream | string,
      options?: UploadOptions<TObject>,
    ): Promise<StorageUploadResult<TObject>>;
    download(path: string, options?: DownloadOptions): Promise<StorageDownloadResult>;
    /** Lists from the folder root, or from a directory path (an empty string is the root). */
    list(options?: ListOptions): Promise<StorageListResult<TObject>>;
    list(directoryPath: string, options?: ListOptions): Promise<StorageListResult<TObject>>;
    delete(path: string, options?: DeleteOptions): Promise<StorageDeleteResult>;
  }

  /** Folder names mapped to the `@blob` class or an object type listing its custom fields (`object` when none). */
  export type StorageSchema = Record<string, object>;

  /** The typed-folder API behind `client.storage` (subset). */
  export class StorageApi<TSchema extends StorageSchema = StorageSchema> {
    private constructor();
    getFolderClient<K extends keyof TSchema & string>(
      folderName: K,
    ): StorageFolderClient<StorageObjectRef & Partial<StorageCustomFields<TSchema[K]>>>;
    getInstantiatedFolderNames(): (keyof TSchema)[];
  }

  /** `client.storage`: one folder client per schema key. Custom fields are optional on returned objects. */
  export type StorageClient<TSchema extends StorageSchema> = {
    [K in keyof TSchema]: StorageFolderClient<StorageObjectRef & Partial<StorageCustomFields<TSchema[K]>>>;
  } & StorageApi<TSchema>;

  /** Registers typed folders on a client made with `RayfinClient.create({ services: { storage: storageService<AppStorageSchema>() } })`. */
  export function storageService<TSchema extends StorageSchema>(): ClientServiceFactory<StorageClient<TSchema>>;
}
