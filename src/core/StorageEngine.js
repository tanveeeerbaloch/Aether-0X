/**
 * Aether-0X IndexedDB Storage Engine
 * High-performance, non-blocking asynchronous local storage for rich state persistence.
 */
export class StorageEngine {
    #dbName = 'Aether0X_DB';
    #dbVersion = 1;
    #db = null;
    
    // Core database object stores matching operational scopes
    #stores = ['systemState', 'gameState', 'chatHistory', 'analytics'];

    /**
     * Establish IndexedDB connection and provision schema targets.
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.#db) return this.#db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.#dbName, this.#dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.#stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.#db = event.target.result;
                resolve(this.#db);
            };

            request.onerror = (event) => {
                console.error('[StorageEngine] IndexedDB database failure:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Return transaction instance for a target object store.
     */
    async #getTransaction(storeName, mode = 'readonly') {
        if (!this.#db) {
            await this.init();
        }
        return this.#db.transaction(storeName, mode).objectStore(storeName);
    }

    /**
     * Safely fetch stored JSON data blocks.
     * @param {string} storeName 
     * @param {string} id 
     * @returns {Promise<any|null>}
     */
    async get(storeName, id) {
        try {
            const store = await this.#getTransaction(storeName);
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result?.data ?? null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[StorageEngine] Read error for store "${storeName}", ID "${id}":`, error);
            return null;
        }
    }

    /**
     * Store key-value pairs in background threads.
     * @param {string} storeName 
     * @param {string} id 
     * @param {any} data 
     * @returns {Promise<boolean>}
     */
    async set(storeName, id, data) {
        try {
            const store = await this.#getTransaction(storeName, 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.put({ id, data });
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[StorageEngine] Write error for store "${storeName}", ID "${id}":`, error);
            return false;
        }
    }

    /**
     * Purge specialized records.
     * @param {string} storeName 
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async remove(storeName, id) {
        try {
            const store = await this.#getTransaction(storeName, 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`[StorageEngine] Delete error for store "${storeName}", ID "${id}":`, error);
            return false;
        }
    }
}

export const globalStorage = new StorageEngine();
              
