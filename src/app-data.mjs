// The app's own database, simulated. Pure functions: the terminal (`npx rayfin up db apply`), the page's
// data calls, the Data tab and tools/check-lessons.mjs all use them.
//
// What is simulated, and how (rayfin.ai: Data, Permissions, Schema changes; Microsoft Learn: Define data
// models, Define data permissions):
// - Entities are every exported @entity() class in packages/data/src/*.ts, as the Rayfin CLI collects them (it doesn't
//   need the `schema` array). The real CLI compiles them and reads their metadata; here a small parser reads the source.
// - `db apply` compares the declared entities with the tables it applied last time. It blocks the changes
//   Rayfin's docs call potentially destructive (dropping a column or table, narrowing or changing a type)
//   unless `--force` is given. The real CLI's output wording is not documented: the terminal prints
//   `Playground:` lines.
// - Each request is checked against the entity's permission rules for the signed-in person's claims, in
//   the browser. On Fabric, the app's data API (Data API builder) checks them on the server.
// - Rows live in the project (in this browser only), with the rest of the course's state.

// ---------------------------------------------------------------- reading the source
/** Text between balanced brackets, starting at `open` (the index of the opening bracket). */
function balanced(text, open) {
  const pairs = { '(': ')', '[': ']', '{': '}', '<': '>' };
  const stack = [];
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c in pairs && (c !== '<' || stack.length === 0 || text[open] === '<')) stack.push(pairs[c]);
    else if (stack.length && c === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return { inner: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return undefined;
}

/** Split at top-level commas. */
function splitTop(text) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Line comments and block comments removed, strings kept. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

/** A literal value: number, string, boolean, null; or undefined if it isn't one. */
function literal(src) {
  const s = src.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^'[^']*'$|^"[^"]*"$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  return undefined;
}

/** `{ max: 50, optional: true }` → { max: 50, optional: true }. Values that aren't literals are kept as text. */
function objectLiteral(src) {
  const s = src.trim();
  if (!s.startsWith('{')) return {};
  const b = balanced(s, 0);
  if (!b) return {};
  const out = {};
  for (const part of splitTop(b.inner)) {
    const m = part.match(/^(\w+)\s*:\s*([\s\S]+)$/);
    if (!m) continue;
    const v = literal(m[2]);
    out[m[1]] = v === undefined ? m[2].trim() : v;
  }
  return out;
}

const stringList = (src) => {
  const s = String(src ?? '').trim();
  if (s.startsWith('[')) return splitTop(s.slice(1, -1)).map(literal).filter((x) => typeof x === 'string');
  const one = literal(s);
  return typeof one === 'string' ? [one] : [];
};

