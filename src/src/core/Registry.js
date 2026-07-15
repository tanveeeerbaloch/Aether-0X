/**
 * Aether-0X Module Registry
 * Handles registering, caching, and clean transition of functional views.
 */
export const ModuleRegistry = {
    #modules: new Map(),
    #activeModuleId: null,
    #mountPoint: null,

    /**
     * Set the DOM entry point where modules will be rendered.
     */
    init(mountPoint) {
        if (!(mountPoint instanceof HTMLElement)) {
            throw new Error("Registry initialization failed: Mount point must be a valid DOM Element.");
        }
        this.#mountPoint = mountPoint;
    },

    /**
     * Register a functional module payload.
     */
    register(modulePayload) {
        const { id, name, icon, mount, unmount } = modulePayload;
        
        if (!id || !name || !icon || typeof mount !== 'function' || typeof unmount !== 'function') {
            throw new Error(`Module registration rejected: Invalid structure for module ID: ${id}`);
        }

        this.#modules.set(id, modulePayload);
    },

    /**
     * Transition active viewports cleanly.
     */
    async loadModule(moduleId) {
        if (!this.#modules.has(moduleId)) {
            console.error(`Module ${moduleId} not found in active subnets.`);
            return false;
        }

        const targetModule = this.#modules.get(moduleId);

        // Terminate existing active execution thread
        if (this.#activeModuleId) {
            const activeModule = this.#modules.get(this.#activeModuleId);
            try {
                await activeModule.unmount();
            } catch (err) {
                console.error(`Error during unmount of module [${this.#activeModuleId}]:`, err);
            }
            this.#mountPoint.innerHTML = '';
        }

        // Initialize and render new module onto the clean mount target
        try {
            this.#activeModuleId = moduleId;
            await targetModule.mount(this.#mountPoint);
            return true;
        } catch (err) {
            this.#mountPoint.innerHTML = `
                <div class="error-fallback-panel" style="padding: 30px; text-align: center; font-family: var(--font-mono);">
                    <span style="color: #ff0055; font-size: 1.5rem; font-weight: 700;">BOOT_FAILURE</span>
                    <p style="color: var(--text-primary); margin-top: 10px;">Failed to initialize the selected system module.</p>
                </div>
            `;
            console.error(`Failed to mount module [${moduleId}]:`, err);
            return false;
        }
    },

    /**
     * Get list of all registered modules for dynamic navigation menu building.
     */
    getRegisteredModules() {
        return Array.from(this.#modules.values()).map(({ id, name, icon }) => ({ id, name, icon }));
    },

    /**
     * Query currently executing module ID.
     */
    getActiveModuleId() {
        return this.#activeModuleId;
    }
};

