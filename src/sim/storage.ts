// Simulated Rayfin Storage (Rayfin 2.0): `@blob` folders kept in this browser's memory, with the
// documented rules applied in the browser. Real Storage is remote-only, with no local service or
// emulator (https://rayfin.ai/docs/storage, https://rayfin.ai/docs/reference/known-limitations#storage-has-no-local-service):
// on Fabric the service checks all of this; here nothing leaves the page ("Files stay in this browser").
//
// What is mirrored, and where it comes from:
// - Operations, options and result shapes: https://rayfin.ai/docs/storage/files#operations and
//   https://rayfin.ai/docs/reference/sdk/rayfin-storage (installed: @microsoft/rayfin-storage 2.0.0).
// - Path rules, checked before any request (InvalidName, 400): https://rayfin.ai/docs/storage/files#path-rules
// - Folder options (name, onConflict, maxSize, allowedContentTypes): https://rayfin.ai/docs/storage#folder-options
// - At least one authenticated rule; no anonymous rules: https://rayfin.ai/docs/storage#declare-a-folder
// - `owner_id` is the uploader's `sub`: https://rayfin.ai/docs/storage#declare-a-folder
// - Error codes: https://rayfin.ai/docs/reference/sdk/rayfin-storage#errors
// - Status codes other than InvalidName's 400 come from the installed SDK's own map
//   (rayfin-storage dist/storageErrorCodes.js: TooLarge 400, UnsupportedContentType 400,
//   PermissionDenied 403, NotFound 404, Conflict 409, NoStorageEntitiesConfigured 400). Not in the
//   docs. That map has no entry for Unauthenticated: for a direct request the SDK takes the code from
//   the service's JSON and the status from the HTTP response, so Unauthenticated's status is NOT
//   DOCUMENTED (401 here).
// - Folder declaration checks (build time): the installed rayfin-core 2.0.0
//   dist/analysis/storage-config-generator.js, rules 6-9, with its messages: no anonymous rule;
//   'overwrite' needs a role granted update or '*'; maxSize a positive whole number of bytes, at
//   most 5,000 MiB (MAX_OBJECT_SIZE_BYTES, Azure's single Put Blob limit), size strings parsed by
//   parseByteSize (binary units, 1kb = 1024: BYTE_UNITS; any case, spaces and no unit allowed,
//   rounded to the nearest byte); MIME globs by isMimeGlob (token characters, `type/subtype`,
//   `type/*` or `*/*`); declared fields must not collide, ignoring case, with a built-in field
//   (user_metadata included).
// - Interrupted operations (https://learn.microsoft.com/fabric/apps/storage#work-with-files):
//   list() can include files in a `Deleting` state, which can't be uploaded or downloaded; an
//   interrupted upload or delete can block the path, "in some cases ... for about 70 minutes".
//   interrupt() plays both. NOT DOCUMENTED: the code and status then (here Conflict 409, the SDK's
//   mapping of UPLOAD_TARGET_LOCKED and DELETE_TARGET_LOCKED), and how a Deleting file shows in
//   list() (here: like any other file; the SDK's StorageObjectRef has no state field).
// - `retryable`: status >= 500 or RateLimited (installed SDK, isRetryableStorageError; docs: #errors).
//
// Policies: the caller passes each rule's policy as a plain function `(claims, item) => boolean`,
// evaluated against the signed-in persona's claims. (Real folders use the `@role()` policy DSL,
// `claims.sub.eq(item.owner_id)`: https://rayfin.ai/docs/data/permissions.)
//
// NOT DOCUMENTED, so chosen here and labelled where it shows:
// - which action each operation needs (here: upload = create, overwrite = update, list and
//   download = read, delete = delete). Only "overwrite requires an authenticated role with
//   update" is documented (https://rayfin.ai/docs/storage#folder-options);
// - whether list() hides objects the policy denies, or fails (here: hides them);
// - whether download/delete of another user's object answers PermissionDenied or NotFound
//   (here: PermissionDenied, after NotFound for a path that does not exist);
// - the order of the upload checks (here: size, type, conflict, then permission);
// - whether list(directoryPath) includes deeper levels (here: yes, it is a prefix: the SDK sends
//   the directory as `prefix`, installed StorageFolderClient.js), and the list order (here: by path);
// - the default list limit (here: 100), the service's size limit when maxSize is omitted ("the
//   global service limit", value not given; one object can't pass 5,000 MiB anyway; here: a
//   playground cap of 64 MiB to protect the tab), how MIME globs compare at upload (here: ignoring
//   case and any `;` parameters);
// - what the service does with built-in StorageObject fields sent in an upload's `fields` (here:
//   dropped, matched ignoring case; the build only checks declared fields);
// - the service's error messages (here: "Playground: …").
//
// PLAYGROUND ONLY: a policy here is a JavaScript function and can throw; that answers Unexpected
// (400). Real policies are a server-side rule language and can't throw.

import { pg, simulatedId } from './playground';

// ---------------------------------------------------------------- declarations

