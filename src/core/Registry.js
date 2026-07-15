/**
 * Aether-0X Dynamic Module and System Registry
 * Allows independent sandboxed modular experiences to cleanly load and mount at boot.
 */
export class Registry {
    #modules = new Map();
    #systems = new Map();

    /**
     * Registers a complete sidebar module context.
     * @param {string} id - Unique module identification key.
     * @param {Object} moduleDefinition - Configuration definition containing metadata and lifecycle handlers.
     */
    registerModule(id, moduleDefinition) {
        if (!id || typeof id !== 'string') {
            throw new Error('[Registry] Invalid module registration ID.');
        }
        if (!moduleDefinition.name || !moduleDefinition.icon) {
            throw new Error(`[Registry] Module "${id}" must declare a descriptive display name and icon visual.`);
        }
        if (typeof moduleDefinition.mount !== 'function' || typeof moduleDefinition.unmount !== 'function') {
            throw new Error(`[Registry] Module "${id}" must contain mount() and unmount() lifecycle handlers.`);
        }

        this.#modules.set(id, {
            id,
            ...moduleDefinition,
            status: 'registered'
        });
    }

    /**
     * Retrieve a specific registered module.
     * @param {string} id 
     * @returns {Object|null}
     */
    getModule(id) {
        return this.#modules.get(id) || null;
    }

    /**
     * Fetches all registered interactive experiences.
     * @returns {Array<Object>}
     */
    getAllModules() {
        return Array.from(this.#modules.values());
    }

    /**
     * Registers active background systems (such as AudioEngine, GestureEngine).
     * @param {string} id 
     * @param {Object} systemInstance 
     */
    registerSystem(id, systemInstance) {
        if (!id || typeof id !== 'string') {
            throw new Error('[Registry] Invalid system ID registration requested.');
        }
        if (this.#systems.has(id)) {
            console.warn(`[Registry] Background system "${id}" is already registered. Overwriting dynamic instance.`);
        }
        this.#systems.set(id, systemInstance);
    }

    /**
     * Retrieves active system interfaces.
     * @param {string} id 
     * @returns {Object|null}
     */
    getSystem(id) {
        return this.#systems.get(id) || null;
    }
}

export const globalRegistry = new Registry();
