import { globalEventBus } from '../core/EventBus.js';
import { globalState } from '../core/StateManager.js';

/**
 * Aether-0X Theme Engine
 * Manages premium high-end visual variables, dynamic neon styles, and transition states.
 */
export class ThemeEngine {
    #themes = {
        'dark-neon': {
            '--accent-color': '#00ffcc',
            '--accent-rgb': '0, 255, 204',
            '--bg-main': '#030307',
            '--glass-bg': 'rgba(10, 10, 20, 0.45)',
            '--glass-border': 'rgba(0, 255, 204, 0.12)',
            '--glass-border-hover': 'rgba(0, 255, 204, 0.3)',
            '--glass-blur': '20px',
            '--glass-shadow': 'rgba(0, 0, 0, 0.5)',
            '--glass-shadow-hover': 'rgba(0, 255, 204, 0.05)',
            '--glow-color-1': 'rgba(0, 255, 204, 0.15)',
            '--glow-color-2': 'rgba(11, 0, 26, 0.8)',
            '--text-primary': '#f8fafc',
            '--text-muted': '#64748b',
            '--scrollbar-thumb': 'rgba(0, 255, 204, 0.15)'
        },
        'luxury-gold': {
            '--accent-color': '#dfb241',
            '--accent-rgb': '223, 178, 65',
            '--bg-main': '#060503',
            '--glass-bg': 'rgba(15, 12, 8, 0.5)',
            '--glass-border': 'rgba(223, 178, 65, 0.15)',
            '--glass-border-hover': 'rgba(223, 178, 65, 0.35)',
            '--glass-blur': '24px',
            '--glass-shadow': 'rgba(0, 0, 0, 0.7)',
            '--glass-shadow-hover': 'rgba(223, 178, 65, 0.03)',
            '--glow-color-1': 'rgba(223, 178, 65, 0.1)',
            '--glow-color-2': 'rgba(15, 5, 0, 0.9)',
            '--text-primary': '#fdfaf2',
            '--text-muted': '#8a7d6e',
            '--scrollbar-thumb': 'rgba(223, 178, 65, 0.15)'
        },
        'cyber-glass': {
            '--accent-color': '#ff0055',
            '--accent-rgb': '255, 0, 85',
            '--bg-main': '#05010a',
            '--glass-bg': 'rgba(12, 1, 16, 0.55)',
            '--glass-border': 'rgba(255, 0, 85, 0.15)',
            '--glass-border-hover': 'rgba(255, 0, 85, 0.35)',
            '--glass-blur': '18px',
            '--glass-shadow': 'rgba(0, 0, 0, 0.6)',
            '--glass-shadow-hover': 'rgba(255, 0, 85, 0.05)',
            '--glow-color-1': 'rgba(255, 0, 85, 0.12)',
            '--glow-color-2': 'rgba(1, 4, 25, 0.85)',
            '--text-primary': '#fff2f6',
            '--text-muted': '#7c6575',
            '--scrollbar-thumb': 'rgba(255, 0, 85, 0.15)'
        }
    };

    constructor() {
        this.#initListeners();
    }

    #initListeners() {
        // Monitor global state mutations specifically targeting themes
        globalEventBus.on('STATE_UPDATE:root.theme.activeThemeId', ({ newValue }) => {
            this.applyTheme(newValue);
        });
    }

    /**
     * Map a designated configuration mapping over the document DOM nodes.
     * @param {string} themeId - Unique configuration id mapping
     */
    applyTheme(themeId) {
        const theme = this.#themes[themeId];
        if (!theme) {
            console.warn(`[ThemeEngine] Requested theme configuration "${themeId}" does not exist. Defaulting to dark-neon.`);
            return this.applyTheme('dark-neon');
        }

        const root = document.documentElement;
        
        // Dynamic variable assignments
        Object.entries(theme).forEach(([key, val]) => {
            root.style.setProperty(key, val);
        });

        // Track mutation via systemic state trees
        if (globalState.state.theme.activeThemeId !== themeId) {
            globalState.state.theme.activeThemeId = themeId;
        }

        // Notify downstream components that layout vectors have settled
        globalEventBus.emit('THEME_ENGINE_APPLIED', { themeId });
    }
}

export const globalThemeEngine = new ThemeEngine();
      