/** Claims of the signed-in person, as policies see them (`claims.sub`, `claims.email`, …). */
export type Claims = { readonly sub: string; readonly email?: string; readonly [claim: string]: unknown };

/** Actions a rule can grant (rayfin-core SimpleAction). */
export type SimpleAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | '*';

/** A stored object as a policy sees it: the StorageObject fields, plus custom metadata fields. */
export type PolicyItem = {
  readonly id: string;
  readonly owner_id: string;
  readonly folder: string;
  readonly path: string;
  readonly name: string;
  readonly size: number;
  readonly content_type: string;
  readonly cache_control: string;
  readonly content_disposition: string;
  readonly etag: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly last_accessed_at: string;
  readonly [field: string]: unknown;
};

/** One `@role()` rule on a folder. */
export type FolderRule = {
  role: 'authenticated' | 'anonymous';
  actions: SimpleAction | readonly SimpleAction[];
  /** `true` lets the request through. Evaluated in this browser; on Fabric, by the service. */
  policy?: (claims: Claims, item: PolicyItem) => boolean;
};

/** `@blob()` options (rayfin-core BlobFolderOptions). */
export type BlobOptions = {
  name?: string;
  onConflict?: 'error' | 'overwrite';
  maxSize?: number | `${number}${'b' | 'kb' | 'mb' | 'gb'}`;
  allowedContentTypes?: readonly `${string}/${string}`[];
};

/** A folder as the project declares it: the class, its `@blob()` options and its `@role()` rules. */
export type FolderDeclaration = {
  /** The class name, such as `Attachment`. The folder name defaults to it, normalized. */
  className: string;
  blob?: string | BlobOptions;
  rules: readonly FolderRule[];
  /** Names of the app fields declared on the class (such as `team_id`), for the build-time name check. */
  fields?: readonly string[];
};

/** A folder after the checks `storage apply` makes. */
export type Folder = {
  name: string;
  className: string;
  onConflict: 'error' | 'overwrite';
  /** In bytes; undefined when the folder sets none. */
  maxSize?: number;
  allowedContentTypes?: readonly string[];
  rules: readonly FolderRule[];
};

/** Thrown when a declaration would be refused by the build or `storage apply` (rayfin-core's wording where the package has one). */
export class FolderDeclarationError extends Error {
  override name = 'FolderDeclarationError';
}

/**
 * The folder-name normalization of the installed @microsoft/rayfin-storage 2.0.0
 * (dist/naming.js, normalizeContainerName; MIT, Microsoft Corporation): lowercase, `[a-z0-9-]`,
 * single hyphens, 3-63 characters. Docs: "3–63 lowercase letters, digits, or hyphens after
 * normalization" (https://rayfin.ai/docs/storage#folder-options); the client normalizes a schema
 * key the same way before a request (https://rayfin.ai/docs/reference/sdk/rayfin-storage#storageschema-and-storageclient).
 */
export function normalizeFolderName(input: string): string {
  let name = (input ?? '').toLowerCase();
  name = name.replace(/[^a-z0-9-]/g, '-');
  name = name.replace(/-+/g, '-');
  name = name.replace(/^-+|(?<!-)-+$/g, '');
  if (name.length === 0) name = 'container';
  if (name.length < 3) name = name.padEnd(3, '0');
  if (name.length > 63) name = name.substring(0, 63);
  name = name.replace(/^|(?<!-)-+$/g, '');
  if (name.length < 3) name = (name + '000').substring(0, 3);
  return name;
}

/** rayfin-core BYTE_UNITS: binary units. */
const BYTE_UNITS: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
/** rayfin-core MAX_OBJECT_SIZE_BYTES: 5,000 MiB, Azure's single Put Blob limit. */
export const MAX_OBJECT_SIZE_BYTES = 5_000 * 1024 * 1024;

/**
 * rayfin-core parseByteSize (storage-config-generator.js; MIT, Microsoft Corporation): a number is
 * returned as is; a string is trimmed and lowercased, then digits with at most one dot, then an
 * optional unit (spaces allowed between). Rounded to the nearest byte; NaN when malformed.
 */
export function parseByteSize(value: number | string): number {
  if (typeof value === 'number') return value;
  const s = String(value).trim().toLowerCase();
  let i = 0;
  let dotSeen = false;
  while (i < s.length) {
    const code = s.charCodeAt(i);
    if (code >= 48 && code <= 57) i++;
    else if (s[i] === '.' && !dotSeen) {
      dotSeen = true;
      i++;
    } else break;
  }
  const numPart = s.slice(0, i);
  const unitPart = s.slice(i).trim();
  if (numPart === '' || numPart === '.' || numPart.endsWith('.')) return Number.NaN;
  const multiplier = unitPart === '' ? 1 : BYTE_UNITS[unitPart];
  if (multiplier === undefined) return Number.NaN;
  return Math.round(Number.parseFloat(numPart) * multiplier);
}

