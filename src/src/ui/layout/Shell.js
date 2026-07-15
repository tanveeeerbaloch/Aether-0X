import { globalEventBus } from '../../core/EventBus.js';
import { globalState } from '../../core/StateManager.js';
import { globalRegistry } from '../../core/Registry.js';

/**
 * Aether-0X Core UI Shell Component
 * Fully encapsulates structural shell rendering, state synchronization, and interface states.
 */
export class Shell {
    #container = null;
    #sidebar = null;
    #viewport = null;
    #ambientGlow = null;
    #unsubscribeHooks = [];

    /**
     * Instantiates the UI shell.
     * @param {HTMLElement} mountTarget - The root container (#aether-canvas).
     */
    constructor(mountTarget) {
        if (!(mountTarget instanceof HTMLElement)) {
            throw new TypeError('[Shell] Target container must be a valid DOM node.');
        }
        this.#container = mountTarget;
    }

    /**
     * Initialize template and lifecycle observers.
     */
    async mount() {
        this.#renderBaseShell();
        this.#bindCoreDOMRefs();
        this.#buildDynamicSidebar();
        this.#registerStateListeners();
        this.#registerDOMEvents();

        // Bootstrapping Initial Views
        this.#synchronizeLayout();
        
        globalEventBus.emit('UI_SHELL_MOUNTED');
    }

    /**
     * Inject baseline skeletal nodes directly into canvas frame.
     */
    #renderBaseShell() {
        this.#container.innerHTML = `
            <!-- Performance Optimized Ambient Projection Fields -->
            <div id="ambient-glow" class="ambient-glow-field ambient-glow-field-animated" aria-hidden="true"></div>

            <!-- Global Layout Structure -->
            <div class="aether-grid-wrapper">
                <!-- Sidebar Control Unit -->
                <nav id="aether-sidebar" class="glass-panel sidebar-collapsed" aria-label="Aether-0X Navigation">
                    <div class="sidebar-header">
                        <div class="logo-mark">Æ-0X</div>
                        <button id="sidebar-toggle-btn" class="toggle-control" aria-label="Toggle Sidebar Menu">
                            <span class="btn-line line-top"></span>
                            <span class="btn-line line-bottom"></span>
                        </button>
                    </div>
                    <ul class="sidebar-menu" id="sidebar-menu-list"></ul>
                </nav>

                <!-- Core Dynamic Viewport -->
                <main id="aether-viewport" class="glass-panel" role="region" aria-live="polite"></main>
            </div>
        `;
    }

    #bindCoreDOMRefs() {
        this.#sidebar = this.#container.querySelector('#aether-sidebar');
        this.#viewport = this.#container.querySelector('#aether-viewport');
        this.#ambientGlow = this.#container.querySelector('#ambient-glow');
    }

    /**
     * Map all verified registry items straight into interactive nav buttons.
     */
    #buildDynamicSidebar() {
        const menuContainer = this.#container.querySelector('#sidebar-menu-list');
        const modules = globalRegistry.getAllModules();

        menuContainer.innerHTML = '';

        modules.forEach(module => {
            const li = document.createElement('li');
            li.className = 'menu-item-container';
            li.innerHTML = `
                <button class="menu-item-btn" data-module-id="${module.id}">
                    <span class="menu-icon-slot" aria-hidden="true">${module.icon}</span>
                    <span class="menu-label-text">${module.name}</span>
                </button>
            `;
            menuContainer.appendChild(li);
        });
    }

    #registerStateListeners() {
        // Handle changes in sidebar open/close state
        const unSubSidebar = globalEventBus.on('STATE_UPDATE:root.ui.sidebarOpen', ({ newValue }) => {
            if (newValue) {
                this.#sidebar.classList.remove('sidebar-collapsed');
                this.#sidebar.classList.add('sidebar-expanded');
            } else {
                this.#sidebar.classList.remove('sidebar-expanded');
                this.#sidebar.classList.add('sidebar-collapsed');
            }
        });

        // Handle navigation changes
        const unSubActiveMod = globalEventBus.on('STATE_UPDATE:root.ui.activeModuleId', ({ newValue, oldValue }) => {
            this.#handleModuleNavigation(newValue, oldValue);
        });

        this.#unsubscribeHooks.push(unSubSidebar, unSubActiveMod);
    }

    #registerDOMEvents() {
        // Sidebar Toggle Handler
        const toggleBtn = this.#container.querySelector('#sidebar-toggle-btn');
        toggleBtn.addEventListener('click', () => {
            globalState.state.ui.sidebarOpen = !globalState.state.ui.sidebarOpen;
        });

        // Navigation Button Listeners
        const menuList = this.#container.querySelector('#sidebar-menu-list');
        menuList.addEventListener('click', (event) => {
            const btn = event.target.closest('.menu-item-btn');
            if (!btn) return;
            
            const targetModuleId = btn.getAttribute('data-module-id');
            if (targetModuleId) {
                globalState.state.ui.activeModuleId = targetModuleId;
                // Close sidebar automatically on mobile
                if (window.innerWidth <= 768) {
                    globalState.state.ui.sidebarOpen = false;
                }
            }
        });
    }

    /**
     * Synchronize local state trees and styling layout.
     */
    #synchronizeLayout() {
        const initialActiveMod = globalState.state.ui.activeModuleId;
        if (initialActiveMod) {
            this.#handleModuleNavigation(initialActiveMod, null);
        }
    }

    /**
     * Orchestrate unmounting the old view and dynamic rendering of the new module.
     */
    async #handleModuleNavigation(nextId, previousId) {
        // Unmount previous active module if available
        if (previousId) {
            const oldModule = globalRegistry.getModule(previousId);
            if (oldModule && oldModule.status === 'mounted') {
                try {
                    await oldModule.unmount();
                    oldModule.status = 'registered';
                } catch (err) {
                    console.error(`[Shell] Failed to properly unmount module: ${previousId}`, err);
                }
            }
        }

        // Fetch new module target
        const nextModule = globalRegistry.getModule(nextId);
        if (!nextModule) {
            console.error(`[Shell] Failed to resolve route module ID: "${nextId}"`);
            this.#viewport.innerHTML = `<div class="viewport-error-state">Route Unresolved: ${nextId}</div>`;
            return;
        }

        // Highlight Active Button visually
        this.#container.querySelectorAll('.menu-item-btn').forEach(btn => {
            if (btn.getAttribute('data-module-id') === nextId) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });

        // Mount new module target
        try {
            this.#viewport.innerHTML = ''; // Wipe panel container bounds
            nextModule.status = 'mounting';
            await nextModule.mount(this.#viewport);
            nextModule.status = 'mounted';
            
            globalEventBus.emit('ROUTE_NAVIGATION_COMPLETE', { moduleId: nextId });
        } catch (err) {
            console.error(`[Shell] Mount crash within module "${nextId}":`, err);
            nextModule.status = 'failed';
            this.#viewport.innerHTML = `<div class="viewport-error-state">Fatal Error in Application Module: ${nextId}</div>`;
        }
    }

    /**
     * Clean down references and active event listener threads.
     */
    destroy() {
        this.#unsubscribeHooks.forEach(unSub => unSub());
        this.#unsubscribeHooks = [];
        this.#container.innerHTML = '';
    }
            }
                      
