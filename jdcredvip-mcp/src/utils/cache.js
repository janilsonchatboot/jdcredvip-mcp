// Simple in-memory TTL cache helpers used by dashboard endpoints
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (isPlainObject(value)) {
    const sortedKeys = Object.keys(value).sort();
    const output = {};
    for (const key of sortedKeys) {
      output[key] = canonicalize(value[key]);
    }
    return output;
  }
  return value;
};

export const stableHash = (value) => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(canonicalize(value));
  } catch (_error) {
    return String(value);
  }
};

export function createTtlCache({ ttlMs = 10 * 60 * 1000 } = {}) {
  const store = new Map();

  const now = () => Date.now();

  const purgeIfExpired = (key, entry) => {
    if (entry.expiresAt <= now()) {
      store.delete(key);
      return true;
    }
    return false;
  };

  return {
    get(rawKey) {
      const key = stableHash(rawKey);
      const entry = store.get(key);
      if (!entry) return null;
      if (purgeIfExpired(key, entry)) return null;
      return entry.value;
    },
    set(rawKey, value, customTtlMs) {
      const key = stableHash(rawKey);
      const ttl = Number.isFinite(customTtlMs) ? customTtlMs : ttlMs;
      store.set(key, {
        value,
        expiresAt: now() + ttl
      });
      return value;
    },
    delete(rawKey) {
      const key = stableHash(rawKey);
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}