/** Bytes from a `maxSize` value, checked as rule 8 of the installed rayfin-core does, with its messages. */
export function toBytes(size: number | string, className = 'Folder'): number {
  const bytes = parseByteSize(size);
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new FolderDeclarationError(
      `@blob('${className}'): maxSize must be a positive whole byte count or size string (e.g. '2mb'); got ${JSON.stringify(size)}.`,
    );
  }
  if (bytes > MAX_OBJECT_SIZE_BYTES) {
    throw new FolderDeclarationError(
      `@blob('${className}'): maxSize (${bytes} bytes) exceeds the maximum supported object size of ${MAX_OBJECT_SIZE_BYTES} bytes (5,000 MiB). Uploads are single-request PUTs and cannot exceed the Azure single-upload limit.`,
    );
  }
  return bytes;
}

const isMimeTokenRun = (s: string) => /^[0-9A-Za-z_.+-]+$/.test(s);
/** rayfin-core isMimeGlob: the full wildcard, or token characters as `type/subtype` or `type/*`. */
export function isMimeGlob(t: string): boolean {
  if (t === '*/*') return true;
  const slash = t.indexOf('/');
  if (slash <= 0 || t.indexOf('/', slash + 1) !== -1) return false;
  const subtype = t.slice(slash + 1);
  return isMimeTokenRun(t.slice(0, slash)) && (subtype === '*' || isMimeTokenRun(subtype));
}

/** rayfin-core INTRINSIC_OBJECT_FIELDS: the built-in StorageObject fields, `user_metadata` included. */
export const INTRINSIC_OBJECT_FIELDS: readonly string[] = [
  'id', 'owner_id', 'folder', 'path', 'name', 'size', 'content_type', 'cache_control', 'content_disposition', 'etag',
  'created_at', 'updated_at', 'last_accessed_at', 'user_metadata',
];

/** The size helpers of @microsoft/rayfin-core (binary units: kb(2) === 2048). */
export const bytes = (n: number) => n;
export const kb = (n: number) => n * 1024;
export const mb = (n: number) => n * 1024 ** 2;
export const gb = (n: number) => n * 1024 ** 3;

/** ContentTypes of @microsoft/rayfin-core 2.0.0 (dist/storage-constraints.d.ts). */
export const ContentTypes = {
  AnyImage: 'image/*',
  AnyVideo: 'video/*',
  AnyAudio: 'audio/*',
  AnyText: 'text/*',
  Png: 'image/png',
  Jpeg: 'image/jpeg',
  Webp: 'image/webp',
  Gif: 'image/gif',
  Svg: 'image/svg+xml',
  Pdf: 'application/pdf',
  Json: 'application/json',
  Csv: 'text/csv',
  Zip: 'application/zip',
} as const;

const asArray = (a: SimpleAction | readonly SimpleAction[]) => (typeof a === 'string' ? [a] : a);
const grants = (rule: FolderRule, action: SimpleAction) => asArray(rule.actions).some((a) => a === '*' || a === action);

/**
 * Checks a declaration the way `storage apply` and the decorator generator would, and returns the
 * folder. Refusals with the installed rayfin-core's messages: an anonymous rule (rule 6),
 * `onConflict: 'overwrite'` without a role granted `update` (rule 7), maxSize and MIME globs
 * (rule 8), declared fields named like a built-in field (rule 9). Documented, with playground
 * wording: a folder needs an authenticated rule (https://rayfin.ai/docs/storage#declare-a-folder).
 */
export function defineFolder(decl: FolderDeclaration): Folder {
  const opts: BlobOptions = typeof decl.blob === 'string' ? { name: decl.blob } : (decl.blob ?? {});
  const name = normalizeFolderName(opts.name ?? decl.className);
  const cls = decl.className;
  if (decl.rules.some((r) => r.role === 'anonymous')) {
    throw new FolderDeclarationError(
      `@blob('${cls}'): anonymous permissions are not supported for storage folders. Remove the anonymous role and grant access to the authenticated role instead.`,
    );
  }
  const authenticated = decl.rules.filter((r) => r.role === 'authenticated');
  if (authenticated.length === 0) {
    throw new FolderDeclarationError(pg(`Folder "${name}" needs at least one authenticated @role() rule; storage apply rejects it without one.`));
  }
  const onConflict = opts.onConflict ?? 'error';
  if (onConflict === 'overwrite' && !authenticated.some((r) => grants(r, 'update'))) {
    throw new FolderDeclarationError(
      `@blob('${cls}'): onConflict: 'overwrite' requires at least one authenticated role to grant the 'update' action. Add 'update' to a role or set onConflict: 'error'.`,
    );
  }
  const maxSize = opts.maxSize === undefined ? undefined : toBytes(opts.maxSize, cls);
  if (opts.allowedContentTypes) {
    const malformed = opts.allowedContentTypes.filter((t) => !isMimeGlob(t));
    if (malformed.length > 0) {
      throw new FolderDeclarationError(
        `@blob('${cls}'): allowedContentTypes contains malformed MIME glob(s): ${malformed.join(', ')}. Use forms like 'image/*' or 'application/pdf'.`,
      );
    }
  }
  const intrinsics = new Set(INTRINSIC_OBJECT_FIELDS.map((f) => f.toLowerCase()));
  for (const field of decl.fields ?? []) {
    if (intrinsics.has(field.toLowerCase())) {
      throw new FolderDeclarationError(
        `@blob('${cls}'): field '${field}' conflicts with a built-in StorageObject field. Built-in fields (${[...INTRINSIC_OBJECT_FIELDS].sort().join(', ')}) are managed by the service; rename the field on the @blob class.`,
      );
    }
  }
  return {
    name,
    className: decl.className,
    onConflict,
    maxSize,
    allowedContentTypes: opts.allowedContentTypes,
    rules: decl.rules,
  };
}

