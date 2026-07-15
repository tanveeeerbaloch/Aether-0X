import { globalEventBus } from './EventBus.js';

/**
 * Aether-0X Telemetry Auditor
 * Proactively measures paint pipelines, frame rendering loops, and storage latencies.
 */
export const Telemetry = {
    #fpsCounter: 0,
    #lastFrameTime: performance.now(),
    #telemetryInterval: null,
    #metrics: {
        fps: 60,
        dbLatency: 0,
        activeNodes: 0,
        heapMemory: 0
    },

    start() {
        console.log("%c[AETHER TELEMETRY] Initializing diagnostic hooks...", "color: #00ffcc; font-weight: bold;");
        
        // 1. Run rendering loop performance metric
        this.#runFPSLoop();

        // 2. Measure database latency over the event bus
        globalEventBus.on('DB_TRANSACTION_COMPLETE', (durationMs) => {
            this.#metrics.dbLatency = durationMs;
            if (durationMs > 100) { // Database operation took longer than 100ms
                globalEventBus.emit('NOTIFICATION_TRIGGER', {
                    type: 'info',
                    message: `High DB latency detected: ${durationMs.toFixed(1)}ms`
                });
            }
        });

        // 3. System Diagnostic Pacer (Every 10 seconds)
        this.#telemetryInterval = setInterval(() => {
            this.#gatherSystemPerformanceMetrics();
            this.#logHolographicReport();
        }, 10000);
    },

    #runFPSLoop() {
        const renderLoop = () => {
            const now = performance.now();
            this.#fpsCounter++;

            if (now >= this.#lastFrameTime + 1000) {
                this.#metrics.fps = Math.min(60, Math.round((this.#fpsCounter * 1000) / (now - this.#lastFrameTime)));
                this.#fpsCounter = 0;
                this.#lastFrameTime = now;

                // Fire performance degradation warning if system frame rate tanks below 30
                if (this.#metrics.fps < 30) {
                    globalEventBus.emit('NOTIFICATION_TRIGGER', {
                        type: 'danger',
                        message: `Frame rate dropped: ${this.#metrics.fps} FPS`
                    });
                }
            }
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    },

    #gatherSystemPerformanceMetrics() {
        // Collect exact DOM tree complexity
        this.#metrics.activeNodes = document.getElementsByTagName('*').length;

        // Collect memory footprint details (Works on Chromium engines)
        if (performance.memory) {
            this.#metrics.heapMemory = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
        } else {
            this.#metrics.heapMemory = 0; // Fallback for Firefox/Safari
        }
    },

    #logHolographicReport() {
        const fpsStyle = this.#metrics.fps >= 50 ? 'color: #00ffcc' : 'color: #ff0055';
        const dbStyle = this.#metrics.dbLatency < 15 ? 'color: #00ffcc' : 'color: #ffbc00';

        console.log(
            `%c[SYSTEM TELEMETRY REPORT]\n` +
            `%c  » Rendering Efficiency : %c${this.#metrics.fps} FPS\n` +
            `%c  » DB Commits Latency   : %c${this.#metrics.dbLatency.toFixed(1)}ms\n` +
            `%c  » DOM Complexity       : %c${this.#metrics.activeNodes} nodes\n` +
            `%c  » Memory Footprint     : %c${this.#metrics.heapMemory || 'N/A'} MB`,
            'color: var(--accent-color); font-weight: bold;',
            'color: #8090a5;', fpsStyle,
            'color: #8090a5;', dbStyle,
            'color: #8090a5;', 'color: #00ffcc;',
            'color: #8090a5;', 'color: #00ffcc;'
        );
    },

    stop() {
        clearInterval(this.#telemetryInterval);
    }
};
                    