const FIELD_KINDS = ['uuid', 'text', 'int', 'decimal', 'date', 'boolean', 'set', 'email'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

/**
 * One entity file, as the CLI would see it: its class, its fields (from the field decorators) and its
 * permission rules (from @authenticated, @anonymous and @role). Returns undefined if the file has no @entity().
 */
export function parseEntity(text, file = '') {
  const src = stripComments(text);
  if (!/@entity\s*\(/.test(src)) return undefined;
  const cls = src.match(/export\s+class\s+(\w+)(\s+extends\s+[^{]+)?\s*\{/);
  if (!cls) return undefined;
  const head = src.slice(0, cls.index);
  const body = balanced(src, cls.index + cls[0].length - 1)?.inner ?? '';
  const problems = [];

  // Class decorators: the permission rules.
  const rules = [];
  for (const m of head.matchAll(/@(authenticated|anonymous|role)\s*\(/g)) {
    const b = balanced(head, m.index + m[0].length - 1);
    if (!b) continue;
    const args = splitTop(b.inner);
    let role = m[1];
    if (role === 'role') role = literal(args.shift() ?? '') ?? 'authenticated';
    const actionsArg = args[0] && !args[0].startsWith('{') ? args.shift() : undefined;
    let actions = actionsArg === undefined ? ['*'] : stringList(actionsArg);
    if (actions.includes('*')) actions = [...ACTIONS];
    const opts = args[0] ?? '';
    const rule = { role, actions, source: `@${m[1]}(${b.inner.replace(/\s+/g, ' ').trim()})` };
    const policyAt = opts.search(/\bpolicy\s*:/);
    if (policyAt >= 0) {
      const after = opts.slice(policyAt).replace(/^policy\s*:\s*/, '');
      const text = splitTop(after.replace(/\}\s*$/, ''))[0] ?? '';
      try {
        rule.policy = parsePolicy(text);
      } catch (e) {
        problems.push(`${file}: the policy could not be read here (${e.message})`);
        rule.policy = { error: e.message, text: text.replace(/\s+/g, ' ').trim() };
      }
    }
    const inc = opts.match(/\binclude\s*:\s*(\[[^\]]*\])/);
    const exc = opts.match(/\bexclude\s*:\s*(\[[^\]]*\])/);
    if (inc) rule.include = stringList(inc[1]);
    if (exc) rule.exclude = stringList(exc[1]);
    rules.push(rule);
  }

  // Fields: `@text({ max: 50 }) country!: string;`
  const fields = [];
  for (const m of body.matchAll(/@(\w+)\s*\(/g)) {
    if (!FIELD_KINDS.includes(m[1])) continue;
    const b = balanced(body, m.index + m[0].length - 1);
    if (!b) continue;
    const rest = body.slice(b.end).match(/^\s*(?:readonly\s+)?(\w+)\s*([?!])?\s*:\s*([^;\n]+)/);
    if (!rest) continue;
    const kind = m[1] === 'email' ? 'text' : m[1];
    const args = splitTop(b.inner);
    const opts = args[0]?.startsWith('{') ? objectLiteral(args[0]) : {};
    const field = { name: rest[1], kind, mark: rest[2] ?? '', tsType: rest[3].trim(), optional: opts.optional === true };
    for (const k of ['max', 'min', 'precision', 'scale', 'default', 'unique', 'column']) if (opts[k] !== undefined) field[k] = opts[k];
    if (kind === 'set') field.values = args.filter((a) => !a.startsWith('{')).map(literal).filter((x) => typeof x === 'string');
    fields.push(field);
  }
  if (!fields.some((f) => f.name === 'id')) fields.unshift({ name: 'id', kind: 'uuid', mark: '!', tsType: 'string', optional: false, implicit: true });
  return { name: cls[1], file, fields, rules, explicitRules: rules.length > 0, problems };
}

// ---------------------------------------------------------------- the policy DSL
// (rayfin.ai: Permissions, operators: .eq() and .neq(); combining: .and() and .or())
/**
 * `(claims, item) => claims.sub.eq(item.owner_id)` → a small tree:
 * { op: 'eq'|'neq', left, right } | { op: 'and'|'or', left, right }, where a side is
 * { claim: 'sub' } | { field: 'owner_id' } | { value: 'director' }.
 */
export function parsePolicy(source) {
  const text = source.trim();
  const arrow = text.match(/^\(?\s*(\w+)\s*(?:,\s*(\w+)\s*)?\)?\s*=>\s*([\s\S]+)$/);
  if (!arrow) throw new Error('expected (claims, item) => …');
  const [, claimsName, itemName, expr] = arrow;
  let i = 0;
  const s = expr.replace(/\s+/g, ' ').trim();
  const ws = () => {
    while (s[i] === ' ') i++;
  };
  const ident = () => {
    ws();
    const m = s.slice(i).match(/^[A-Za-z_$][\w$]*/);
    if (!m) throw new Error(`unexpected "${s.slice(i, i + 12)}"`);
    i += m[0].length;
    return m[0];
  };
  const expect = (c) => {
    ws();
    if (s[i] !== c) throw new Error(`expected "${c}" at "${s.slice(i, i + 12)}"`);
    i++;
  };
  const primary = () => {
    ws();
    if (s[i] === '(') {
      i++;
      const e = chain();
      expect(')');
      return e;
    }
    const lit = s.slice(i).match(/^('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?|true|false|null)/);
    if (lit) {
      i += lit[0].length;
      return { value: literal(lit[0]) };
    }
    const root = ident();
    expect('.');
    const name = ident();
    if (root === claimsName) return { claim: name };
    if (itemName && root === itemName) return { field: name };
    throw new Error(`"${root}" is neither ${claimsName} nor ${itemName ?? 'item'}`);
  };
  const chain = () => {
    let left = primary();
    for (;;) {
      ws();
      if (s[i] !== '.') return left;
      i++;
      const method = ident();
      expect('(');
      const arg = chain();
      expect(')');
      if (method === 'eq' || method === 'neq') {
        if (!('claim' in left || 'field' in left)) throw new Error(`.${method}() needs a claim or a field on its left`);
        left = { op: method, left, right: arg };
      } else if (method === 'and' || method === 'or') {
        if (!('op' in left) || !('op' in arg)) throw new Error(`.${method}() joins two comparisons`);
        left = { op: method, left, right: arg };
      } else {
        throw new Error(`.${method}() is not a policy operator (eq, neq, and, or)`);
      }
    }
  };
  const tree = chain();
  ws();
  if (i < s.length) throw new Error(`unexpected "${s.slice(i, i + 12)}"`);
  if (!('op' in tree)) throw new Error('a policy must compare something');
  return { tree, text: expr.replace(/\s+/g, ' ').trim(), claims: claimsIn(tree), fields: fieldsIn(tree) };
}

const claimsIn = (t) => ('claim' in t ? [t.claim] : 'op' in t ? [...new Set([...claimsIn(t.left), ...claimsIn(t.right)])] : []);
const fieldsIn = (t) => ('field' in t ? [t.field] : 'op' in t ? [...new Set([...fieldsIn(t.left), ...fieldsIn(t.right)])] : []);

class MissingClaim extends Error {}

/** Evaluate a policy tree for one row. Throws MissingClaim when the token lacks a claim the policy names. */
export function evalPolicy(tree, claims, item) {
  const side = (x) => {
    if ('claim' in x) {
      if (!(x.claim in claims)) throw new MissingClaim(x.claim);
      return claims[x.claim];
    }
    if ('field' in x) return item[x.field] ?? null;
    return x.value;
  };
  const same = (a, b) => a === b || (a !== null && b !== null && String(a) === String(b));
  switch (tree.op) {
    case 'eq':
      return same(side(tree.left), side(tree.right));
    case 'neq':
      return !same(side(tree.left), side(tree.right));
    case 'and':
      return evalPolicy(tree.left, claims, item) && evalPolicy(tree.right, claims, item);
    case 'or':
      return evalPolicy(tree.left, claims, item) || evalPolicy(tree.right, claims, item);
    default:
      return false;
  }
}

// ---------------------------------------------------------------- the declared model
export const DATA_DIR = 'packages/data/src';
export const SCHEMA_FILE = `${DATA_DIR}/index.ts`;
/** The shared package's index: UniversalAppSchema, the record types the browser's client is typed by. */
export const SHARED_FILE = 'packages/shared/src/index.ts';

/** Is the data service on in rayfin.yml, and with which dialect? */
export function dataService(project) {
  const yml = project.files['rayfin/rayfin.yml'] ?? '';
  const block = yml.match(/^ {2}data:\n((?: {4}.*\n?)*)/m)?.[1] ?? '';
  return { enabled: /^ {4}enabled: true\s*$/m.test(block), dialect: block.match(/^ {4}dialect: (\S+)/m)?.[1] };
}

/** Every entity file in packages/data/src/, parsed. */
export function entityFiles(project) {
  return Object.keys(project.files)
    .filter((f) => f.startsWith(`${DATA_DIR}/`) && /\.ts$/.test(f) && f !== SCHEMA_FILE && !f.endsWith('.d.ts'))
    .map((f) => parseEntity(project.files[f], f))
    .filter(Boolean);
}

/**
 * The entities `db apply` applies. Like the Rayfin CLI 2.0.0 (rayfin-tools-common, services/data/node/dab-config.js:
 * findCompiledDataFiles, collectEntities), every exported @entity() class in packages/data/src/ counts, whether or not
 * packages/data/src/index.ts lists it: the `schema` array and the type (the template's `UniversalAppSchema`, in packages/shared; `AppSchema` in Rayfin's
 * docs) are the lists Rayfin's docs ask for.
 */
export function declared(project) {
  const entities = entityFiles(project);
  return { entities, problems: entities.flatMap((e) => e.problems) };
}

/** Is the entity in `UniversalAppSchema`, in the shared package? The client's types come from it. */
export function inAppSchema(project, name) {
  const text = stripComments(project.files[SHARED_FILE] ?? '');
  const type = text.match(/export\s+type\s+UniversalAppSchema\s*=\s*\{([^}]*)\}/);
  return !!type && new RegExp(`\\b${name}\\s*:`).test(type[1]);
}

/** A column as the database holds it. `column` names the SQL column when it differs from the property. */
export const columnOf = (f) => {
  const c = { kind: f.kind, optional: f.optional };
  if (f.kind === 'text') c.max = typeof f.max === 'number' ? f.max : 'MAX';
  for (const k of ['min', 'precision', 'scale', 'default']) if (f[k] !== undefined) c[k] = f[k];
  if (f.kind === 'int' && typeof f.max === 'number') c.maxValue = f.max;
  if (f.kind === 'decimal' && typeof f.max === 'number') c.maxValue = f.max;
  if (f.values) c.values = f.values;
  if (f.kind === 'decimal' && c.precision === undefined) {
    c.precision = 18;
    c.scale = 2;
  }
  if (typeof f.column === 'string' && f.column !== f.name) c.column = f.column;
  return c;
};

/** The SQL column of a property: its `column` option, or the property's own name. */
const physical = (name, c) => c.column ?? name;
/** A column's definition, leaving out which property it belongs to. */
const shape = (c) => JSON.stringify({ ...c, column: undefined });

/** How a column reads in SQL terms (for the terminal and the Data tab). */
export function sqlType(c) {
  switch (c.kind) {
    case 'uuid':
      return 'UNIQUEIDENTIFIER';
    case 'text':
      return `NVARCHAR(${c.max})`;
    case 'int':
      return 'INT';
    case 'decimal':
      return `DECIMAL(${c.precision},${c.scale})`;
    case 'date':
      return 'DATETIME2';
    case 'boolean':
      return 'BIT';
    case 'set':
      return `NVARCHAR (one of ${c.values.join(', ')})`;
    default:
      return c.kind.toUpperCase();
  }
}

/** The rules that apply: the written ones, or the default every entity without a decorator gets. */
export const effectiveRules = (e) =>
  e.explicitRules ? e.rules : [{ role: 'authenticated', actions: [...ACTIONS], source: '(no permission decorator: the default)', implicit: true }];

export function emptyDb() {
  return { tables: {}, rows: {} };
}

// ---------------------------------------------------------------- db apply
/**
 * Compare the declared entities with the applied tables. Returns { ops, destructive, blocked, db }:
 * the operations, which of them are potentially destructive, a reason it can't go ahead (if any), and the
 * database after applying (when not blocked).
 */
export function planApply(project, force = false) {
  const db = project.db ?? emptyDb();
  const { entities, problems } = declared(project);
  if (problems.length) return { ops: [], destructive: [], blocked: problems, db };
  const ops = [];
  const destructive = [];
  const stops = [];
  const next = { tables: {}, rows: {} };
  const notNull = (c) => (c.optional ? '' : ' NOT NULL');
  for (const e of entities) {
    const before = db.tables[e.name];
    const rows = db.rows[e.name] ?? [];
    const columns = Object.fromEntries(e.fields.map((f) => [f.name, columnOf(f)]));
    // The property that held each SQL column before: columns are matched by their SQL name.
    const wasNamed = (n, c) => (before ? Object.keys(before.columns).find((b) => physical(b, before.columns[b]) === physical(n, c)) : undefined);
    if (!before) {
      // The real table name is generated from the entity's name (rayfin.ai: Modeling).
      ops.push(`create table for ${e.name} (${Object.entries(columns).map(([n, c]) => `${physical(n, c)} ${sqlType(c)}${notNull(c)}`).join(', ')})`);
      ops.push(`permissions of ${e.name}: ${effectiveRules(e).map((r) => r.source).join(' ')}`);
    } else {
      for (const [n, c] of Object.entries(columns)) {
        const b = wasNamed(n, c);
        const col = physical(n, c);
        if (!b) {
          ops.push(`add column ${e.name}.${col} ${sqlType(c)}${notNull(c)}`);
          if (!c.optional && c.default === undefined && rows.length) {
            stops.push(
              `${e.name} has ${rows.length} row${rows.length > 1 ? 's' : ''}, and ${col} is required. What the real apply does with existing rows isn't documented: empty the table (Data tab) or make ${n} optional first.`,
            );
          }
          continue;
        }
        const was = before.columns[b];
        if (b !== n) ops.push(`property ${b} → ${n}: the column ${col} stays, with its values`);
        if (shape(c) === shape(was)) continue;
        const narrower =
          c.kind !== was.kind ||
          (c.kind === 'text' && c.max !== 'MAX' && (was.max === 'MAX' || c.max < was.max)) ||
          (c.kind === 'decimal' && (c.precision < was.precision || c.scale < was.scale)) ||
          (was.optional && !c.optional);
        const op = `alter column ${e.name}.${col}: ${sqlType(was)}${notNull(was)} → ${sqlType(c)}${notNull(c)}`;
        ops.push(op);
        if (narrower) destructive.push(op);
      }
      for (const [b, bc] of Object.entries(before.columns)) {
        if (!Object.entries(columns).some(([n, c]) => physical(n, c) === physical(b, bc))) {
          const op = `drop column ${e.name}.${physical(b, bc)}${rows.length ? ` (its values in ${rows.length} row${rows.length > 1 ? 's' : ''} are lost)` : ''}`;
          ops.push(op);
          destructive.push(op);
        }
      }
      if (JSON.stringify(effectiveRules(e).map(ruleKey)) !== JSON.stringify(before.rules.map(ruleKey))) ops.push(`permissions of ${e.name}: ${effectiveRules(e).map((r) => r.source).join(' ')}`);
    }
    next.tables[e.name] = { columns, rules: effectiveRules(e), file: e.file };
    next.rows[e.name] = rows.map((r) =>
      Object.fromEntries(
        Object.entries(columns).map(([n, c]) => {
          const b = wasNamed(n, c);
          return [n, b ? r[b] ?? null : null];
        }),
      ),
    );
  }
  for (const name of Object.keys(db.tables)) {
    if (!entities.some((e) => e.name === name)) {
      const op = `drop table for ${name}${db.rows[name]?.length ? ` (${db.rows[name].length} rows are lost)` : ''}`;
      ops.push(op);
      destructive.push(op);
    }
  }
  const blocked = stops.length || (destructive.length && !force) ? [...(destructive.length && !force ? ['potentially destructive'] : []), ...stops] : undefined;
  return { ops, destructive, blocked, db: blocked ? db : next };
}

const ruleKey = (r) => [r.role, r.actions.join(','), r.policy?.text ?? '', (r.include ?? []).join(','), (r.exclude ?? []).join(',')].join('|');

/** Text columns with no `max` in the applied tables: Rayfin's docs say they can break the data API's schema. */
export const unlimitedText = (db) =>
  Object.entries(db?.tables ?? {}).flatMap(([t, d]) => Object.entries(d.columns).filter(([, c]) => c.kind === 'text' && c.max === 'MAX').map(([n]) => `${t}.${n}`));

// ---------------------------------------------------------------- requests
/** One rule, said plainly. */
export function describeRule(r) {
  const who = r.role === 'anonymous' ? 'anyone, signed in or not' : 'any signed-in person';
  const what = r.actions.length === 4 ? 'create, read, update and delete' : r.actions.join(', ');
  const fields = r.include ? `, only ${r.include.join(', ')}` : r.exclude ? `, not ${r.exclude.join(', ')}` : '';
  return `${who}: ${what}${r.policy ? `, where ${r.policy.text}` : ''}${fields}`;
}

function matchesWhere(row, where) {
  if (!where || typeof where !== 'object') return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'and') {
      if (!cond.every((w) => matchesWhere(row, w))) return false;
      continue;
    }
    if (key === 'or') {
      if (!cond.some((w) => matchesWhere(row, w))) return false;
      continue;
    }
    if (!(key in row)) throw new Error(`Playground: the filter names "${key}", which is not a field of this entity.`);
    const v = row[key];
    const ops = cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date) ? cond : { eq: cond };
    for (const [op, x] of Object.entries(ops)) {
      const ok =
        op === 'eq' ? v === x
        : op === 'neq' ? v !== x
        : op === 'gt' ? v > x
        : op === 'gte' ? v >= x
        : op === 'lt' ? v < x
        : op === 'lte' ? v <= x
        : op === 'in' ? x.includes(v)
        : op === 'contains' ? String(v).includes(x)
        : op === 'startsWith' ? String(v).startsWith(x)
        : op === 'isNull' ? (v === null) === Boolean(x)
        : undefined;
      if (ok === undefined) throw new Error(`Playground: the filter operator "${op}" is not simulated here.`);
      if (!ok) return false;
    }
  }
  return true;
}

/** Check one value against its column; returns a problem, or undefined. (Playground wording.) */
function badValue(name, c, v) {
  if (v === null || v === undefined) return c.optional ? undefined : `${name} needs a value: the column is required`;
  if (c.kind === 'text' || c.kind === 'uuid' || c.kind === 'set') {
    if (typeof v !== 'string') return `${name} must be text`;
    if (c.kind === 'text' && c.max !== 'MAX' && v.length > c.max) return `${name} is longer than ${c.max} characters`;
    if (c.kind === 'text' && typeof c.min === 'number' && v.length < c.min) return `${name} is shorter than ${c.min} characters`;
    if (c.kind === 'set' && !c.values.includes(v)) return `${name} must be one of ${c.values.join(', ')}`;
  }
  if (c.kind === 'int' || c.kind === 'decimal') {
    if (typeof v !== 'number' || Number.isNaN(v)) return `${name} must be a number`;
    if (c.kind === 'int' && !Number.isInteger(v)) return `${name} must be a whole number`;
    if (typeof c.min === 'number' && v < c.min) return `${name} must be at least ${c.min}`;
    if (typeof c.maxValue === 'number' && v > c.maxValue) return `${name} must be at most ${c.maxValue}`;
  }
  if (c.kind === 'boolean' && typeof v !== 'boolean') return `${name} must be true or false`;
  if (c.kind === 'date' && Number.isNaN(new Date(v).getTime())) return `${name} must be a date`;
  return undefined;
}

const PAGE = 100;

/**
 * Answer one request to the data API, as the signed-in person.
 *   req:      { entity, op: 'read'|'create'|'update'|'delete', state?, input?, id? }
 *   identity: { signedIn, claims }
 * Returns { ok, result?, error?, rule?, rows?, db } — `db` is the database after the request.
 */
export function handleRequest(db, req, identity, newId = () => crypto.randomUUID()) {
  const table = db?.tables?.[req.entity];
  const fail = (error, rule) => ({ ok: false, error, rule, db });
  if (!table) {
    return fail(`Playground: the app's database has no table for ${req.entity}. Register it in packages/data/src/index.ts and run \`npx rayfin up db apply\`.`);
  }
  const unlimited = unlimitedText(db);
  // rayfin.ai (Field types, text length and MSSQL): a @text() without max can break the data API's schema.
  if (unlimited.length) return fail('Internal server error', `replayed: ${unlimited.join(', ')} is NVARCHAR(MAX)`);
  const role = identity.signedIn ? 'authenticated' : 'anonymous';
  const action = req.op;
  const rules = table.rules.filter((r) => r.role === role && r.actions.includes(action));
  if (!rules.length) {
    return fail(
      `Playground: the data API refused: no rule lets ${identity.signedIn ? 'a signed-in person' : 'someone who is not signed in'} ${action} ${req.entity}.`,
      `no ${role} rule for ${action}`,
    );
  }
  // Several rules for the same role and action: Rayfin warns about the conflict. Here any one of them may allow.
  const rows = db.rows[req.entity] ?? [];
  const missing = new Set();
  const passes = (rule, item) => {
    if (!rule.policy) return true;
    if (rule.policy.error) return false;
    try {
      return evalPolicy(rule.policy.tree, identity.claims ?? {}, item);
    } catch (e) {
      if (e instanceof MissingClaim) {
        missing.add(e.message);
        return false;
      }
      throw e;
    }
  };
  const allowing = (item) => rules.find((r) => passes(r, item));
  // Data API builder answers 403 when a policy names a claim the token doesn't carry (Microsoft Learn,
  // Data API builder database policies, claim substitution).
  const missingClaim = () =>
    missing.size
      ? fail(
          `Playground: the data API refused (403): the policy uses claims.${[...missing][0]}, which this sign-in doesn't carry.`,
          `claim missing: ${[...missing].join(', ')}`,
        )
      : undefined;

  if (action === 'read') {
    const st = req.state ?? {};
    let list;
    try {
      list = rows.filter((r) => allowing(r) && matchesWhere(r, st.where));
    } catch (e) {
      return fail(String(e.message ?? e));
    }
    if (!list.length && missing.size) return missingClaim();
    const select = st.select?.length ? st.select : ['id'];
    for (const f of select) if (!(f in table.columns)) return fail(`Playground: "${f}" is not a field of ${req.entity}.`);
    for (const r of rules) {
      const hidden = r.exclude?.filter((f) => select.includes(f)) ?? [];
      const notIncluded = r.include ? select.filter((f) => f !== 'id' && !r.include.includes(f)) : [];
      if (hidden.length || notIncluded.length) return fail(`Playground: the data API refused: ${[...hidden, ...notIncluded].join(', ')} may not be read.`, r.source);
    }
    const order = Object.entries(st.orderBy ?? {});
    if (order.length) {
      list = [...list].sort((a, b) => {
        for (const [k, dir] of order) {
          if (a[k] !== b[k]) return (a[k] < b[k] ? -1 : 1) * (dir === 'desc' ? -1 : 1);
        }
        return 0;
      });
    }
    const size = Math.min(st.first ?? PAGE, 100_000);
    const start = st.after ? Number(atob(st.after)) || 0 : 0;
    const page = list.slice(start, start + size).map((r) => Object.fromEntries(select.map((f) => [f, r[f]])));
    const allowedBy = rules.map((r) => r.source).join(' or ');
    if (req.kind === 'first') return { ok: true, result: page[0] ?? null, rows: page.length, rule: allowedBy, db };
    if (req.kind === 'paged') {
      const end = start + page.length;
      return { ok: true, result: { items: page, hasNextPage: end < list.length, ...(page.length ? { endCursor: btoa(String(end)) } : {}) }, rows: page.length, rule: allowedBy, db };
    }
    return { ok: true, result: page, rows: page.length, rule: allowedBy, db };
  }

  const input = req.input ?? {};
  for (const k of Object.keys(input)) if (!(k in table.columns)) return fail(`Playground: ${req.entity} has no field named ${k}.`);
  const normal = (k, v) => (v instanceof Date ? v.toISOString() : table.columns[k]?.kind === 'date' && typeof v === 'string' ? new Date(v).toISOString() : v);
  const writeRule = (r) => r && (r.include ? Object.keys(input).filter((k) => k !== 'id' && !r.include.includes(k)) : (r.exclude ?? []).filter((k) => k in input));

  if (action === 'create') {
    const item = { id: input.id ?? newId() };
    for (const [n, c] of Object.entries(table.columns)) {
      if (n === 'id') continue;
      const v = input[n] === undefined ? c.default ?? null : normal(n, input[n]);
      const bad = badValue(n, c, v);
      if (bad) return fail(`Playground: the data API refused the new row: ${bad}.`);
      item[n] = v;
    }
    const rule = allowing(item);
    if (!rule) return missingClaim() ?? fail(`Playground: the data API refused: the new row doesn't pass ${rules.map((r) => r.policy?.text).filter(Boolean).join(' or ')}.`, rules.map((r) => r.source).join(' or '));
    const blockedFields = writeRule(rule);
    if (blockedFields?.length) return fail(`Playground: the data API refused: ${blockedFields.join(', ')} may not be written.`, rule.source);
    const next = { ...db, rows: { ...db.rows, [req.entity]: [...rows, item] } };
    const result = { id: item.id, ...Object.fromEntries(Object.keys(input).map((k) => [k, item[k]])) };
    return { ok: true, result, rule: rule.source, db: next };
  }

  const at = rows.findIndex((r) => r.id === req.id);
  if (at < 0) return fail(`Playground: no ${req.entity} row has the id ${req.id}. (What the real data API answers here isn't documented.)`);
  const row = rows[at];
  const rule = allowing(row);
  if (!rule) {
    return (
      missingClaim() ??
      fail(
        `Playground: the data API refused this ${action}: the row doesn't pass ${rules.map((r) => r.policy?.text).filter(Boolean).join(' or ')} for this person.`,
        rules.map((r) => r.source).join(' or '),
      )
    );
  }
  if (action === 'delete') {
    const next = { ...db, rows: { ...db.rows, [req.entity]: rows.filter((_, i) => i !== at) } };
    return { ok: true, result: { id: row.id }, rule: rule.source, db: next };
  }
  // update: a partial patch
  const blockedFields = writeRule(rule);
  if (blockedFields?.length) return fail(`Playground: the data API refused: ${blockedFields.join(', ')} may not be changed.`, rule.source);
  const changed = { ...row };
  for (const [k, v] of Object.entries(input)) {
    if (k === 'id') continue;
    const nv = normal(k, v);
    const bad = badValue(k, table.columns[k], nv);
    if (bad) return fail(`Playground: the data API refused the change: ${bad}.`);
    changed[k] = nv;
  }
  const next = { ...db, rows: { ...db.rows, [req.entity]: rows.map((r, i) => (i === at ? changed : r)) } };
  const result = { id: row.id, ...Object.fromEntries(Object.keys(input).filter((k) => k !== 'id').map((k) => [k, changed[k]])) };
  return { ok: true, result, rule: rule.source, db: next };
}

// ---------------------------------------------------------------- claims (rayfin.ai: Dynamic auth claims, claim rules)
export const RESERVED_CLAIMS = ['sub', 'email', 'role', 'sid', 'iss', 'aud', 'exp', 'iat', 'nbf', 'jti', 'name', 'scope'];

/** Problems with a set of app-defined claim names (case-insensitive reserved names, the name pattern, at most 8). */
// The name messages are the Rayfin CLI 2.0.0's own (utils/auth-claims-generator.js, validateClaimName).
export function claimNameProblems(names) {
  const out = [];
  if (names.length > 8) out.push(`${names.length} claims: at most 8 are allowed`);
  for (const n of names) {
    const lower = n.toLowerCase();
    const prefix = ['dc_', 'rfn_', 'xms_'].find((x) => lower.startsWith(x));
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(n)) out.push(`Claim '${n}' is not a valid claim name. Names must match ^[A-Za-z][A-Za-z0-9_]*$.`);
    else if (RESERVED_CLAIMS.includes(lower)) out.push(`Claim '${n}' is a reserved claim name and cannot be used as a custom claim.`);
    else if (prefix) out.push(`Claim '${n}' uses the reserved '${prefix}' prefix and cannot be used as a custom claim.`);
  }
  const lowered = names.map((n) => n.toLowerCase());
  if (new Set(lowered).size !== lowered.length) out.push('two claim names differ only by case');
  return out;
}