// ---------------------------------------------------------------- errors and results

/** Error codes of @microsoft/rayfin-storage 2.0.0 (STORAGE_ERROR_CODES). */
export const STORAGE_ERROR_CODES = [
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
] as const;
export type StorageErrorCode = (typeof STORAGE_ERROR_CODES)[number];

export interface StorageError extends Error {
  code: StorageErrorCode;
  status: number;
  correlationId: string;
  response?: Response;
  retryable: boolean;
}

/** Built like the SDK's buildError (an Error named StorageError with code, status, correlationId, retryable). */
function storageError(code: StorageErrorCode, status: number, message: string, correlationId: string): StorageError {
  const err = Object.assign(new Error(message), {
    code,
    status,
    correlationId,
    response: undefined,
    retryable: code === 'RateLimited' || status >= 500,
  }) as StorageError;
  err.name = 'StorageError';
  return err;
}

/** The SDK's type guard (installed dist/storageErrorCodes.js). */
export function isStorageError(error: unknown): error is StorageError {
  return (
    error instanceof Error &&
    'code' in error &&
    'status' in error &&
    'correlationId' in error &&
    typeof (error as StorageError).code === 'string' &&
    typeof (error as StorageError).status === 'number' &&
    typeof (error as StorageError).correlationId === 'string'
  );
}

/** StorageObjectRef, with custom fields flattened onto it as list() returns them. */
export type StorageObjectRef = {
  id: string;
  folder: string;
  path: string;
  name: string;
  size: number;
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  createdAt?: string;
  updatedAt?: string;
  lastAccessedAt?: string | null;
  etag?: string;
  [field: string]: unknown;
};

export type UploadData = Blob | ArrayBuffer | Uint8Array | ReadableStream | string;
export type UploadOptions = {
  signal?: AbortSignal;
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  expiresInSeconds?: number;
  fields?: Record<string, unknown>;
};
export type DownloadOptions = { signal?: AbortSignal; expiresInSeconds?: number };
export type DeleteOptions = { signal?: AbortSignal };
export type ListOptions = { limit?: number; continuation?: string; signal?: AbortSignal };

export type StorageUploadResult = { object: StorageObjectRef; correlationId: string };
export type StorageDownloadResult = {
  stream: ReadableStream<Uint8Array>;
  contentType?: string;
  contentDisposition?: string;
  contentLength?: number;
  etag?: string;
  correlationId: string;
};
export type StorageListResult = { items: StorageObjectRef[]; continuation?: string; correlationId: string };
export type StorageDeleteResult = { success: boolean; deleted: number; correlationId: string };

export interface FolderClient {
  upload(path: string, data: UploadData, options?: UploadOptions): Promise<StorageUploadResult>;
  download(path: string, options?: DownloadOptions): Promise<StorageDownloadResult>;
  list(options?: ListOptions): Promise<StorageListResult>;
  list(directoryPath: string, options?: ListOptions): Promise<StorageListResult>;
  delete(path: string, options?: DeleteOptions): Promise<StorageDeleteResult>;
}

/** One entry for the playground's Log: what was asked, by whom, and how it ended. */
export type StorageEvent = {
  op: 'upload' | 'download' | 'list' | 'delete';
  folder: string;
  path?: string;
  /** The caller's `sub`, or null when nobody is signed in. */
  by: string | null;
  ok: boolean;
  code?: StorageErrorCode;
  correlationId: string;
};

// ---------------------------------------------------------------- the simulated service

/**
 * Names an upload's `fields` can't set: the built-in fields the server manages
 * (https://rayfin.ai/docs/storage/files#store-typed-metadata), plus the SDK's envelope names, which
 * win over custom fields in list() anyway (flattenListItem). Matched ignoring case. NOT DOCUMENTED:
 * what the service does with them (here: dropped).
 */
const RESERVED_FIELDS = new Set(
  [...INTRINSIC_OBJECT_FIELDS, 'sizeBig', 'contentType', 'contentDisposition', 'cacheControl', 'createdAt', 'updatedAt', 'lastAccessedAt'].map((f) =>
    f.toLowerCase(),
  ),
);
/** About 70 minutes: how long an interrupted operation can block a path "in some cases" (Learn, storage#work-with-files). */
export const INTERRUPTED_BLOCK_MS = 70 * 60 * 1000;

