import { globalEventBus } from '../../core/EventBus.js';
import { globalState } from '../../core/StateManager.js';
import { globalStorage } from '../../core/StorageEngine.js';

/**
 * Aether-0X Nexus Shift Matrix Game Module
 * High-performance, reactive puzzle game equipped with a non-blocking session-resume engine.
 */
export const GamesModule = {
    id: 'games',
    name: 'Games',
    icon: '🎮',

    #container: null,
    #dbStore: 'gameState',
    #dbSaveKey: 'nexus_shift_active_session',
    
    // Active gameplay variables
    #gameState: {
        grid: Array(16).fill(0), // 4x4 coordinate index array
        movesRemaining: 15,
        score: 0,
        level: 1,
        active: false
    },

    async mount(container) {
        this.#container = container;
        this.#renderBaseShell();
        
        await this.#auditActiveSavedSessions();
    },

    #renderBaseShell() {
        this.#container.innerHTML = `
            <style>
                .games-outer-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    position: relative;
                    width: 100%;
                }
                .game-hud-panel {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    max-width: 420px;
                    padding: 16px;
                    border-radius: 12px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid var(--glass-border);
                    margin-bottom: 20px;
                    font-family: var(--font-mono);
                }
                .hud-metric {
                    display: flex;
                    flex-direction: column;
                }
                .hud-label {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }
                .hud-val {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: var(--accent-color);
                }
                .nexus-matrix-container {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    width: 100%;
                    max-width: 420px;
                    aspect-ratio: 1;
                    padding: 16px;
                    border-radius: 16px;
                    background: rgba(10, 10, 20, 0.4);
                    border: 1px solid var(--glass-border);
                }
                .matrix-cell {
                    border-radius: 8px;
                    background: rgba(255, 0, 85, 0.08);
                    border: 2px solid rgba(255, 0, 85, 0.25);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                    position: relative;
                    overflow: hidden;
                }
                .matrix-cell.node-active {
                    background: rgba(0, 255, 204, 0.12);
                    border-color: var(--accent-color);
                    box-shadow: 0 0 20px rgba(0, 255, 204, 0.25);
                }
                .matrix-cell::after {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.2) 0%, transparent 70%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .matrix-cell:hover::after {
                    opacity: 1;
                }
                /* Resume Dialog Design overlay */
                .resume-overlay-hud {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(3, 3, 7, 0.85);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 50;
                    border-radius: 16px;
                }
                .resume-card {
                    max-width: 380px;
                    padding: 30px;
                    border-radius: 16px;
                    background: rgba(10, 10, 20, 0.6);
                    border: 1px solid var(--glass-border);
                    text-align: center;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
                    animation: cardEntry 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
                .resume-card-title {
                    font-family: var(--font-mono);
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: var(--accent-color);
                    margin-bottom: 12px;
                }
                .resume-card-description {
                    font-size: 0.9rem;
                    color: var(--text-primary);
                    margin-bottom: 24px;
                    line-height: 1.5;
                }
                .resume-btn-stack {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                }
                .resume-btn {
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 700;
                    font-family: var(--font-mono);
                    font-size: 0.85rem;
                    transition: all 0.3s ease;
                }
                .resume-btn-primary {
                    background: rgba(0, 255, 204, 0.1);
                    border: 1px solid var(--accent-color);
                    color: var(--accent-color);
                }
                .resume-btn-primary:hover {
                    background: rgba(0, 255, 204, 0.2);
                    box-shadow: 0 0 15px rgba(0, 255, 204, 0.3);
                }
                .resume-btn-secondary {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--glass-border);
                    color: var(--text-muted);
                }
                .resume-btn-secondary:hover {
                    background: rgba(255, 0, 85, 0.1);
                    border-color: rgba(255, 0, 85, 0.3);
                    color: #ff0055;
                }
                @keyframes cardEntry {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            </style>

            <div class="games-outer-wrapper" id="game-canvas">
                <div class="game-hud-panel">
                    <div class="hud-metric">
                        <span class="hud-label">NEXUS LVL</span>
                        <span class="hud-val" id="hud-level">01</span>
                    </div>
                    <div class="hud-metric" style="align-items:center;">
                        <span class="hud-label">SHIFTS REMAINING</span>
                        <span class="hud-val" id="hud-moves">15</span>
                    </div>
                    <div class="hud-metric" style="align-items:flex-end;">
                        <span class="hud-label">ALIGNMENTS</span>
                        <span class="hud-val" id="hud-score">0000</span>
                    </div>
                </div>

                <div class="nexus-matrix-container" id="matrix-grid-element"></div>
            </div>
        `;
    }

    /**
     * Audit existing local configurations and present the session selection menu.
     */
    async #auditActiveSavedSessions() {
        const savedSession = await globalStorage.get(this.#dbStore, this.#dbSaveKey);
        
        if (savedSession && savedSession.active) {
            this.#renderResumeHUD(savedSession);
        } else {
            this.#startFreshSession();
        }
    }

    /**
     * Render the premium Glassmorphic Session Restoration card.
     */
    #renderResumeHUD(savedSession) {
        const canvas = this.#container.querySelector('#game-canvas');
        const overlay = document.createElement('div');
        overlay.className = 'resume-overlay-hud';
        overlay.id = 'resume-overlay';

        overlay.innerHTML = `
            <div class="resume-card">
                <div class="resume-card-title">TIMELINE INTERCEPTED</div>
                <div class="resume-card-description">
                    An incomplete Nexus pattern matching Level ${savedSession.level} was isolated inside the local cache.<br>
                    <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">Alignments: ${savedSession.score} | Shifts Left: ${savedSession.movesRemaining}</span>
                </div>
                <div class="resume-btn-stack">
                    <button class="resume-btn resume-btn-primary" id="btn-resume-session">RESTORE STATE</button>
                    <button class="resume-btn resume-btn-secondary" id="btn-discard-session">PURGE SAVES</button>
                </div>
            </div>
        `;

        canvas.appendChild(overlay);

        overlay.querySelector('#btn-resume-session').addEventListener('click', () => {
            this.#gameState = { ...savedSession };
            overlay.remove();
            this.#initializeGameEngine();
        });

        overlay.querySelector('#btn-discard-session').addEventListener('click', async () => {
            await globalStorage.remove(this.#dbStore, this.#dbSaveKey);
            overlay.remove();
            this.#startFreshSession();
        });
    }

    #startFreshSession() {
        this.#gameState = {
            grid: Array(16).fill(0).map(() => (Math.random() > 0.55 ? 1 : 0)), // Random solvable baseline state
            movesRemaining: 15,
            score: 0,
            level: 1,
            active: true
        };
        this.#initializeGameEngine();
    }

    #initializeGameEngine() {
        this.#updateHUD();
        this.#renderMatrixGrid();
    }

    #renderMatrixGrid() {
        const gridElement = this.#container.querySelector('#matrix-grid-element');
        gridElement.innerHTML = '';

        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('button');
            cell.className = `matrix-cell ${this.#gameState.grid[i] === 1 ? 'node-active' : ''}`;
            cell.setAttribute('data-index', i);
            cell.setAttribute('aria-label', `Matrix Cell Node index ${i}`);
            
            cell.addEventListener('click', (e) => this.#processShiftNode(parseInt(e.currentTarget.getAttribute('data-index'))));
            gridElement.appendChild(cell);
        }
    }

    /**
     * Matrix Toggling logic (Lights Out Style alignment mechanics).
     * Modifies selected cell and adjacent cells (Up, Down, Left, Right).
     */
    async #processShiftNode(index) {
        if (!this.#gameState.active || this.#gameState.movesRemaining <= 0) return;

        const adjacentOffsets = [
            0,             // Self
            -4,            // Up
            4,             // Down
            index % 4 !== 0 ? -1 : null, // Left
            index % 4 !== 3 ?  1 : null  // Right
        ];

        adjacentOffsets.forEach(offset => {
            if (offset === null) return;
            const targetIndex = index + offset;
            if (targetIndex >= 0 && targetIndex < 16) {
                this.#gameState.grid[targetIndex] = this.#gameState.grid[targetIndex] === 1 ? 0 : 1;
            }
        });

        this.#gameState.movesRemaining--;
        
        // Dynamic game audio tracking click state
        globalEventBus.emit('SFX_TRIGGER', { sfxId: 'grid_toggle' });

        this.#renderMatrixGrid();
        this.#updateHUD();

        await this.#evaluateProgressState();
    }

    async #evaluateProgressState() {
        const hasWon = this.#gameState.grid.every(val => val === 1);

        if (hasWon) {
            this.#gameState.active = false;
            this.#gameState.score += 1000 * this.#gameState.level;
            
            // Dispatch achievements system indicators
            globalEventBus.emit('ACHIEVEMENT_UNLOCKED', {
                id: 'nexus_sync_complete',
                name: `NEXUS ALIGNMENT PHASE ${this.#gameState.level}`
            });

            this.#gameState.level++;
            this.#gameState.movesRemaining = Math.max(8, 15 - this.#gameState.level); // Increase difficulty limit
            this.#gameState.grid = Array(16).fill(0).map(() => (Math.random() > 0.45 ? 1 : 0));
            this.#gameState.active = true;

            setTimeout(() => {
                this.#initializeGameEngine();
            }, 800);
            
            await this.#saveSessionToDatabase();
            return;
        }

        // Handle failure state
        if (this.#gameState.movesRemaining <= 0) {
            this.#gameState.active = false;
            globalEventBus.emit('NOTIFICATION_TRIGGER', {
                type: 'danger',
                message: 'Grid collapsed: Shifts depleted.'
            });
            await globalStorage.remove(this.#dbStore, this.#dbSaveKey);
            
            setTimeout(() => {
                this.#startFreshSession();
            }, 1200);
            return;
        }

        // Auto-save every move securely in local background threads
        await this.#saveSessionToDatabase();
    }

    async #saveSessionToDatabase() {
        await globalStorage.set(this.#dbStore, this.#dbSaveKey, this.#gameState);
    }

    #updateHUD() {
        this.#container.querySelector('#hud-level').textContent = String(this.#gameState.level).padStart(2, '0');
        this.#container.querySelector('#hud-moves').textContent = String(this.#gameState.movesRemaining).padStart(2, '0');
        this.#container.querySelector('#hud-score').textContent = String(this.#gameState.score).padStart(4, '0');
    }

    async unmount() {
        this.#gameState.active = false;
        this.#container = null;
    }
};
      
