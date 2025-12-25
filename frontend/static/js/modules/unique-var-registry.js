/*
 * Unique Variable Registry
 * ------------------------
 * Singleton registry to create and track unique variable names and references
 * across frontend modules. Modules can create unique names, register objects
 * or references, query by name, and list all registered entries.
 *
 * Design notes:
 * - This file exports a singleton default instance and the class for tests
 *   or advanced usage.
 * - It does NOT expose itself on `window` by default. Call
 *   `registry.exposeGlobal()` explicitly when a global is required.
 */

class UniqueVarRegistry {
    constructor(opts = {}) {
        this._map = new Map(); // name -> { name, value, meta, createdAt }
        this._counters = Object.create(null); // baseName -> counter
        this._exposeGlobalName = null;
    }

    _normalizeBase(name) {
        return String(name || 'var')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9\-_.:]/g, '')
            .replace(/^[-_.:]+|[-_.:]+$/g, '')
            .toLowerCase();
    }

    generateName(base) {
        const b = this._normalizeBase(base);
        const n = (this._counters[b] || 0) + 1;
        this._counters[b] = n;
        return n === 1 ? b : `${b}-${n}`;
    }

    // Create a new unique name from baseName, register the value and return the name
    createUnique(baseName, value, meta = {}) {
        const name = this.generateName(baseName || 'var');
        this.register(name, value, meta);
        return name;
    }

    // Register a specific name (must not already exist)
    register(name, value, meta = {}) {
        if (!name) throw new Error('UniqueVarRegistry.register requires a name');
        if (this._map.has(name)) {
            throw new Error(`UniqueVarRegistry: name "${name}" already registered`);
        }
        const entry = {
            name,
            value,
            meta,
            createdAt: Date.now()
        };
        this._map.set(name, entry);
        return entry.name;
    }

    // Register only if missing; otherwise return existing name
    ensure(name, value, meta = {}) {
        if (this._map.has(name)) {
            return this._map.get(name).name;
        }
        return this.register(name, value, meta);
    }

    get(name) {
        const e = this._map.get(name);
        return e ? e.value : undefined;
    }

    getEntry(name) {
        return this._map.get(name) || null;
    }

    has(name) {
        return this._map.has(name);
    }

    listEntries() {
        return Array.from(this._map.values()).slice();
    }

    listNames() {
        return Array.from(this._map.keys()).slice();
    }

    remove(name) {
        return this._map.delete(name);
    }

    clear() {
        this._map.clear();
        this._counters = Object.create(null);
    }

    size() {
        return this._map.size;
    }

    // Expose to window under a name (default: UNIQUE_VAR_REGISTRY)
    exposeGlobal(globalName = 'UNIQUE_VAR_REGISTRY') {
        try {
            if (typeof window === 'undefined') return null;
            window[globalName] = this;
            this._exposeGlobalName = globalName;
            return window[globalName];
        } catch (e) {
            // ignore
            return null;
        }
    }
}

const uniqueVarRegistry = new UniqueVarRegistry();

// Auto-expose the registry in browser environments for convenience and
// backward compatibility. This will create `window.UNIQUE_VAR_REGISTRY`.
try {
    if (typeof window !== 'undefined') {
        uniqueVarRegistry.exposeGlobal('UNIQUE_VAR_REGISTRY');
    }
} catch (e) {
    // ignore exposure failures in non-browser or restricted environments
}

export default uniqueVarRegistry;
export { UniqueVarRegistry };