/** NOT DOCUMENTED (the service limit): the playground's own cap, to keep the tab responsive. */
export const PLAYGROUND_MAX_BYTES = 64 * 1024 ** 2;
/** NOT DOCUMENTED: the default page size of list(). */
export const DEFAULT_LIST_LIMIT = 100;

type Stored = {
  id: string;
  owner_id: string;
  path: string;
  bytes: Uint8Array;
  contentType: string;
  contentDisposition?: string;
  cacheControl?: string;
  etag: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
  fields: Record<string, unknown>;
  /** Set by an interrupted delete. */
  state?: 'Deleting';
};

export type StorageSimOptions = {
  folders: readonly FolderDeclaration[];
  /** The signed-in persona's claims, or null when nobody is signed in. Read at each call. */
  getClaims: () => Claims | null;
  /** Called after every operation, for the Log. */
  onEvent?: (event: StorageEvent) => void;
  /** For tests: the clock. */
  now?: () => Date;
};

/** What the playground's Files panel shows: every object, whoever owns it. */
export type StoredSummary = {
  folder: string;
  path: string;
  owner_id: string;
  size: number;
  contentType: string;
  updatedAt: string;
  /** 'Deleting' after an interrupted delete, until a delete succeeds. */
  state?: 'Deleting';
};

export interface StorageSim {
  /** `client.storage`: a folder client per key, normalized like the SDK (`storage.Attachment` is folder `attachment`). */
  readonly storage: Record<string, FolderClient>;
  /** The folders after the apply checks. */
  readonly folders: readonly Folder[];
  /** A `ClientServiceFactory`-shaped function for `RayfinClient.create({ services: { storage } })` in the preview. */
  serviceFactory(): () => Record<string, FolderClient>;
  /** Every stored object (a panel view, not a Storage API). */
  inspect(): StoredSummary[];
  /**
   * Plays an interrupted operation on a path, as Learn describes it: 'delete' leaves the file listed
   * in a `Deleting` state (no upload or download) until a delete succeeds; either kind blocks
   * operations on the path for `blockedForMs` (default about 70 minutes, on the sim's clock).
   */
  interrupt(op: 'upload' | 'delete', folderKey: string, path: string, blockedForMs?: number): void;
  /** Empties every folder. */
  reset(): void;
}

/** The SDK's path check (installed StorageFolderClient.js parseObjectPath), with its message. */
function parsePath(path: unknown, cid: string): string {
  const p = typeof path === 'string' ? path : '';
  const segments = p.split('/');
  if (!p || p.includes('\\') || segments.some((s) => !s || s === '.' || s === '..')) {
    throw storageError('InvalidName', 400, 'Object path must contain non-empty segments separated by forward slashes.', cid);
  }
  return p;
}

/** The SDK's directory check for list() (installed validateListDirectoryPath): empty means the root. */
function checkDirectory(dir: string | undefined, cid: string) {
  if (dir === undefined || dir === '') return;
  const segments = dir.split('/');
  if (dir.includes('\\') || segments.some((s) => !s || s === '.' || s === '..')) {
    throw storageError('InvalidName', 400, 'List directory path must contain non-empty segments separated by forward slashes.', cid);
  }
}

/** Reads upload data into bytes, and the size the SDK would report (undefined for a stream). */
async function readData(data: UploadData): Promise<{ bytes: Uint8Array; declared?: number }> {
  if (typeof data === 'string') {
    const bytes = new TextEncoder().encode(data);
    return { bytes, declared: bytes.byteLength };
  }
  if (data instanceof ArrayBuffer) return { bytes: new Uint8Array(data.slice(0)), declared: data.byteLength };
  if (data instanceof Uint8Array) return { bytes: new Uint8Array(data), declared: data.byteLength };
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return { bytes: new Uint8Array(await data.arrayBuffer()), declared: data.size };
  }
  if (data && typeof (data as ReadableStream).getReader === 'function') {
    const bytes = new Uint8Array(await new Response(data as ReadableStream).arrayBuffer());
    return { bytes };
  }
  throw new TypeError(pg('upload() takes a Blob, File, ArrayBuffer, Uint8Array, ReadableStream or string.'));
}

/** The SDK's content type choice: the option, then the Blob's type, then application/octet-stream. */
function resolveContentType(data: UploadData, explicit?: string): string {
  if (explicit) return explicit;
  if (typeof Blob !== 'undefined' && data instanceof Blob && data.type) return data.type;
  return 'application/octet-stream';
}

/** MIME glob match. NOT DOCUMENTED: case and parameters are ignored here. */
export function contentTypeAllowed(contentType: string, globs: readonly string[] | undefined): boolean {
  if (!globs || globs.length === 0) return true;
  const type = contentType.split(';')[0].trim().toLowerCase();
  return globs.some((g) => {
    const glob = g.toLowerCase();
    if (glob === '*/*') return true;
    if (glob.endsWith('/*')) return type.startsWith(glob.slice(0, -1));
    return type === glob;
  });
}

const etagOf = () => `"simulated-${crypto.randomUUID().slice(0, 8)}"`;