/**
 * The claims function's declared return type, read from rayfin/functions/src/function_app.ts:
 * `udf.authClaims(async (ctx: AuthClaimsContext): Promise<{ salesRole: string; country: string }> => …)`.
 * Returns { found, claims: [{ name, type }], problems }.
 */
export function claimsContract(text) {
  const src = stripComments(text ?? '');
  const at = src.search(/\budf\.authClaims\s*\(/);
  if (at < 0) return { found: false, claims: [], problems: [] };
  const open = src.indexOf('(', at);
  const call = balanced(src, open)?.inner ?? '';
  const ret = call.match(/\)\s*:\s*(?:Promise\s*<\s*)?\{/);
  if (!ret) return { found: true, claims: [], problems: ['the claims function needs an explicit return type'] };
  const body = balanced(call, ret.index + ret[0].length - 1)?.inner ?? '';
  const claims = [];
  const problems = [];
  for (const part of body.split(/[;,\n]/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(\w+)(\??)\s*:\s*(.+)$/);
    if (!m) continue;
    if (m[2]) problems.push(`"${m[1]}" is optional: claims must be required`);
    const t = m[3].trim();
    // A union of string literals ('a' | 'b') is a string. Written so it can't backtrack: each repeat needs its own "|".
    const type = /^string$|^'[^']*'(?:\s*\|\s*'[^']*')*$/.test(t) ? 'string' : /^number$/.test(t) ? 'number' : /^boolean$/.test(t) ? 'boolean' : undefined;
    if (!type) problems.push(`"${m[1]}" has type ${t}: only string, number or boolean`);
    claims.push({ name: m[1], type: type ?? 'string' });
  }
  problems.push(...claimNameProblems(claims.map((c) => c.name)));
  return { found: true, claims, problems };
}

