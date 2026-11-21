// Tests for the simulated services in src/sim/ (storage, Fabric IQ, functions and OneLake) and the
// type subsets they come with. Run: `node tools/test-sim.mjs`.
// 1. Type-checks src/sim/*.ts (strict).
// 2. Type-checks examples from rayfin.ai against the type subsets in src/editor-types/packages,
//    including lines that must NOT compile (@ts-expect-error).
// 3. Bundles src/sim/*.ts with esbuild and runs behaviour tests with node:test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slash = (p) => p.replace(/\\/g, '/');
const simDir = join(root, 'src', 'sim');
const pkgDir = join(root, 'src', 'editor-types', 'packages');

// ---------------------------------------------------------------- 1. the simulations type-check
const baseOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noEmit: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  types: [],
};

function diagnostics(program, keep) {
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => !d.file || keep(slash(d.file.fileName)))
    .map((d) => {
      const where = d.file ? `${slash(d.file.fileName).split('/').slice(-2).join('/')}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}` : '';
      return `${where}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
    });
}

test('src/sim type-checks (strict)', () => {
  const files = readdirSync(simDir).filter((f) => f.endsWith('.ts')).map((f) => join(simDir, f));
  const program = ts.createProgram(files, { ...baseOptions, resolveJsonModule: true, allowJs: true, checkJs: false, skipLibCheck: true });
  assert.deepEqual(diagnostics(program, (f) => f.includes('/src/sim/')), []);
});

// ---------------------------------------------------------------- 2. the type subsets
const SUBSETS = [
  'rayfin-client.d.ts', 'rayfin-auth.d.ts', 'rayfin-connectors.d.ts', 'rayfin-core.d.ts', 'rayfin-data.d.ts', 'vite-client.d.ts',
  'rayfin-storage.d.ts', 'rayfin-connector-fabric-iq-mcp.d.ts', 'fabric-user-data-functions.d.ts',
].map((f) => slash(join(pkgDir, f)));
const NEW_SUBSETS = SUBSETS.slice(-3);

// Examples from https://rayfin.ai/docs/storage, /storage/files, /connectors/fabric-iq and
// /functions/connections, trimmed to what the subsets cover.
const EXAMPLES = {
  'storage/ProfileImage.ts': `
import { blob, ContentTypes, mb, kb, StorageObject } from '@microsoft/rayfin-core';
@blob({ name: 'profile-images', maxSize: mb(5), allowedContentTypes: [ContentTypes.AnyImage] })
export class ProfileImage extends StorageObject {}
@blob({ maxSize: '2mb', onConflict: 'overwrite', allowedContentTypes: ['application/pdf', 'image/*'] })
export class Evidence extends StorageObject {}
@blob('team-files')
export class TeamFiles extends StorageObject {}
const n: number = kb(2);
// @ts-expect-error a MIME glob needs a slash
@blob({ allowedContentTypes: ['pdf'] }) export class Bad extends StorageObject {}
// @ts-expect-error not a size unit
@blob({ maxSize: '2megs' }) export class Bad2 extends StorageObject {}
export { n };
`,
  'storage/client.ts': `
import { RayfinClient } from '@microsoft/rayfin-client';
import { browserSession } from '@microsoft/rayfin-auth';
import { isStorageError, storageService, STORAGE_ERROR_CODES, type StorageErrorCode } from '@microsoft/rayfin-storage';
type AppStorageSchema = { Attachment: object; 'profile-images': object; TeamDocument: { team_id: string } };
export const rayfinClient = RayfinClient.create({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL,
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
  auth: browserSession({ storage: true }),
  services: { storage: storageService<AppStorageSchema>() },
});
const folder = rayfinClient.storage['profile-images'];
export async function uploadAvatar(sub: string, file: File) {
  const { object } = await folder.upload(\`avatars/\${sub}/\${file.name}\`, file);
  return object;
}
export async function listAvatars(sub: string) {
  const { items, continuation } = await folder.list(\`avatars/\${sub}\`, { limit: 20 });
  const more = continuation ? await folder.list({ limit: 20, continuation }) : undefined;
  return [...items, ...(more?.items ?? [])].map((i) => \`\${i.path} \${i.size} \${i.contentType ?? ''}\`);
}
export async function avatarObjectUrl(path: string): Promise<string> {
  const result = await folder.download(path);
  const blob = await new Response(result.stream, { headers: result.contentType ? { 'Content-Type': result.contentType } : undefined }).blob();
  return URL.createObjectURL(blob);
}
export async function deleteAvatar(path: string) {
  const { success, deleted, correlationId } = await folder.delete(path);
  return success && deleted === 1 ? correlationId : '';
}
export async function saveReport(pdfBytes: Uint8Array) {
  return rayfinClient.storage.Attachment.upload('reports/2026/report.pdf', pdfBytes, {
    contentType: 'application/pdf', contentDisposition: 'inline', cacheControl: 'private, max-age=3600', expiresInSeconds: 300,
  });
}
export async function uploadTeamPlan(teamId: string, file: File) {
  await rayfinClient.storage.TeamDocument.upload(\`\${teamId}/plan.pdf\`, file, { fields: { team_id: teamId } });
  // @ts-expect-error built-in fields are not custom fields
  await rayfinClient.storage.TeamDocument.upload(\`\${teamId}/plan.pdf\`, file, { fields: { owner_id: 'x' } });
  const { items } = await rayfinClient.storage.TeamDocument.list(teamId);
  return items.map((item) => ({ path: item.path, teamId: item.team_id }));
}
// @ts-expect-error there is no prefix option in 2.0
rayfinClient.storage.Attachment.list({ prefix: 'reports' });
export async function uploadAttachment(file: File): Promise<string> {
  try {
    await rayfinClient.storage.Attachment.upload(file.name, file);
    return 'Uploaded.';
  } catch (error) {
    if (!isStorageError(error)) throw error;
    switch (error.code) {
      case 'Conflict': return 'A file with that name already exists.';
      case 'TooLarge': return 'The file is larger than this folder allows.';
      case 'UnsupportedContentType': return 'This folder does not accept that file type.';
      case 'InvalidName': return 'That file name is not a valid object path.';
      case 'PermissionDenied':
      case 'Unauthenticated': return 'Sign in with an account that can upload here.';
      case 'Aborted': return 'The upload was cancelled.';
      default: return error.retryable ? \`Upload failed; try again. Correlation ID: \${error.correlationId}\` : \`Upload failed. Correlation ID: \${error.correlationId}\`;
    }
  }
}
const code: StorageErrorCode = STORAGE_ERROR_CODES[0];
// @ts-expect-error not a storage error code
const wrong: StorageErrorCode = 'Forbidden';
export { code, wrong };
`,
  'connectors/assistant/schema.ts': `
import type { ConnectorConfig } from '@microsoft/rayfin-connectors';
import type { FabricIqMcp } from '@microsoft/rayfin-connector-fabric-iq-mcp';
export type AssistantSchema = FabricIqMcp<'executeQuery'>;
export const connectorConfig = { connector: 'fabriciqmcp' } as const satisfies ConnectorConfig;
`,
  'assistant.ts': `
import { RayfinClient } from '@microsoft/rayfin-client';
import { browserSession } from '@microsoft/rayfin-auth';
import { connectorsService } from '@microsoft/rayfin-connectors';
import {
  createFabricIqMcpConnectorClient, fabricIqMcp, FabricIqMcpAdapterError, FabricIqMcpHttpError, FabricIqMcpContractError,
  type FabricIqMcpChatMessage, type FabricIqMcpToolResult,
} from '@microsoft/rayfin-connector-fabric-iq-mcp';
import { connectorConfig as assistantConfig, type AssistantSchema } from './connectors/assistant/schema';
type AppConnectorsSchema = { assistant: AssistantSchema };
export const rayfinClient = RayfinClient.create({
  baseUrl: import.meta.env.VITE_RAYFIN_API_URL,
  publishableKey: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
  auth: browserSession({ storage: true }),
  services: {
    connectors: connectorsService<AppConnectorsSchema>({ configs: { assistant: assistantConfig }, runtime: { assistant: fabricIqMcp() } }),
  },
});
export const assistant = createFabricIqMcpConnectorClient(rayfinClient.connectors.assistant);
export function askQuestion(artifactId: string, history: readonly FabricIqMcpChatMessage[], question: string) {
  return assistant.ask(artifactId, [...history, { role: 'user', content: question }]);
}
export function answerText(result: FabricIqMcpToolResult): string {
  return result.content
    .flatMap((block) => typeof block === 'object' && block !== null && 'type' in block && block.type === 'text' && 'text' in block && typeof block.text === 'string' ? [block.text] : [])
    .join('\\n\\n');
}
export async function salesByRegion(artifactId: string) {
  const first = await assistant.ask(artifactId, [{ role: 'user', content: 'What were sales last month?' }]);
  const second = await assistant.ask(artifactId, [...first.messages, { role: 'user', content: 'Break those down by region.' }]);
  return second.result.isError ? 'error' : answerText(second.result);
}
export function askWithCancel(artifactId: string, messages: readonly FabricIqMcpChatMessage[], onStatus: (status: string) => void) {
  const controller = new AbortController();
  const response = assistant.ask(artifactId, messages, { signal: controller.signal, onTaskUpdate: ({ status }) => onStatus(status) });
  return { response, cancel: () => controller.abort() };
}
export async function listAssistantTools() {
  const { tools } = await assistant.listTools();
  return tools.map((tool) => tool.name);
}
export const isAdapterError = (e: unknown) => e instanceof FabricIqMcpAdapterError;
export const retryAfter = (e: unknown) => (e instanceof FabricIqMcpHttpError && e.status === 429 ? e.getResponseHeader('Retry-After') : undefined);
export const contractCode = (e: unknown) => (e instanceof FabricIqMcpContractError ? e.code : undefined);
// @ts-expect-error a system role is not a conversation entry
assistant.ask('x', [{ role: 'system', content: 'hi' }]);
`,
  'functions/function_app.ts': `
import { AudienceType, UserDataFunctions, type RayfinContext } from '@microsoft/fabric-user-data-functions';
export type AppSchema = Record<string, never>;
const udf = new UserDataFunctions();
udf.func('checkFabricAccess', async (ctx: RayfinContext<AppSchema, AudienceType.Fabric>): Promise<string> => {
  const token = ctx.Tokens.Fabric;
  return token.length > 0 ? 'ready' : 'missing';
}, []);
udf.func('readOneLakeFile', async (ctx: RayfinContext<AppSchema, AudienceType.Storage>, fileUrl: string): Promise<string> => {
  const response = await fetch(fileUrl, { headers: { Authorization: ['Bearer', ctx.Tokens.Storage].join(' ') } });
  if (!response.ok) throw new Error(\`OneLake read failed: \${response.status}\`);
  return await response.text();
}, []);
udf.func('both', async (ctx: RayfinContext<AppSchema, AudienceType.Sql | AudienceType.Storage>) => {
  return { sql: ctx.Tokens.Sql.length, storage: ctx.Tokens.Storage.length, owner: ctx.user.id };
}, []);
udf.func('custom', async (ctx: RayfinContext<AppSchema, 'api://contoso-api'>) => ctx.Tokens['api://contoso-api'], []);
udf.func('byAppId', async (ctx: RayfinContext<AppSchema, '11111111-2222-3333-4444-555555555555'>) => ctx.Tokens['11111111-2222-3333-4444-555555555555'], []);
udf.func('ctxSecond', async (name: string, ctx: RayfinContext<AppSchema>) => \`\${name} \${ctx.user.id}\`, []);
udf.func('undeclared', async (ctx: RayfinContext<AppSchema, AudienceType.Storage>) => {
  // @ts-expect-error AzureAI is not declared on this context
  return ctx.Tokens.AzureAI;
}, []);
udf.func('none', async (ctx: RayfinContext<AppSchema>) => {
  // @ts-expect-error no audience declared
  return ctx.Tokens.Sql;
}, []);
// @ts-expect-error not an AudienceType member
const k: AudienceType = 'KeyVault';
export { k };
`,
};

test('type subsets compile the documented examples, and reject what they should', () => {
  const vroot = slash(join(root, '.virtual-sim-examples'));
  const files = new Map(Object.entries(EXAMPLES).map(([p, t]) => [`${vroot}/${p}`, t]));
  const options = { ...baseOptions, skipLibCheck: false };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (n, lang, ...rest) => {
    const key = slash(n);
    return files.has(key) ? ts.createSourceFile(n, files.get(key), lang, true, ts.ScriptKind.TS) : getSourceFile(n, lang, ...rest);
  };
  const fileExists = host.fileExists;
  host.fileExists = (n) => files.has(slash(n)) || (!slash(n).startsWith(vroot) && fileExists(n));
  const readFile = host.readFile;
  host.readFile = (n) => files.get(slash(n)) ?? readFile(n);
  const directoryExists = host.directoryExists?.bind(host);
  host.directoryExists = (d) => {
    const key = slash(d).replace(/\/$/, '');
    if (key === vroot || key.startsWith(`${vroot}/`)) return [...files.keys()].some((f) => f.startsWith(`${key}/`));
    return directoryExists ? directoryExists(d) : true;
  };
  const program = ts.createProgram([...files.keys(), ...SUBSETS], options, host);
  // Only the examples and the three new subsets: the older subsets are checked with skipLibCheck elsewhere.
  assert.deepEqual(diagnostics(program, (f) => f.startsWith(vroot) || NEW_SUBSETS.includes(f)), []);
});

// ---------------------------------------------------------------- 3. behaviour
const out = mkdtempSync(join(tmpdir(), 'playground-sim-'));
await esbuild.build({
  entryPoints: ['storage', 'fabric-iq', 'functions'].map((n) => join(simDir, `${n}.ts`)),
  outdir: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'error',
});
const load = (n) => import(pathToFileURL(join(out, `${n}.js`)).href);
const S = await load('storage');
const F = await load('fabric-iq');
const U = await load('functions');
process.on('exit', () => rmSync(out, { recursive: true, force: true }));

const alice = { sub: 'sub-alice', email: 'alice@contoso.example' };
const carol = { sub: 'sub-carol', email: 'carol@contoso.example' };
const ownRule = { role: 'authenticated', actions: '*', policy: (claims, item) => claims.sub === item.owner_id };

async function rejects(promise, code) {
  try {
    await promise;
  } catch (e) {
    assert.ok(S.isStorageError(e), `expected a StorageError, got ${e}`);
    assert.equal(e.code, code, e.message);
    assert.equal(e.name, 'StorageError');
    return e;
  }
  assert.fail(`expected ${code}`);
}

function storageWith(folders, who = { current: alice }) {
  const events = [];
  const sim = S.createStorageSim({ folders, getClaims: () => who.current, onEvent: (e) => events.push(e) });
  return { sim, who, events };
}

test('storage: folder declarations are checked like storage apply', () => {
  assert.throws(() => S.defineFolder({ className: 'X', rules: [] }), /at least one authenticated/);
  assert.throws(() => S.defineFolder({ className: 'X', rules: [{ role: 'anonymous', actions: 'read' }, ownRule] }), /anonymous/);
  assert.throws(() => S.defineFolder({ className: 'X', blob: { onConflict: 'overwrite' }, rules: [{ role: 'authenticated', actions: ['create', 'read'] }] }), /update/);
  assert.equal(S.defineFolder({ className: 'X', blob: { onConflict: 'overwrite' }, rules: [ownRule] }).onConflict, 'overwrite');
  assert.equal(S.defineFolder({ className: 'ProfileImage', rules: [ownRule] }).name, 'profileimage');
  assert.equal(S.defineFolder({ className: 'X', blob: 'profile-images', rules: [ownRule] }).name, 'profile-images');
  assert.equal(S.normalizeFolderName('Ab'), 'ab0');
  assert.equal(S.normalizeFolderName('My__Folder--'), 'my-folder');
  assert.equal(S.defineFolder({ className: 'X', blob: { maxSize: '2mb' }, rules: [ownRule] }).maxSize, 2 * 1024 * 1024);
  assert.equal(S.mb(5), 5 * 1024 * 1024);
  assert.equal(S.kb(2), 2048);
  // rayfin-core's own messages for rules 6 and 7
  assert.throws(() => S.defineFolder({ className: 'Pub', rules: [{ role: 'anonymous', actions: 'read' }, ownRule] }), {
    message: "@blob('Pub'): anonymous permissions are not supported for storage folders. Remove the anonymous role and grant access to the authenticated role instead.",
  });
  assert.throws(() => S.defineFolder({ className: 'W', blob: { onConflict: 'overwrite' }, rules: [{ role: 'authenticated', actions: 'read' }] }), {
    message: "@blob('W'): onConflict: 'overwrite' requires at least one authenticated role to grant the 'update' action. Add 'update' to a role or set onConflict: 'error'.",
  });
});

test('storage: maxSize is parsed and checked like rayfin-core (rule 8)', () => {
  const size = (maxSize) => S.defineFolder({ className: 'Docs', blob: { maxSize }, rules: [ownRule] }).maxSize;
  // binary units, any case, spaces, no unit, rounded to the nearest byte
  assert.equal(size('2MB'), 2 * 1024 ** 2);
  assert.equal(size(' 2 mb '), 2 * 1024 ** 2);
  assert.equal(size('500Kb'), 500 * 1024);
  assert.equal(size('2048'), 2048);
  assert.equal(size('1.5b'), 2);
  assert.equal(size('0.0005kb'), 1); // 0.512 rounds to 1
  assert.equal(size('.5kb'), 512);
  assert.equal(size(5000 * 1024 ** 2), S.MAX_OBJECT_SIZE_BYTES);
  assert.equal(size('5000mb'), S.MAX_OBJECT_SIZE_BYTES);
  // not a positive whole number of bytes
  for (const bad of [0, -1, 1.5, Number.NaN, Infinity, '0b', '0.4b', '2megs', '5.', '.', 'mb', '1e3', '+2mb', '2 m b']) {
    assert.throws(() => size(bad), { message: `@blob('Docs'): maxSize must be a positive whole byte count or size string (e.g. '2mb'); got ${JSON.stringify(bad)}.` }, String(bad));
  }
  // over 5,000 MiB
  assert.throws(() => size('5001mb'), {
    message: `@blob('Docs'): maxSize (${5001 * 1024 ** 2} bytes) exceeds the maximum supported object size of ${S.MAX_OBJECT_SIZE_BYTES} bytes (5,000 MiB). Uploads are single-request PUTs and cannot exceed the Azure single-upload limit.`,
  });
  assert.throws(() => size(S.gb(5)), /exceeds the maximum supported object size/);
});

test('storage: MIME globs and declared field names are checked like rayfin-core (rules 8, 9)', () => {
  const types = (allowedContentTypes) => S.defineFolder({ className: 'Docs', blob: { allowedContentTypes }, rules: [ownRule] }).allowedContentTypes;
  assert.deepEqual(types(['image/*', '*/*', 'application/vnd.ms-excel', 'image/svg+xml', 'Text/CSV']), ['image/*', '*/*', 'application/vnd.ms-excel', 'image/svg+xml', 'Text/CSV']);
  for (const bad of ['pdf', '*/png', 'image/', '/png', 'image/png/x', 'image/p*g', 'text/plain; charset=utf-8', 'image /png', 'ïmage/png']) {
    assert.throws(() => types(['image/png', bad]), { message: `@blob('Docs'): allowedContentTypes contains malformed MIME glob(s): ${bad}. Use forms like 'image/*' or 'application/pdf'.` }, bad);
  }
  assert.equal(S.isMimeGlob('*/*'), true);
  assert.equal(S.isMimeGlob('*/*x'), false);
  // field names may not collide with a built-in field, ignoring case; user_metadata is reserved too
  assert.equal(S.defineFolder({ className: 'TeamDocument', fields: ['team_id'], rules: [ownRule] }).name, 'teamdocument');
  for (const bad of ['user_metadata', 'Owner_ID', 'SIZE', 'etag']) {
    assert.throws(() => S.defineFolder({ className: 'TeamDocument', fields: ['team_id', bad], rules: [ownRule] }), {
      message: `@blob('TeamDocument'): field '${bad}' conflicts with a built-in StorageObject field. Built-in fields (cache_control, content_disposition, content_type, created_at, etag, folder, id, last_accessed_at, name, owner_id, path, size, updated_at, user_metadata) are managed by the service; rename the field on the @blob class.`,
    });
  }
});

test('storage: path rules throw InvalidName (400) before anything else', async () => {
  const { sim, who } = storageWith([{ className: 'Attachment', rules: [ownRule] }]);
  who.current = null; // even signed out, the path is checked first, as the SDK does
  for (const bad of ['', '/a.png', 'a/', 'a//b.png', './a.png', 'a/../b.png', '..', 'a\\b.png']) {
    const e = await rejects(sim.storage.Attachment.upload(bad, 'x'), 'InvalidName');
    assert.equal(e.status, 400);
    assert.equal(e.retryable, false);
    assert.equal(e.message, 'Object path must contain non-empty segments separated by forward slashes.');
    await rejects(sim.storage.Attachment.download(bad), 'InvalidName');
    await rejects(sim.storage.Attachment.delete(bad), 'InvalidName');
  }
  await rejects(sim.storage.Attachment.list('a//b'), 'InvalidName');
  await rejects(sim.storage.Attachment.list('/a'), 'InvalidName');
  who.current = alice;
  await sim.storage.Attachment.list(''); // an empty string lists from the root
  await sim.storage.Attachment.upload('Ünïcode name (1).PNG', 'x'); // other characters and casing are kept
  assert.equal((await sim.storage.Attachment.list()).items[0].path, 'Ünïcode name (1).PNG');
});

test('storage: upload, list, download, delete, with the documented shapes', async () => {
  const { sim, events } = storageWith([{ className: 'Attachment', rules: [ownRule] }]);
  const file = new File(['%PDF-1.7 hello'], 'plan.pdf', { type: 'application/pdf' });
  const up = await sim.storage.Attachment.upload('reports/2026/plan.pdf', file, { cacheControl: 'no-cache' });
  assert.match(up.correlationId, /^simulated-/);
  assert.deepEqual(
    { ...up.object },
    { id: '', folder: 'attachment', path: 'reports/2026/plan.pdf', name: 'plan.pdf', size: file.size, contentType: 'application/pdf', contentDisposition: undefined, cacheControl: 'no-cache' },
  );
  // a ReadableStream: size 0 in the synthesized object, stored in full
  const stream = new Blob(['abc']).stream();
  assert.equal((await sim.storage.Attachment.upload('s.bin', stream)).object.size, 0);
  assert.equal((await sim.storage.Attachment.upload('t.txt', 'hé')).object.contentType, 'application/octet-stream');

  const listed = await sim.storage.Attachment.list('reports');
  assert.equal(listed.items.length, 1);
  const item = listed.items[0];
  assert.equal(item.size, file.size);
  assert.ok(item.id && item.etag && item.createdAt && item.updatedAt);
  assert.equal(listed.continuation, undefined);

  const dl = await sim.storage.Attachment.download(item.path);
  assert.equal(await new Response(dl.stream).text(), '%PDF-1.7 hello');
  assert.equal(dl.contentType, 'application/pdf');
  assert.equal(dl.contentLength, file.size);
  assert.equal((await new Response((await sim.storage.Attachment.download('s.bin')).stream).text()), 'abc');

  assert.deepEqual({ ...(await sim.storage.Attachment.delete(item.path)), correlationId: 'x' }, { success: true, deleted: 1, correlationId: 'x' });
  await rejects(sim.storage.Attachment.download(item.path), 'NotFound');
  await rejects(sim.storage.Attachment.delete(item.path), 'NotFound');
  assert.ok(events.some((e) => e.op === 'upload' && e.ok && e.by === 'sub-alice'));
  assert.ok(events.some((e) => e.op === 'delete' && !e.ok && e.code === 'NotFound'));
});

test('storage: list pages with limit and continuation', async () => {
  const { sim } = storageWith([{ className: 'Attachment', rules: [ownRule] }]);
  for (const n of [3, 1, 2, 5, 4]) await sim.storage.Attachment.upload(`f${n}.txt`, String(n));
  const a = await sim.storage.Attachment.list({ limit: 2 });
  assert.deepEqual(a.items.map((i) => i.path), ['f1.txt', 'f2.txt']);
  const b = await sim.storage.Attachment.list({ limit: 2, continuation: a.continuation });
  assert.deepEqual(b.items.map((i) => i.path), ['f3.txt', 'f4.txt']);
  const c = await sim.storage.Attachment.list({ limit: 2, continuation: b.continuation });
  assert.deepEqual(c.items.map((i) => i.path), ['f5.txt']);
  assert.equal(c.continuation, undefined);
  await rejects(sim.storage.Attachment.list({ continuation: '%%%' }), 'InvalidContinuation');
});

test('storage: maxSize, allowedContentTypes and onConflict', async () => {
  const { sim } = storageWith([
    { className: 'Evidence', blob: { maxSize: S.kb(1), allowedContentTypes: [S.ContentTypes.Pdf, S.ContentTypes.AnyImage] }, rules: [ownRule] },
    { className: 'Drafts', blob: { onConflict: 'overwrite' }, rules: [ownRule] },
  ]);
  const ok = await sim.storage.Evidence.upload('a.png', new Blob([new Uint8Array(1024)], { type: 'image/png' }));
  assert.equal(ok.object.size, 1024);
  const big = await rejects(sim.storage.Evidence.upload('b.png', new Blob([new Uint8Array(1025)], { type: 'image/png' })), 'TooLarge');
  assert.equal(big.status, 400);
  const exe = await rejects(sim.storage.Evidence.upload('c.exe', new Blob(['MZ'], { type: 'application/x-msdownload' })), 'UnsupportedContentType');
  assert.equal(exe.status, 400);
  await rejects(sim.storage.Evidence.upload('d.bin', 'x'), 'UnsupportedContentType'); // octet-stream by default
  await sim.storage.Evidence.upload('e.bin', 'x', { contentType: 'application/pdf' }); // the option wins
  const dup = await rejects(sim.storage.Evidence.upload('a.png', new Blob(['x'], { type: 'image/png' })), 'Conflict');
  assert.equal(dup.status, 409);
  await sim.storage.Drafts.upload('n.txt', 'one');
  await sim.storage.Drafts.upload('n.txt', 'two');
  assert.equal(await new Response((await sim.storage.Drafts.download('n.txt')).stream).text(), 'two');
});

test('storage: policies per signed-in person; Unauthenticated when signed out', async () => {
  const { sim, who } = storageWith([
    { className: 'Evidence', rules: [ownRule] },
    { className: 'Open', rules: [{ role: 'authenticated', actions: '*' }] },
    { className: 'Shared', blob: { onConflict: 'overwrite' }, rules: [{ role: 'authenticated', actions: ['create', 'read', 'update'], policy: (c, i) => c.sub === i.owner_id }] },
  ]);
  await sim.storage.Evidence.upload(`evidence/${alice.sub}/a.pdf`, 'A');
  await sim.storage.Open.upload('alice.txt', 'A');
  who.current = carol;
  await sim.storage.Evidence.upload(`evidence/${carol.sub}/c.pdf`, 'C');
  // Carol sees only her own files: the rule does its job, whatever path she types
  assert.deepEqual((await sim.storage.Evidence.list('evidence')).items.map((i) => i.path), [`evidence/${carol.sub}/c.pdf`]);
  assert.deepEqual((await sim.storage.Evidence.list(`evidence/${alice.sub}`)).items, []);
  const denied = await rejects(sim.storage.Evidence.download(`evidence/${alice.sub}/a.pdf`), 'PermissionDenied');
  assert.equal(denied.status, 403);
  await rejects(sim.storage.Evidence.delete(`evidence/${alice.sub}/a.pdf`), 'PermissionDenied');
  // without a policy, every signed-in person reaches every object
  assert.equal(await new Response((await sim.storage.Open.download('alice.txt')).stream).text(), 'A');
  // overwrite needs update on the existing object
  who.current = alice;
  await sim.storage.Shared.upload('s.txt', 'mine');
  who.current = carol;
  await rejects(sim.storage.Shared.upload('s.txt', 'hers'), 'PermissionDenied');
  // no delete granted
  who.current = alice;
  await rejects(sim.storage.Shared.delete('s.txt'), 'PermissionDenied');
  who.current = null;
  const un = await rejects(sim.storage.Evidence.list(), 'Unauthenticated');
  assert.equal(un.status, 401);
  // owner_id is the uploader's sub
  assert.deepEqual(sim.inspect().filter((o) => o.folder === 'evidence').map((o) => o.owner_id).sort(), ['sub-alice', 'sub-carol']);
});

test('storage: folder keys, unknown folders, fields, abort', async () => {
  const { sim } = storageWith([{ className: 'TeamDocument', rules: [ownRule] }, { className: 'X', blob: 'profile-images', rules: [ownRule] }]);
  await sim.storage['profile-images'].upload('p.png', 'x');
  await rejects(sim.storage.ProfileImage.list(), 'NotFound'); // the class name is not the key when the folder has a name
  await sim.storage.TeamDocument.upload('t1/plan.pdf', 'x', { fields: { team_id: 't1', owner_id: 'spoofed', OWNER_ID: 'spoofed', user_metadata: { a: 1 }, Size: 9 } });
  const [item] = (await sim.storage.TeamDocument.list('t1')).items;
  assert.equal(item.team_id, 't1');
  assert.equal(item.size, 1);
  for (const k of ['owner_id', 'OWNER_ID', 'user_metadata', 'Size']) assert.equal(k in item, false, k);
  assert.equal(sim.inspect().find((o) => o.path === 't1/plan.pdf').owner_id, 'sub-alice');
  const c = new AbortController();
  c.abort();
  const ab = await rejects(sim.storage.TeamDocument.upload('a.txt', 'x', { signal: c.signal }), 'Aborted');
  assert.equal(ab.status, 499);
  const none = S.createStorageSim({ folders: [], getClaims: () => alice });
  await rejects(none.storage.Attachment.list(), 'NoStorageEntitiesConfigured');
  assert.equal(typeof sim.serviceFactory()({}, { onDispose() {} }).TeamDocument.upload, 'function');
});

test('storage: a policy that throws is a playground-only Unexpected (400)', async () => {
  const { sim } = storageWith([{ className: 'Odd', rules: [{ role: 'authenticated', actions: '*', policy: () => { throw new Error('boom'); } }] }]);
  const e = await rejects(sim.storage.Odd.upload('a.txt', 'x'), 'Unexpected');
  assert.equal(e.status, 400);
  assert.match(e.message, /^Playground: The folder's policy threw: boom\. This happens only here/);
});

test('storage: interrupted delete and upload (Deleting state, blocked path)', async () => {
  let t = Date.parse('2026-11-21T10:00:00Z');
  const sim = S.createStorageSim({ folders: [{ className: 'Docs', blob: { onConflict: 'overwrite' }, rules: [ownRule] }], getClaims: () => alice, now: () => new Date(t) });
  await sim.storage.Docs.upload('a.txt', 'A');
  sim.interrupt('delete', 'Docs', 'a.txt');
  // still listed, in a Deleting state
  assert.deepEqual((await sim.storage.Docs.list()).items.map((i) => i.path), ['a.txt']);
  assert.equal(sim.inspect()[0].state, 'Deleting');
  const up = await rejects(sim.storage.Docs.upload('a.txt', 'B'), 'Conflict');
  assert.equal(up.status, 409);
  assert.match(up.message, /^Playground: .*can't be uploaded/);
  await rejects(sim.storage.Docs.download('a.txt'), 'Conflict');
  // the retry is blocked for about 70 minutes, then goes through
  await rejects(sim.storage.Docs.delete('a.txt'), 'Conflict');
  t += S.INTERRUPTED_BLOCK_MS - 1;
  await rejects(sim.storage.Docs.delete('a.txt'), 'Conflict');
  await rejects(sim.storage.Docs.download('a.txt'), 'Conflict'); // still Deleting
  t += 1;
  assert.equal((await sim.storage.Docs.delete('a.txt')).deleted, 1);
  assert.deepEqual((await sim.storage.Docs.list()).items, []);
  // an interrupted upload blocks the path, without a listed file
  sim.interrupt('upload', 'Docs', 'b.txt', 1000);
  await rejects(sim.storage.Docs.upload('b.txt', 'B'), 'Conflict');
  assert.deepEqual((await sim.storage.Docs.list()).items, []);
  t += 1000;
  await sim.storage.Docs.upload('b.txt', 'B');
  assert.throws(() => sim.interrupt('delete', 'Docs', 'nope.txt'), /^Error: Playground:/);
});

test('storage: drag and drop helper reads dropped files', () => {
  const f = new File(['x'], 'x.pdf', { type: 'application/pdf' });
  assert.deepEqual(S.filesFromDataTransfer({ files: [f], items: [] }), [f]);
  assert.deepEqual(S.filesFromDataTransfer({ files: [], items: [{ kind: 'string', getAsFile: () => null }, { kind: 'file', getAsFile: () => f }] }), [f]);
  assert.deepEqual(S.filesFromDataTransfer(null), []);
  const listeners = {};
  const el = { dataset: {}, addEventListener: (t, fn) => (listeners[t] = fn), removeEventListener: (t) => delete listeners[t] };
  let got = [];
  const detach = S.attachDropZone(el, (files) => (got = files));
  const ev = { preventDefault() {}, dataTransfer: { files: [f], items: [], dropEffect: 'none' } };
  listeners.dragover(ev);
  assert.equal(el.dataset.dragging, 'true');
  listeners.drop(ev);
  assert.deepEqual(got, [f]);
  assert.equal(el.dataset.dragging, undefined);
  detach();
  assert.deepEqual(Object.keys(listeners), []);
});

// ---------------------------------------------------------------- Fabric IQ
const ID = F.CONTOSO_ARTIFACT_ID;
const text = (r) => r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');

test('fabric iq: replayed answers come only from saved snapshots, labelled', async () => {
  const iq = new F.SimFabricIqClient({ delayMs: 0 });
  const statuses = [];
  const first = await iq.ask(ID, [{ role: 'user', content: 'What was revenue in Germany in 2024?' }], { onTaskUpdate: (u) => statuses.push(u.status) });
  assert.deepEqual(statuses, ['working', 'completed']);
  assert.equal(first.result.isError, undefined);
  assert.match(text(first.result), /^Playground: replayed answer\./);
  assert.match(text(first.result), /Revenue \(Germany, 2024\): 2,755,402\.99\./); // totals-2024-germany
  assert.equal(first.result.structuredContent.snapshot, 'totals-2024-germany');
  assert.match(first.result.structuredContent.dax, /TREATAS \( \{ "Germany" \}/);
  assert.equal(first.messages.length, 2);
  assert.deepEqual(first.messages[1], { role: 'assistant', content: first.result });

  // The follow-up with the history keeps Germany; without it, Germany is lost.
  const withHistory = await iq.ask(ID, [...first.messages, { role: 'user', content: 'What about 2025?' }]);
  assert.equal(withHistory.result.structuredContent.snapshot, 'totals-2025-germany');
  const withoutHistory = await iq.ask(ID, [{ role: 'user', content: 'What about 2025?' }]);
  assert.equal(withoutHistory.result.structuredContent.snapshot, 'totals-2025');
  assert.match(text(withoutHistory.result), /all store countries, 2025/);
  const orders = await iq.ask(ID, [...withHistory.messages, { role: 'user', content: 'How many orders was that?' }]);
  assert.match(text(orders.result), /Orders \(Germany, 2025\): /);
  const cats = await iq.ask(ID, [...orders.messages, { role: 'user', content: 'Break that down by category.' }]);
  assert.equal(cats.result.structuredContent.snapshot, 'sales-by-category-2025-germany');
  assert.equal(cats.messages.length, 8);

  // every question in the set has a saved snapshot behind it, or answers isError (never invented)
  for (const q of [...F.SUGGESTED_QUESTIONS]) {
    const r = await iq.ask(ID, [{ role: 'user', content: q }]);
    assert.equal(r.result.isError, undefined, q);
  }
  assert.ok(F.allQuestions().length > 100);
});

test('fabric iq: unknown questions and other artifacts answer isError with a clear message', async () => {
  const iq = new F.SimFabricIqClient({ delayMs: 0 });
  const r = await iq.ask(ID, [{ role: 'user', content: 'Why did sales drop in March?' }]);
  assert.equal(r.result.isError, true);
  assert.match(text(r.result), /^Playground: this question is not in the recording/);
  assert.equal(r.messages.length, 2);
  const other = await iq.ask('11111111-2222-3333-4444-555555555555', [{ role: 'user', content: 'What was total revenue?' }]);
  assert.equal(other.result.isError, true);
  assert.match(text(other.result), /only for the Contoso model/);
  // a combination with no saved result
  const rank = await iq.ask(ID, [{ role: 'user', content: 'Which store country had the most revenue in 2024?' }]);
  const rank25 = await iq.ask(ID, [...rank.messages, { role: 'user', content: 'What about 2025?' }]);
  assert.equal(rank25.result.structuredContent.snapshot, 'sales-by-country-2025');
  const rankDe = await iq.ask(ID, [...rank.messages, { role: 'user', content: 'What about Germany?' }]);
  assert.equal(rankDe.result.isError, true);
  assert.match(text(rankDe.result), /no saved query result/);
});

test('fabric iq: the documented checks run before any request', async () => {
  let requests = 0;
  const iq = new F.SimFabricIqClient({ delayMs: 0, mode: () => (requests++, 'normal') });
  const bad = async (artifact, messages, re) => {
    await assert.rejects(iq.ask(artifact, messages), (e) => e instanceof F.FabricIqMcpAdapterError && e.name === 'FabricIqMcpAdapterError' && re.test(e.message));
  };
  const q = [{ role: 'user', content: 'What was total revenue?' }];
  await bad('', q, /nonempty artifact GUID/);
  await bad('00000000-0000-0000-0000-000000000000', q, /nonempty artifact GUID/);
  await bad('not-a-guid', q, /nonempty artifact GUID/);
  await bad(ID, [], /complete conversation/);
  await bad(ID, [{ role: 'system', content: 'x' }], /user text or assistant/);
  await bad(ID, [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }], /last conversation entry/);
  await bad(ID, [{ role: 'user', content: '   ' }], /last conversation entry/);
  await bad(ID, [{ role: 'user', content: 'x'.repeat(20_001) }], /20000 query characters and 40000 context/);
  const long = [{ role: 'user', content: 'y'.repeat(39_990) }, { role: 'assistant', content: 'z' }, { role: 'user', content: 'What was total revenue?' }];
  await bad(ID, long, /history was not truncated/);
  assert.equal(requests, 0, 'no request was made');
  // exactly at the limits is fine
  const q20k = await iq.ask(ID, [{ role: 'user', content: 'q'.repeat(20_000) }]);
  assert.equal(q20k.result.isError, true);
  const ctx = JSON.stringify([{ role: 'user', content: '' }]).length;
  const at40k = [{ role: 'user', content: 'h'.repeat(40_000 - ctx) }, { role: 'user', content: 'What was total revenue?' }];
  assert.equal(JSON.stringify(at40k.slice(0, -1)).length, 40_000);
  assert.equal((await iq.ask(ID, at40k)).result.isError, undefined);
});

test('fabric iq: not-enabled mode, abort, close, tools', async () => {
  let mode = 'not-enabled';
  const iq = new F.SimFabricIqClient({ delayMs: 50, mode: () => mode });
  // the real error carries only the HTTP status; the explanation is a playground note beside it
  await assert.rejects(
    iq.ask(ID, [{ role: 'user', content: 'What was total revenue?' }]),
    (e) => e instanceof F.FabricIqMcpAdapterError && e.message === 'Fabric IQ MCP connector invocation failed (HTTP 404).' && /^Playground: .*not enabled/.test(e.playgroundNote),
  );
  await assert.rejects(iq.listTools(), F.FabricIqMcpAdapterError);
  await assert.rejects(iq.callTool(''), /HTTP 404/); // connecting fails before the name is checked
  // validation still comes first
  await assert.rejects(iq.ask('', [{ role: 'user', content: 'x' }]), /nonempty artifact GUID/);
  mode = 'normal';
  assert.deepEqual((await iq.listTools()).tools.map((t) => t.name), ['AskPowerBI']);
  const c = new AbortController();
  const p = iq.ask(ID, [{ role: 'user', content: 'What was total revenue?' }], { signal: c.signal });
  c.abort();
  await assert.rejects(p, (e) => e.name === 'AbortError');
  const direct = await iq.callTool('AskPowerBI', { artifactId: ID, query: 'What about France?', context: JSON.stringify([{ role: 'user', content: 'What was revenue in 2024?' }]) });
  assert.equal(direct.structuredContent.snapshot, 'totals-2024-france');
  assert.equal((await iq.callTool('SomethingElse', {})).isError, true);
  await iq.close();
  await assert.rejects(iq.ask(ID, [{ role: 'user', content: 'x' }]), /connector is closed/);
  await assert.rejects(iq.listTools(), /connector is closed/);
});

test('fabric iq: package shape, lazy connect, callTool argument checks', async () => {
  const pkg = F.fabricIqPackage({ delayMs: 0 });
  // every class the package exports exists at run time
  assert.equal(new pkg.FabricIqMcpHttpError(429, { 'Retry-After': '10' }).message, 'Fabric IQ MCP returned HTTP 429.');
  assert.equal(new pkg.FabricIqMcpHttpError(429, { 'Retry-After': '10' }).getResponseHeader('retry-after'), '10');
  assert.equal(new pkg.FabricIqMcpHttpError(429).name, 'FabricIqMcpHttpError');
  const contract = new pkg.FabricIqMcpContractError('LIMIT_EXCEEDED', 'too big');
  assert.deepEqual([contract.name, contract.code, contract.message], ['FabricIqMcpContractError', 'LIMIT_EXCEEDED', 'too big']);
  assert.equal(typeof pkg.fabricIqMcp().operations.executeQuery.invoke, 'function');
  await assert.rejects(pkg.fabricIqMcp().operations.executeQuery.invoke({}, () => {}), /^Error: Playground:/);
  // creating the wrapper checks nothing; the first call does
  const broken = pkg.createFabricIqMcpConnectorClient({});
  assert.ok(broken instanceof F.SimFabricIqClient);
  await assert.rejects(broken.listTools(), /^TypeError: Playground: .*executeQuery/);
  const iq = pkg.createFabricIqMcpConnectorClient({ executeQuery() {} });
  await assert.rejects(iq.callTool(''), { name: 'FabricIqMcpAdapterError', message: 'Tool name must be non-empty.' });
  await assert.rejects(iq.callTool('   '), { message: 'Tool name must be non-empty.' });
  await assert.rejects(iq.callTool('AskPowerBI', []), { message: 'Tool arguments must be an object.' });
  await assert.rejects(iq.callTool('AskPowerBI', new Map()), { message: 'Tool arguments must be an object.' });
});

test('fabric iq: a task that ends failed throws, cancelled is an AbortError', async () => {
  let mode = 'task-failed';
  const iq = new F.SimFabricIqClient({ delayMs: 0, mode: () => mode });
  const statuses = [];
  const q = [{ role: 'user', content: 'What was total revenue?' }];
  await assert.rejects(iq.ask(ID, q, { onTaskUpdate: (u) => statuses.push(u.status) }), (e) =>
    e instanceof F.FabricIqMcpAdapterError && e.message === 'Fabric IQ MCP task ended with status "failed".' && /^Playground:/.test(e.playgroundNote),
  );
  assert.deepEqual(statuses, ['working', 'failed']);
  mode = 'task-cancelled';
  statuses.length = 0;
  await assert.rejects(iq.ask(ID, q, { onTaskUpdate: (u) => statuses.push(u.status) }), { name: 'AbortError', message: 'Fabric IQ MCP task was cancelled.' });
  assert.deepEqual(statuses, ['working', 'cancelled']);
  // only a completed task resolves, even when it reports a tool failure
  mode = 'normal';
  assert.equal((await iq.ask(ID, [{ role: 'user', content: 'Why?' }])).result.isError, true);
});

test('fabric iq: runs as the signed-in persona; signed out fails', async () => {
  const who = { current: alice };
  const log = [];
  const iq = new F.SimFabricIqClient({ delayMs: 0, getUser: () => who.current, onAsk: (e) => log.push(e) });
  const q = [{ role: 'user', content: 'What was total revenue?' }];
  const a = await iq.ask(ID, q);
  who.current = carol;
  const c = await iq.ask(ID, q);
  assert.deepEqual(log.map((e) => e.runsAs), ['sub-alice', 'sub-carol']);
  // the same replayed answer for every persona: the recording has no RLS or OLS (documented in fabric-iq.ts)
  assert.deepEqual(a.result, c.result);
  who.current = null;
  await assert.rejects(iq.ask(ID, q), (e) => e instanceof F.FabricIqMcpAdapterError && e.message === 'Fabric IQ MCP connector invocation failed (HTTP 401).' && /signed-in user/.test(e.playgroundNote));
  // the input checks still come first
  await assert.rejects(iq.ask('', q), /nonempty artifact GUID/);
});

// ---------------------------------------------------------------- functions and OneLake
const owner = { sub: 'sub-owner', name: 'Olivia (app owner)' };
const dev = { sub: 'sub-dev', name: 'You (rayfin dev)' };
const WS = '00000000-0000-0000-0000-00000000c0de';
const LAKE = '00000000-0000-0000-0000-00000001a4e0';
const fileUrl = (p) => `https://${U.ONELAKE_DFS_HOST}/${WS}/${LAKE}/Files/${p}`;

function world({ roles = { [owner.sub]: 'Contributor' }, mode = 'deployed', unminted } = {}) {
  const state = { caller: { sub: alice.sub, name: 'Alice' }, mode };
  const events = [];
  const host = U.createFunctionHost({ appOwner: owner, developer: dev, getCaller: () => state.caller, mode: () => state.mode, unminted, onEvent: (e) => events.push(e) });
  const lake = U.createOneLakeSim({ workspaceId: WS, items: [{ itemId: LAKE, displayName: 'ContosoLake' }], roles, resolveToken: host.tokenInfo });
  // The lesson's function: create, append, flush (ADLS Gen2 Path - Create / Path - Update).
  host.register('saveToLake', async (ctx, fileName, text) => {
    const auth = { Authorization: `Bearer ${ctx.Tokens.Storage}` };
    const url = fileUrl(`uploads/${fileName}`);
    const bytes = new TextEncoder().encode(text);
    for (const [method, q, body, extra] of [
      ['PUT', '?resource=file', undefined, {}],
      ['PATCH', '?action=append&position=0', bytes, {}],
      ['PATCH', `?action=flush&position=${bytes.byteLength}`, undefined, { 'x-ms-content-type': 'text/csv' }],
    ]) {
      const res = await lake.fetch(url + q, { method, body, headers: { ...auth, ...extra } });
      if (!res.ok) throw new Error(`OneLake ${method} failed: ${res.status} ${(await res.json()).error.code}`);
    }
    return { path: `Files/uploads/${fileName}`, by: ctx.user.id };
  }, [U.AudienceType.Storage]);
  return { host, lake, state, events };
}

test('functions: called by the signed-in person, external calls run as the app owner', async () => {
  const { host, lake, events } = world();
  const r = await host.invoke('saveToLake', 'targets.csv', 'country,target\nGermany,3000000\n');
  assert.deepEqual(r, { path: 'Files/uploads/targets.csv', by: 'sub-alice' });
  const [f] = lake.files();
  assert.deepEqual({ ...f, updatedAt: '' }, { item: 'ContosoLake', path: 'Files/uploads/targets.csv', size: 31, contentType: 'text/csv', writtenBy: 'sub-owner', updatedAt: '', uncommittedBytes: 0 });
  assert.deepEqual(events.at(-1), { name: 'saveToLake', caller: 'sub-alice', tokensAs: 'sub-owner', audiences: ['Storage'], ok: true });
  // reading it back with the same token type
  host.register('readBack', async (ctx, p) => (await lake.fetch(fileUrl(p), { headers: { Authorization: `Bearer ${ctx.Tokens.Storage}` } })).text(), ['Storage']);
  assert.equal(await host.invoke('readBack', 'uploads/targets.csv'), 'country,target\nGermany,3000000\n');
});

test('functions: works locally as you, fails deployed when the owner has no write role', async () => {
  const w = world({ roles: { [dev.sub]: 'Contributor', [owner.sub]: 'Viewer' }, mode: 'local' });
  await w.host.invoke('saveToLake', 'a.csv', 'x');
  assert.equal(w.lake.files()[0].writtenBy, 'sub-dev');
  w.state.mode = 'deployed';
  await assert.rejects(w.host.invoke('saveToLake', 'b.csv', 'x'), /OneLake PUT failed: 403 AuthorizationFailure/);
  assert.equal(w.events.at(-1).ok, false);
  assert.equal(w.events.at(-1).tokensAs, 'sub-owner');
});

test('onelake: a Viewer reads and writes through OneLake security roles', async () => {
  const run = async (lakeRole) => {
    const state = { caller: { sub: alice.sub, name: 'Alice' } };
    const host = U.createFunctionHost({ appOwner: owner, getCaller: () => state.caller });
    const lake = U.createOneLakeSim({
      workspaceId: WS,
      items: [{ itemId: LAKE, displayName: 'ContosoLake' }],
      roles: { [owner.sub]: 'Viewer' },
      oneLakeRoles: lakeRole ? { [owner.sub]: lakeRole } : undefined,
      resolveToken: host.tokenInfo,
    });
    host.register('try', async (ctx) => {
      const auth = { Authorization: `Bearer ${ctx.Tokens.Storage}` };
      const read = await lake.fetch(fileUrl('none.txt'), { headers: auth });
      const write = await lake.fetch(fileUrl('a.txt') + '?resource=file', { method: 'PUT', headers: auth });
      const message = async (res) => (res.ok || res.status === 404 ? '' : (await res.json()).error.message);
      return [read.status, write.status, await message(read), await message(write)];
    }, ['Storage']);
    return host.invoke('try');
  };
  const [r0, w0, why] = await run(undefined);
  assert.deepEqual([r0, w0], [403, 403]);
  assert.match(why, /^This request is not authorized to perform this operation\. Playground: .*Viewer role and no OneLake security role.*Read or ReadWrite \(DefaultReader gives Read to users with ReadAll\)/);
  const [r1, w1, , whyWrite] = await run('Read');
  assert.deepEqual([r1, w1], [404, 403]); // reads (the file just isn't there), can't write
  assert.match(whyWrite, /Viewer role and a OneLake security role with Read\. Writing OneLake data needs Admin, Member or Contributor, or a OneLake security role with ReadWrite\.$/);
  assert.deepEqual((await run('ReadWrite')).slice(0, 2), [404, 201]);
});

test('functions: tokens are bounded by the declared audiences', async () => {
  const { host } = world({ unminted: ['Fabric'] });
  host.register('peek', async (ctx) => Object.keys(ctx.Tokens), ['Storage', 'Fabric']);
  assert.deepEqual(await host.invoke('peek'), ['Storage']); // the unminted one is not enumerable
  host.register('readFabric', async (ctx) => ctx.Tokens.Fabric, ['Fabric']);
  await assert.rejects(host.invoke('readFabric'), (e) =>
    e instanceof U.UserDataFunctionInvalidInputError &&
    e.name === 'UserDataFunctionInvalidInputError' &&
    e.errorCode === 'InvalidInput' &&
    e.message === "No token available for audience 'Fabric'. Ensure a connection with this audience is declared.",
  );
  host.register('noAudience', async (ctx) => ctx.Tokens.Storage, []);
  assert.equal(await host.invoke('noAudience'), undefined);
  await assert.rejects(host.invoke('missing'), /no function named/);
  // GUID custom audiences are valid
  host.register('guid', async (ctx) => typeof ctx.Tokens['11111111-2222-3333-4444-555555555555'], ['11111111-2222-3333-4444-555555555555']);
  assert.equal(await host.invoke('guid'), 'string');
  assert.equal(U.isValidCustomAudience('11111111-2222-3333-4444-555555555555'), true);
  assert.equal(U.isValidCustomAudience('api://contoso-api'), true);
  for (const bad of ['https://x/.default', 'https://x?y', 'http://x', '*', 'contoso', '']) assert.equal(U.isValidCustomAudience(bad), false, bad);
});

test('functions: the context goes wherever RayfinContext is declared', async () => {
  const { host } = world();
  host.register('ctxSecond', async (a, ctx, b) => `${a}|${ctx.user.id}|${typeof ctx.Tokens.Storage}|${b}`, ['Storage'], { contextAt: 1 });
  assert.equal(await host.invoke('ctxSecond', 'x', 'y'), 'x|sub-alice|string|y');
  host.register('noCtx', async (name) => `Hello ${name}!`, [], { contextAt: null });
  assert.equal(await host.invoke('noCtx', 'Ada'), 'Hello Ada!');
  const pkg = U.userDataFunctionsPackage(host, (n) => (n === 'udfLast' ? { audiences: ['Fabric'], contextAt: 1 } : {}));
  new pkg.UserDataFunctions().func('udfLast', async (x, ctx) => `${x}:${Object.keys(ctx.Tokens)}`, []);
  assert.equal(await host.invoke('udfLast', 7), '7:Fabric');
});

test('functions: udf.func connections join the annotated audiences', async () => {
  const { host } = world();
  const pkg = U.userDataFunctionsPackage(host, (n) => (n === 'viaUdf' || n.startsWith('meta') ? { audiences: ['Storage'] } : {}));
  const udf = new pkg.UserDataFunctions();
  udf.func('viaUdf', async (ctx, x) => `${typeof ctx.Tokens.Storage}:${x}`, []);
  assert.equal(await host.invoke('viaUdf', 1), 'string:1');
  udf.func('metaPlusConn', async (ctx) => Object.keys(ctx.Tokens).sort(), [
    udf.connection({ audienceType: pkg.AudienceType.Sql }),
    udf.connection({ audienceType: pkg.AudienceType.Storage }), // already annotated: once
    udf.connection({ audience: 'api://contoso-api' }),
    udf.connection({ alias: 'ContosoLake' }), // binds a FabricItem parameter: not simulated, ignored
  ]);
  assert.deepEqual(await host.invoke('metaPlusConn'), ['Sql', 'Storage', 'api://contoso-api']);
  // an invalid custom audience: registered, but every invocation fails
  udf.func('badAudience', async () => 'never', [udf.connection({ audience: 'https://contoso/.default' })]);
  await assert.rejects(host.invoke('badAudience'), (e) =>
    e instanceof U.UserDataFunctionInternalError && e.errorCode === 'InternalError' && e.message === U.INVALID_CONNECTION_AUDIENCE_MESSAGE,
  );
  assert.equal(pkg.Connection, U.Connection);
  assert.equal(new pkg.UserDataFunctionError('X').errorCode, 'X');
});

test('functions: request, response and time limits', async () => {
  const { host } = world();
  host.register('echo', async (ctx, s) => s.length, []);
  assert.equal(await host.invoke('echo', 'x'.repeat(4 * 1024 * 1024 - 10)), 4 * 1024 * 1024 - 10);
  await assert.rejects(host.invoke('echo', 'x'.repeat(4 * 1024 * 1024)), /^Error: Playground: .*at most 4 MB/);
  host.register('big', async (ctx, n) => 'y'.repeat(n), []);
  assert.equal((await host.invoke('big', 30 * 1024 * 1024 - 2)).length, 30 * 1024 * 1024 - 2); // with its JSON quotes: exactly 30 MiB
  await assert.rejects(host.invoke('big', 30 * 1024 * 1024 - 1), (e) =>
    e instanceof U.UserDataFunctionError && e.errorCode === 'ResponseTooLarge' && e.message === "Function's response size is larger than the 30 megabyte limit.",
  );
  assert.equal(U.TIMEOUT_MS, 240_000);
  const quick = U.createFunctionHost({ appOwner: owner, getCaller: () => ({ sub: alice.sub, name: 'Alice' }), timeoutMs: 20 });
  quick.register('slow', () => new Promise((r) => setTimeout(() => r('late'), 200)), []);
  quick.register('fast', async () => 'ok', []);
  await assert.rejects(quick.invoke('slow'), /^Error: Playground: "slow" ran longer than 0.02 seconds/);
  assert.equal(await quick.invoke('fast'), 'ok');
});

test('functions: signed out, and tokens of the wrong audience', async () => {
  const { host, lake, state } = world();
  state.caller = null;
  await assert.rejects(host.invoke('saveToLake', 'a.csv', 'x'), /nobody is signed in/);
  state.caller = { sub: alice.sub, name: 'Alice' };
  host.register('wrongAudience', async (ctx) => (await lake.fetch(fileUrl('x.txt') + '?resource=file', { method: 'PUT', headers: { Authorization: `Bearer ${ctx.Tokens.Fabric}` } })).status, ['Fabric']);
  assert.equal(await host.invoke('wrongAudience'), 401);
  assert.equal((await lake.fetch(fileUrl('x.txt'))).status, 401);
  await assert.rejects(lake.fetch('https://example.com/x'), /only the simulated OneLake/);
});

test('onelake: create / append / flush rules from the ADLS Gen2 reference', async () => {
  const { host, lake } = world();
  host.register('raw', async (ctx, steps) => {
    const out = [];
    for (const [method, path, body, headers = {}] of steps) {
      const res = await lake.fetch(fileUrl(path), { method, body, headers: { Authorization: `Bearer ${ctx.Tokens.Storage}`, ...headers } });
      out.push(res.ok ? res.status : `${res.status} ${(await res.json()).error.code}`);
    }
    return out;
  }, ['Storage']);
  const r = await host.invoke('raw', [
    ['PATCH', 'f.txt?action=append&position=0', 'x'], // not created yet
    ['PUT', 'f.txt?resource=file'],
    ['PUT', 'f.txt?resource=file', undefined, { 'If-None-Match': '*' }],
    ['PATCH', 'f.txt?action=append&position=0', 'abc'],
    ['GET', 'f.txt'], // appended but not flushed: empty
    ['PATCH', 'f.txt?action=flush&position=4'], // wrong length
    ['PATCH', 'f.txt?action=append&position=3', 'de'],
    ['PATCH', 'f.txt?action=flush&position=5', 'body'], // flush with a body
    ['PATCH', 'f.txt?action=flush&position=5'],
    ['PATCH', 'f.txt?action=append'], // no position
    ['GET', 'g.txt'],
    ['PUT', 'f.txt'], // no resource=file
    ['GET', '../Tables/t'],
  ]);
  assert.deepEqual(r, [
    '404 PathNotFound', 201, '409 PathAlreadyExists', 202, 200, '400 InvalidFlushPosition', 202,
    '400 ContentLengthMustBeZero', 200, '400 MissingRequiredQueryParameter', '404 PathNotFound',
    '400 InvalidQueryParameterValue', '400 InvalidUri',
  ]);
  assert.equal(lake.files()[0].size, 5);
});
