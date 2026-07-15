import { globalEventBus } from './EventBus.js';

/**
 * Aether-0X Reactive State Manager
 * Proxies deep object trees recursively. Emits targeted events when mutations occur.
 */
export class StateManager {
    #state;

    /**
     * @param {Object} initialState - Core application skeleton
     */
    constructor(initialState = {}) {
        this.#state = this.#createProxy(initialState, 'root');
    }

    /**
     * Deeply traps mutations. Traps both initial state structures and dynamically assigned nested values.
     */
    #createProxy(target, path) {
        // Enforce structural proxying on setup for inner objects
        for (const [key, value] of Object.entries(target)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                target[key] = this.#createProxy(value, `${path}.${key}`);
            }
        }

        return new Proxy(target, {
            set: (obj, prop, value) => {
                const previousValue = obj[prop];
                
                if (previousValue === value) return true;

                // Ensure newly dynamically added objects are reactive
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    obj[prop] = this.#createProxy(value, `${path}.${prop}`);
                } else {
                    obj[prop] = value;
                }

                // Notify specific granular target hooks (e.g., STATE_UPDATE:root.theme.currentTheme)
                globalEventBus.emit(`STATE_UPDATE:${path}.${prop}`, { 
                    property: prop, 
                    newValue: value, 
                    oldValue: previousValue 
                });
                
                // Broad update event
                globalEventBus.emit('STATE_CHANGED', { path, prop, value });
                
                return true;
            },
            get: (obj, prop) => {
                return obj[prop];
            }
        });
    }

    /**
     * Read-only direct access interface to the active proxy.
     */
    get state() {
        return this.#state;
    }

    /**
     * Safely populate global configurations.
     * @param {Object} persistedState - The hydration data payload retrieved from DB.
     */
    hydrate(persistedState) {
        if (!persistedState || typeof persistedState !== 'object') return;
        
        for (const [key, value] of Object.entries(persistedState)) {
            if (this.#state[key] !== undefined) {
                this.#state[key] = value;
            }
        }
    }
}

// Global state skeleton with all system and module namespaces cleanly separated
export const globalState = new StateManager({
    user: {
        id: null,
        username: 'Explorer',
        joinedAt: null,
        sessionCount: 0
    },
    settings: {
        vibration: true,
        highFps: true,
        reducedMotion: false,
        performanceMode: 'ultra'
    },
    achievements: {
        unlocked: [],
        progress: {},
        lastUnlocked: null
    },
    games: {
        activeSession: null,
        highScores: {},
        history: []
    },
    resume: {
        pendingSession: null,
        lastRoute: null,
        timestamp: null
    },
    familyChat: {
        activePersonaId: null,
        messageLogs: {},
        mutedIds: []
    },
    relicVault: {
        unlockedRelicIds: [],
        favorites: []
    },
    mysteryChamber: {
        activePuzzleId: null,
        solvedPuzzles: [],
        cluesUnlocked: []
    },
    challengeArena: {
        dailyStreak: 0,
        completedToday: false,
        rankPoints: 0
    },
    broadcastTower: {
        liveBroadcast: null,
        history: [],
        likes: []
    },
    hiddenRooms: {
        discoveredIds: [],
        currentActiveRoom: null
    },
    personaForge: {
        craftedConfigs: [],
        activeEquippedId: null
    },
    moodForge: {
        activeAtmosphere: 'chill',
        vibeIntensity: 0.8,
        visualOverrides: {}
    },
    analytics: {
        totalScreenTime: 0,
        clickCounter: {},
        interactions: []
    },
    audio: {
        masterVolume: 0.8,
        currentTrack: null,
        musicMuted: false,
        sfxMuted: false
    },
    theme: {
        activeThemeId: 'dark-neon',
        accentColor: '#00ffcc',
        contrastLevel: 1.0
    },
    gestures: {
        registeredPaths: [],
        sensitivity: 1.0,
        doubleTapAction: 'toggle-sidebar'
    },
    ui: {
        sidebarOpen: false,
        activeModuleId: 'dashboard',
        activeOverlay: null,
        notifications: []
    }
});
  
