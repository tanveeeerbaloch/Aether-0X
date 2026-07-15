// --- Add imports to the top of src/main.js ---
import { Telemetry } from './core/Telemetry.js';

// --- Insert this execution sequence inside the CoreApp.bootstrap() method ---
// (Ideally right after "this.dispatchSystemNotification('success', 'Aether-0X System Subnets Fully Online.')")

// Initialize Telemetry Audits
Telemetry.start();

// Register production Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('%c[PWA] ServiceWorker network sync active.', 'color: #00ffcc;'))
            .catch(err => console.error('[PWA] ServiceWorker installation aborted:', err));
    });
}
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
  