/** The file `npx rayfin functions init` generates for the claims: the Rayfin CLI 2.0.0's renderDts, verbatim. */
export function claimsTypesFile(claims) {
  return [
    '/**',
    ' * Custom auth claims for this app.',
    ' *',
    ' * AUTO-GENERATED by `rayfin dev` from the udf.authClaims provider — do not',
    " * edit manually. Declaration-merges the provider's return type into",
    ' * RayfinCustomClaims so `claims.<name>` (in policies) and',
    ' * `ctx.getClaims()` (in functions) are fully typed.',
    ' */',
    "import '@microsoft/rayfin-core/experimental/index';",
    '',
    "declare module '@microsoft/rayfin-core/experimental/index' {",
    '  interface RayfinCustomClaims {',
    ...claims.map((c) => `    ${c.name}: ${c.type};`),
    '  }',
    '}',
    '',
  ].join('\n');
}

/** Check what a claims function returned at sign-in (the backend's checks: AUTH_CLAIMS_INVALID_OUTPUT). */
export function checkClaimsResult(value, contract) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'the claims function returned nothing usable';
  const names = Object.keys(value);
  const problems = claimNameProblems(names);
  for (const [k, v] of Object.entries(value)) if (!['string', 'number', 'boolean'].includes(typeof v)) problems.push(`"${k}" is not a string, number or boolean`);
  if (contract?.length) {
    for (const c of contract) if (!(c.name in value)) problems.push(`"${c.name}" is missing`);
    for (const n of names) if (!contract.some((c) => c.name === n)) problems.push(`"${n}" is not in the generated contract`);
  }
  return problems.length ? problems.join('; ') : undefined;
}
