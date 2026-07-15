/**
 * Aether-0X Global Event Bus
 * Facilitates strict decoupled communication across systems and sidebar modules.
 */
export class EventBus {
    #listeners = new Map();

    /**
     * Subscribe to an event.
     * @param {string} event - The event identifier.
     * @param {Function} callback - Execution handler.
     * @returns {Function} An unsubscribe clean-up function.
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('[EventBus] Subscriber callback must be a function.');
        }
        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, new Set());
        }
        this.#listeners.get(event).add(callback);
        
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe a specific callback from an event.
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        const eventListeners = this.#listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
            if (eventListeners.size === 0) {
                this.#listeners.delete(event);
            }
        }
    }

    /**
     * Listen to an event exactly once, automatically self-cleaning after trigger.
     * @param {string} event 
     * @param {Function} callback 
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            callback(payload);
        });
    }

    /**
     * Synchronously broadcast an event to all subscribers.
     * Supports wildcard '*' subscriptions for system-wide debugging or telemetry.
     * @param {string} event 
     * @param {any} [payload=null] 
     */
    emit(event, payload = null) {
        if (this.#listeners.has(event)) {
            for (const callback of this.#listeners.get(event)) {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`[EventBus] Error in callback for event "${event}":`, error);
                }
            }
        }

        if (this.#listeners.has('*')) {
            for (const callback of this.#listeners.get('*')) {
                try {
                    callback({ event, payload });
                } catch (error) {
                    console.error('[EventBus] Error in wildcard channel subscriber:', error);
                }
            }
        }
    }
}

export const globalEventBus = new EventBus();