export function createStorageSim(options: StorageSimOptions): StorageSim {
  const now = options.now ?? (() => new Date());
  const folders = options.folders.map(defineFolder);
  const byName = new Map<string, Folder>();
  for (const f of folders) {
    if (byName.has(f.name)) throw new FolderDeclarationError(pg(`Two folders normalize to the same name, "${f.name}".`));
    byName.set(f.name, f);
  }
  const objects = new Map<string, Map<string, Stored>>(folders.map((f) => [f.name, new Map()]));
  /** Paths blocked by an interrupted operation, until a time on the sim's clock. */
  const blocked = new Map<string, Map<string, number>>(folders.map((f) => [f.name, new Map()]));
  const isBlocked = (folder: Folder, path: string) => {
    const until = blocked.get(folder.name)!.get(path);
    if (until === undefined) return false;
    if (now().getTime() < until) return true;
    blocked.get(folder.name)!.delete(path);
    return false;
  };
  const locked = (p: string, cid: string, why: string) =>
    storageError('Conflict', 409, pg(`"${p}" ${why}. Wait and retry: an interrupted upload or delete can block a path for about 70 minutes.`), cid);

  const emit = (e: StorageEvent) => options.onEvent?.(e);

  function policyItem(folder: Folder, s: Pick<Stored, 'id' | 'owner_id' | 'path' | 'contentType' | 'etag' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'fields' | 'cacheControl' | 'contentDisposition'> & { size: number }): PolicyItem {
    return {
      ...s.fields,
      id: s.id,
      owner_id: s.owner_id,
      folder: folder.name,
      path: s.path,
      name: s.path.split('/').pop()!,
      size: s.size,
      content_type: s.contentType,
      cache_control: s.cacheControl ?? '',
      content_disposition: s.contentDisposition ?? '',
      etag: s.etag,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      last_accessed_at: s.lastAccessedAt ?? '',
    };
  }

  /** True when some authenticated rule grants `action` and its policy passes. */
  function allowed(folder: Folder, claims: Claims, action: SimpleAction, item: PolicyItem, cid: string): boolean {
    for (const rule of folder.rules) {
      if (rule.role !== 'authenticated' || !grants(rule, action)) continue;
      if (!rule.policy) return true;
      let ok: boolean;
      try {
        ok = rule.policy(claims, item) === true;
      } catch (e) {
        // Playground only: real policies are a server-side rule language and can't throw.
        throw storageError(
          'Unexpected',
          400,
          pg(`The folder's policy threw: ${(e as Error)?.message ?? e}. This happens only here: real policies are rules the service evaluates, and can't throw.`),
          cid,
        );
      }
      if (ok) return true;
    }
    return false;
  }

  function toRef(folder: Folder, s: Stored): StorageObjectRef {
    // Custom fields flattened under the envelope, as the SDK's flattenListItem does.
    return {
      ...s.fields,
      id: s.id,
      folder: folder.name,
      path: s.path,
      name: s.path.split('/').pop()!,
      size: s.bytes.byteLength,
      contentType: s.contentType,
      contentDisposition: s.contentDisposition,
      cacheControl: s.cacheControl,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lastAccessedAt: s.lastAccessedAt,
      etag: s.etag,
    };
  }

  /** The steps every operation starts with: abort, folder, sign-in. */
  function begin(folderKey: string, cid: string, signal?: AbortSignal): { folder: Folder; claims: Claims } {
    if (signal?.aborted) throw storageError('Aborted', 499, 'Request aborted', cid);
    if (folders.length === 0) throw storageError('NoStorageEntitiesConfigured', 400, pg('No Storage folders are configured for the app.'), cid);
    const folder = byName.get(normalizeFolderName(folderKey));
    if (!folder) {
      throw storageError('NotFound', 404, pg(`There is no folder "${normalizeFolderName(folderKey)}". Declared: ${[...byName.keys()].join(', ')}.`), cid);
    }
    const claims = options.getClaims();
    if (!claims || typeof claims.sub !== 'string' || !claims.sub) {
      // NOT DOCUMENTED: the status (the SDK's map has no Unauthenticated entry); 401 here.
      throw storageError('Unauthenticated', 401, pg('Nobody is signed in. Storage needs a signed-in session.'), cid);
    }
    return { folder, claims };
  }

  function track<T>(op: StorageEvent['op'], folderKey: string, path: string | undefined, run: (cid: string) => Promise<T>): Promise<T> {
    const cid = simulatedId();
    const by = options.getClaims()?.sub ?? null;
    const folder = normalizeFolderName(folderKey);
    return run(cid).then(
      (v) => {
        emit({ op, folder, path, by, ok: true, correlationId: cid });
        return v;
      },
      (e) => {
        emit({ op, folder, path, by, ok: false, code: isStorageError(e) ? e.code : undefined, correlationId: cid });
        throw e;
      },
    );
  }

  function folderClient(folderKey: string): FolderClient {
    return {
      upload(path, data, opts = {}) {
        return track('upload', folderKey, typeof path === 'string' ? path : undefined, async (cid) => {
          const p = parsePath(path, cid);
          const { folder, claims } = begin(folderKey, cid, opts.signal);
          const { bytes, declared } = await readData(data);
          if (opts.signal?.aborted) throw storageError('Aborted', 499, 'Upload aborted during transfer', cid);
          const contentType = resolveContentType(data, opts.contentType);
          const limit = folder.maxSize ?? PLAYGROUND_MAX_BYTES;
          if (bytes.byteLength > limit) {
            const why =
              folder.maxSize === undefined
                ? "the playground's own limit (the global service limit that applies without maxSize is not documented)"
                : `this folder's maxSize (${folder.maxSize} bytes)`;
            throw storageError('TooLarge', 400, pg(`${bytes.byteLength} bytes is more than ${why}.`), cid);
          }
          if (!contentTypeAllowed(contentType, folder.allowedContentTypes)) {
            throw storageError('UnsupportedContentType', 400, pg(`"${contentType}" is not in this folder's allowedContentTypes (${folder.allowedContentTypes!.join(', ')}).`), cid);
          }
          const store = objects.get(folder.name)!;
          const existing = store.get(p);
          if (existing?.state === 'Deleting') throw locked(p, cid, "is being deleted, and a file in that state can't be uploaded");
          if (isBlocked(folder, p)) throw locked(p, cid, 'is blocked by an interrupted operation');
          const fields = Object.fromEntries(Object.entries(opts.fields ?? {}).filter(([k]) => !RESERVED_FIELDS.has(k.toLowerCase())));
          const stamp = now().toISOString();
          if (existing) {
            if (folder.onConflict === 'error') {
              throw storageError('Conflict', 409, pg(`An object already exists at "${p}", and this folder uses onConflict: 'error'.`), cid);
            }
            if (!allowed(folder, claims, 'update', policyItem(folder, { ...existing, size: existing.bytes.byteLength }), cid)) {
              throw storageError('PermissionDenied', 403, pg(`The folder's rules don't let ${claims.sub} replace "${p}".`), cid);
            }
          } else {
            const prospective = { id: '', owner_id: claims.sub, path: p, contentType, etag: '', createdAt: stamp, updatedAt: stamp, lastAccessedAt: null, fields, cacheControl: opts.cacheControl, contentDisposition: opts.contentDisposition, size: bytes.byteLength };
            if (!allowed(folder, claims, 'create', policyItem(folder, prospective), cid)) {
              throw storageError('PermissionDenied', 403, pg(`The folder's rules don't let ${claims.sub} upload "${p}".`), cid);
            }
          }
          store.set(p, {
            id: existing?.id ?? crypto.randomUUID(),
            // Overwrite keeps the first uploader as owner. NOT DOCUMENTED.
            owner_id: existing?.owner_id ?? claims.sub,
            path: p,
            bytes,
            contentType,
            contentDisposition: opts.contentDisposition,
            cacheControl: opts.cacheControl,
            etag: etagOf(),
            createdAt: existing?.createdAt ?? stamp,
            updatedAt: stamp,
            lastAccessedAt: existing?.lastAccessedAt ?? null,
            fields,
          });
          // Like the SDK, `object` is built from the request: id is empty, size is 0 for a stream.
          const object: StorageObjectRef = {
            id: '',
            folder: folder.name,
            path: p,
            name: p.split('/').pop()!,
            size: declared ?? 0,
            contentType,
            contentDisposition: opts.contentDisposition,
            cacheControl: opts.cacheControl,
            ...(opts.fields ?? {}),
          };
          return { object, correlationId: cid };
        });
      },

      download(path, opts = {}) {
        return track('download', folderKey, typeof path === 'string' ? path : undefined, async (cid) => {
          const p = parsePath(path, cid);
          const { folder, claims } = begin(folderKey, cid, opts.signal);
          const s = objects.get(folder.name)!.get(p);
          if (!s) throw storageError('NotFound', 404, pg(`There is no object at "${p}".`), cid);
          if (!allowed(folder, claims, 'read', policyItem(folder, { ...s, size: s.bytes.byteLength }), cid)) {
            throw storageError('PermissionDenied', 403, pg(`The folder's rules don't let ${claims.sub} read "${p}".`), cid);
          }
          if (s.state === 'Deleting') throw locked(p, cid, "is being deleted, and a file in that state can't be downloaded");
          s.lastAccessedAt = now().toISOString();
          return {
            stream: new Blob([s.bytes as BlobPart]).stream(),
            contentType: s.contentType,
            contentDisposition: s.contentDisposition,
            contentLength: s.bytes.byteLength,
            etag: s.etag,
            correlationId: cid,
          };
        });
      },

      list(dirOrOptions?: string | ListOptions, maybeOptions?: ListOptions) {
        const dir = typeof dirOrOptions === 'string' ? dirOrOptions : undefined;
        const opts = (typeof dirOrOptions === 'string' ? maybeOptions : dirOrOptions) ?? {};
        return track('list', folderKey, dir, async (cid) => {
          checkDirectory(dir, cid);
          const { folder, claims } = begin(folderKey, cid, opts.signal);
          const prefix = dir ? `${dir}/` : '';
          const visible = [...objects.get(folder.name)!.values()]
            .filter((s) => s.path.startsWith(prefix))
            .filter((s) => allowed(folder, claims, 'read', policyItem(folder, { ...s, size: s.bytes.byteLength }), cid))
            .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
          let start = 0;
          if (opts.continuation !== undefined) {
            // Playground: a made-up token (the offset, in base 64). The real one is opaque too.
            let n = NaN;
            try {
              n = Number(atob(opts.continuation));
            } catch {
              /* not base 64 */
            }
            if (!Number.isInteger(n) || n < 0) throw storageError('InvalidContinuation', 400, pg('The continuation token is not valid.'), cid);
            start = n;
          }
          const limit = typeof opts.limit === 'number' && Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : DEFAULT_LIST_LIMIT;
          const page = visible.slice(start, start + limit);
          const end = start + page.length;
          return {
            items: page.map((s) => toRef(folder, s)),
            ...(end < visible.length ? { continuation: btoa(String(end)) } : {}),
            correlationId: cid,
          };
        });
      },

      delete(path, opts = {}) {
        return track('delete', folderKey, typeof path === 'string' ? path : undefined, async (cid) => {
          const p = parsePath(path, cid);
          const { folder, claims } = begin(folderKey, cid, opts.signal);
          const store = objects.get(folder.name)!;
          const s = store.get(p);
          if (!s) throw storageError('NotFound', 404, pg(`There is no object at "${p}".`), cid);
          if (!allowed(folder, claims, 'delete', policyItem(folder, { ...s, size: s.bytes.byteLength }), cid)) {
            throw storageError('PermissionDenied', 403, pg(`The folder's rules don't let ${claims.sub} delete "${p}".`), cid);
          }
          if (isBlocked(folder, p)) throw locked(p, cid, 'is blocked by an interrupted operation');
          store.delete(p);
          return { success: true, deleted: 1, correlationId: cid };
        });
      },
    };
  }

  const clients = new Map<string, FolderClient>();
  // Any key is a folder client, as on the real proxy; an undeclared folder fails at the call (NotFound).
  const storage = new Proxy({} as Record<string, FolderClient>, {
    get(_t, key) {
      if (typeof key !== 'string' || key === 'then') return undefined;
      if (!clients.has(key)) clients.set(key, folderClient(key));
      return clients.get(key);
    },
  });

  return {
    storage,
    folders,
    serviceFactory: () => () => storage,
    inspect() {
      return folders.flatMap((f) =>
        [...objects.get(f.name)!.values()].map((s) => ({
          folder: f.name,
          path: s.path,
          owner_id: s.owner_id,
          size: s.bytes.byteLength,
          contentType: s.contentType,
          updatedAt: s.updatedAt,
          ...(s.state ? { state: s.state } : {}),
        })),
      );
    },
    interrupt(op, folderKey, path, blockedForMs = INTERRUPTED_BLOCK_MS) {
      const folder = byName.get(normalizeFolderName(folderKey));
      if (!folder) throw new Error(pg(`There is no folder "${normalizeFolderName(folderKey)}".`));
      if (op === 'delete') {
        const s = objects.get(folder.name)!.get(path);
        if (!s) throw new Error(pg(`There is no object at "${path}" whose delete could be interrupted.`));
        s.state = 'Deleting';
      }
      blocked.get(folder.name)!.set(path, now().getTime() + blockedForMs);
    },
    reset() {
      for (const m of objects.values()) m.clear();
      for (const m of blocked.values()) m.clear();
    },
  };
}

