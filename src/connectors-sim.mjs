// How Rayfin 2.0's `client.connectors` finds a connector, and its runtime. Shared by the preview
// (src/runtime.tsx) and tools/check-lessons.mjs, so both follow the same rules, which are those of
// @microsoft/rayfin-connectors 2.0.0 (Connectors.js: createConnectorsApi, resolveName, getEntry):
//
// - Connector names are case-insensitive: an exact configured key first, otherwise the one key that
//   differs only by case. Several such keys throw AMBIGUOUS_CONNECTOR; none throws UNKNOWN_CONNECTOR.
// - The client for a connector is made once, under its configured key, so every spelling gets the same one.
// - Its runtime is then read as `runtime[configured key]`, exactly. A connector with no runtime under that
//   key gets the transport's raw payload, undecoded, and nothing says so (rayfin-cli connector-wiring.js:
//   "a name missing from `connectorRuntimes` fails silently").

/** The real client's error: a name, a code and a message (rayfin-connectors ConnectorsError). */
export function connectorsError(message, code) {
  const e = new Error(message);
  e.name = 'ConnectorsError';
  e.code = code;
  return e;
}

/** The configured key a requested name resolves to. Messages: Rayfin 2.0's own. */
export function resolveName(configs, name) {
  const isConfigured = (key) => Object.prototype.hasOwnProperty.call(configs, key) && Boolean(configs[key]);
  if (isConfigured(name)) return name;
  const requested = name.toLowerCase();
  const matches = Object.keys(configs).filter((key) => key.toLowerCase() === requested && isConfigured(key));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw connectorsError(
      `Connector "${name}" is ambiguous: it matches ${matches.map((key) => `"${key}"`).join(', ')}, which differ only by case. ` +
        'Connector names are case-insensitive; access it by its exact configured name, or give each connector a name that differs by more than case.',
      'AMBIGUOUS_CONNECTOR',
    );
  }
  throw connectorsError(
    `Connector "${name}" was accessed but has no configuration. Add it to \`connectorsService({ configs: { ${name}: { connector: '<type>' } } })\`.`,
    'UNKNOWN_CONNECTOR',
  );
}

/**
 * `client.connectors`: `make(name, config, runtime)` builds one connector's client, given its configured
 * key, its config and `runtime[key]` (undefined when there is none under that exact key).
 */
export function createConnectorsApi(configs = {}, runtime, make) {
  const cache = new Map();
  const getEntry = (requested) => {
    const name = cache.has(requested) ? requested : resolveName(configs, requested);
    if (!cache.has(name)) cache.set(name, make(name, configs[name], runtime?.[name]));
    return cache.get(name);
  };
  return new Proxy(Object.create(null), {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return getEntry(prop);
    },
    has(_target, prop) {
      return typeof prop === 'string';
    },
    ownKeys() {
      return [...cache.keys()];
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return { enumerable: true, configurable: true, value: getEntry(prop) };
    },
  });
}

/**
 * What `executeQuery` hands the page when a semantic model connector has no runtime: the transport's raw
 * payload. Rayfin 2.0 asks for Apache Arrow and returns an ArrayBuffer for an Arrow reply, with no `status`.
 * Playground: these bytes are a placeholder, not a real Arrow stream. Rayfin's docs disagree on the deployed reply
 * (Arrow in the guide, JSON in the semantic model package docs).
 */
export function rawPayload(connector) {
  return new TextEncoder().encode(
    `Playground: the raw payload for "${connector}", undecoded, because no runtime is registered under that name. ` +
      'A placeholder, not a real Arrow stream.',
  ).buffer;
}
