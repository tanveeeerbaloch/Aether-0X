import { globalEventBus } from './core/EventBus.js';
import { globalState } from './core/StateManager.js';
import { globalStorage } from './core/StorageEngine.js';
import { ModuleRegistry } from './core/Registry.js';

// Import our custom modules
import { FamilyChatModule } from './modules/FamilyChat/index.js';
import { GamesModule } from './modules/Games/index.js';

/**
 * Main Application Orchestration Shell
 */
const CoreApp = {
    async bootstrap() {
        try {
            // 1. Initialize DB connections and state engines
            await globalStorage.init();
            
            // 2. Load prior user preferences (Defaulting to Night/Dark mode)
            const savedTheme = (await globalStorage.get('preferences', 'active_theme')) || 'theme-night';
            document.body.className = savedTheme;
            globalState.set('currentTheme', savedTheme);

            // 3. Render HTML Structural Shell direct into Document body
            this.#renderApplicationSkeleton();

            // 4. Initialize Module Registry inside the workspace container
            const workspace = document.getElementById('main-workspace-mount');
            ModuleRegistry.init(workspace);

            // 5. Register core functional modules
            ModuleRegistry.register(FamilyChatModule);
            ModuleRegistry.register(GamesModule);

            // 6. Hook up interactions, navigations, and global event listeners
            this.#setupGlobalUIListeners();
            this.#buildDynamicSidebarNavigation();
            this.#startSystemClock();

            // 7. Render initial module view
            const fallbackModuleId = FamilyChatModule.id;
            await ModuleRegistry.loadModule(fallbackModuleId);
            this.#highlightActiveNavigationItem(fallbackModuleId);

            // Success trigger
            this.dispatchSystemNotification('success', 'Aether-0X System Subnets Fully Online.');

        } catch (error) {
            console.error("Critical System Crash during Bootstrap Sequence:", error);
            document.body.innerHTML = `
                <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #05050a; color: #ff0055; font-family: monospace; text-align: center; padding: 20px;">
                    <h1 style="font-size: 2rem; margin-bottom: 10px;">CORE_INIT_HALTED</h1>
                    <p style="color: #ffffff; opacity: 0.7;">A critical error prevented the interface framework from booting up.</p>
                    <pre style="background: rgba(255,0,85,0.1); border: 1px dashed #ff0055; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 0.85rem; max-width: 600px; text-align: left; overflow-x: auto;">${error.stack || error}</pre>
                </div>
            `;
        }
    },

    #renderApplicationSkeleton() {
        document.body.innerHTML = `
            <!-- Global Interactive Notification HUD -->
            <div id="global-notification-hub" style="position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;"></div>

            <div class="syndicate-layout-wrapper">
                <!-- Left Sidebar Navigation Panel -->
                <aside class="sidebar-aside-panel">
                    <div class="sidebar-brand">
                        <span class="brand-logo">A0X</span>
                        <span class="brand-title">Aether Frame</span>
                    </div>
                    
                    <nav class="sidebar-nav">
                        <ul id="sidebar-nav-list" class="nav-list"></ul>
                    </nav>

                    <div class="sidebar-footer">
                        <!-- Dual-Theme Mode Trigger -->
                        <button id="theme-matrix-toggle" class="system-footer-action-btn" aria-label="Toggle visual theme state">
                            <span class="theme-sun-icon">☀️</span>
                            <span class="theme-moon-icon">🌙</span>
                        </button>
                    </div>
                </aside>

                <!-- Main Content Panel Area -->
                <main class="main-content-viewport">
                    <header class="app-header-node">
                        <div class="header-breadcrumb">
                            <span class="root-node">Console</span>
                            <span class="breadcrumb-divider">/</span>
                            <span id="header-active-module" class="active-node">Loading...</span>
                        </div>
                        <div class="header-status-suite">
                            <div class="status-clock" id="system-time-display">00:00:00</div>
                            <div class="status-badge">
                                <span class="pulse-indicator"></span>
                                <span class="badge-label">SECURE_SYNC</span>
                            </div>
                        </div>
                    </header>

                    <!-- Primary Mounting Target for Dynamic Modules -->
                    <div id="main-workspace-mount" class="workspace-viewport"></div>
                </main>
            </div>
        `;
    },

    #buildDynamicSidebarNavigation() {
        const listContainer = document.getElementById('sidebar-nav-list');
        listContainer.innerHTML = '';

        const modules = ModuleRegistry.getRegisteredModules();

        modules.forEach(m => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            const btn = document.createElement('button');
            btn.className = 'nav-action-link';
            btn.setAttribute('data-target-id', m.id);
            btn.innerHTML = `
                <span class="nav-icon">${m.icon}</span>
                <span class="nav-label">${m.name}</span>
            `;

            btn.addEventListener('click', async () => {
                const loaded = await ModuleRegistry.loadModule(m.id);
                if (loaded) {
                    this.#highlightActiveNavigationItem(m.id);
                    document.getElementById('header-active-module').textContent = m.name;
                }
            });

            li.appendChild(btn);
            listContainer.appendChild(li);
        });
    },

    #highlightActiveNavigationItem(activeId) {
        const buttons = document.querySelectorAll('.nav-action-link');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-target-id') === activeId) {
                btn.classList.add('nav-item-active');
            } else {
                btn.classList.remove('nav-item-active');
            }
        });
    },

    #setupGlobalUIListeners() {
        // Toggle Theme logic (Syndicate Hub Dual Visual Theme Matrix)
        const themeBtn = document.getElementById('theme-matrix-toggle');
        themeBtn.addEventListener('click', async () => {
            const currentTheme = globalState.get('currentTheme') || 'theme-night';
            const nextTheme = currentTheme === 'theme-night' ? 'theme-day' : 'theme-night';

            document.body.className = nextTheme;
            globalState.set('currentTheme', nextTheme);
            
            // Persist setting in local Database
            await globalStorage.set('preferences', 'active_theme', nextTheme);

            this.dispatchSystemNotification('info', `Display configuration: ${nextTheme === 'theme-day' ? 'Solar Light' : 'Deep Space Dark'}`);
            globalEventBus.emit('THEME_CHANGED', nextTheme);
        });

        // Register Global Notification Bus Listener
        globalEventBus.on('NOTIFICATION_TRIGGER', ({ type, message }) => {
            this.dispatchSystemNotification(type, message);
        });
    },

    /**
     * Dispatch lightweight glassmorphic notifications.
     */
    dispatchSystemNotification(type, message) {
        const hub = document.getElementById('global-notification-hub');
        if (!hub) return;

        const notif = document.createElement('div');
        notif.className = `system-notification-alert alert-${type}`;
        notif.style.cssText = `
            padding: 12px 20px;
            background: rgba(10, 10, 20, 0.85);
            border: 1px solid var(--glass-border);
            border-left: 4px solid ${type === 'success' ? '#00ffcc' : type === 'danger' ? '#ff0055' : '#00bcff'};
            border-radius: 6px;
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 0.8rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            animation: slideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            pointer-events: auto;
        `;

        notif.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="font-weight:700;">[${type.toUpperCase()}]</span>
                <span>${message}</span>
            </div>
        `;

        hub.appendChild(notif);

        // Auto destroy after 4 seconds
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards';
            notif.addEventListener('animationend', () => notif.remove());
        }, 4000);
    },

    #startSystemClock() {
        const clockEl = document.getElementById('system-time-display');
        const update = () => {
            const now = new Date();
            clockEl.textContent = now.toTimeString().split(' ')[0];
        };
        setInterval(update, 1000);
        update();
    }
};

// Fire boot loader sequence when target DOM completes basic layout loading
document.addEventListener('DOMContentLoaded', () => {
    CoreApp.bootstrap();
});
  