// ---------------------------------------------------------------- drag and drop, for the preview

/** The files in a drop (a DataTransfer's `files`, or its file items). */
export function filesFromDataTransfer(dt: Pick<DataTransfer, 'files' | 'items'> | null | undefined): File[] {
  if (!dt) return [];
  if (dt.files && dt.files.length) return Array.from(dt.files);
  const out: File[] = [];
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

/**
 * Makes `el` a drop zone: dropped files go to `onFiles`, and `el.dataset.dragging` is set while a
 * drag is over it (for styling). Returns a function that removes the listeners.
 */
export function attachDropZone(el: HTMLElement, onFiles: (files: File[]) => void): () => void {
  const over = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    el.dataset.dragging = 'true';
  };
  const leave = () => {
    delete el.dataset.dragging;
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    delete el.dataset.dragging;
    const files = filesFromDataTransfer(e.dataTransfer);
    if (files.length) onFiles(files);
  };
  el.addEventListener('dragenter', over);
  el.addEventListener('dragover', over);
  el.addEventListener('dragleave', leave);
  el.addEventListener('drop', drop);
  return () => {
    el.removeEventListener('dragenter', over);
    el.removeEventListener('dragover', over);
    el.removeEventListener('dragleave', leave);
    el.removeEventListener('drop', drop);
  };
}
