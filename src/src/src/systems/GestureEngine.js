import { globalEventBus } from '../core/EventBus.js';
import { globalState } from '../core/StateManager.js';

/**
 * Aether-0X Vector Gesture Engine
 * High-performance pointer tracking system that decodes multi-touch vectors and complex geometric gestures.
 */
export class GestureEngine {
    #targetElement = null;
    #trackingState = {
        isTracking: false,
        startTime: 0,
        startX: 0,
        startY: 0,
        points: [],
        lastTapTime: 0
    };

    // Configuration thresholds
    #swipeMinDistance = 60; // in pixels
    #swipeMaxTime = 300;     // in milliseconds
    #doubleTapDelay = 280;   // in milliseconds
    
    // Geometric shape templates mapped to execution signals
    #patternTemplates = {
        // Swipe Right then Down (L-Shape)
        'unlock-relics': [0, 1], 
        // Swipe Down then Right then Up (U-Shape)
        'chamber-ritual': [1, 0, 3],
        // Swipe Right, Down, Left, Up (Square boundary)
        'override-terminal': [0, 1, 2, 3]
    };

    /**
     * Initializes tracking on the active container shell.
     * @param {HTMLElement} [target=document] - Boundary focus area for coordinate tracking
     */
    init(target = document) {
        this.#targetElement = target;
        this.#bindPointerEvents();
    }

    #bindPointerEvents() {
        const el = this.#targetElement;

        // PointerEvents normalize Mouse, Touch, and Stylus inputs under a unified pipeline
        el.addEventListener('pointerdown', (e) => this.#handlePointerDown(e), { passive: true });
        el.addEventListener('pointermove', (e) => this.#handlePointerMove(e), { passive: true });
        el.addEventListener('pointerup', (e) => this.#handlePointerUp(e), { passive: true });
        el.addEventListener('pointercancel', () => this.#resetTracking(), { passive: true });
    }

    #handlePointerDown(event) {
        const t = performance.now();
        this.#trackingState = {
            isTracking: true,
            startTime: t,
            startX: event.clientX,
            startY: event.clientY,
            points: [{ x: event.clientX, y: event.clientY }],
            lastTapTime: this.#trackingState.lastTapTime
        };

        this.#detectDoubleTap(event.clientX, event.clientY, t);
    }

    #handlePointerMove(event) {
        if (!this.#trackingState.isTracking) return;

        const currentPoints = this.#trackingState.points;
        const lastPoint = currentPoints[currentPoints.length - 1];
        const dist = Math.hypot(event.clientX - lastPoint.x, event.clientY - lastPoint.y);

        // Store points with a high-fidelity low-pass filter to strip out pointer jitter noise
        if (dist > 8) {
            currentPoints.push({ x: event.clientX, y: event.clientY });
        }
    }

    #handlePointerUp(event) {
        if (!this.#trackingState.isTracking) return;
        this.#trackingState.isTracking = false;

        const duration = performance.now() - this.#trackingState.startTime;
        const deltaX = event.clientX - this.#trackingState.startX;
        const deltaY = event.clientY - this.#trackingState.startY;
        const totalDistance = Math.hypot(deltaX, deltaY);

        let gestureProcessed = false;

        // Process swipe actions if the motion is completed within the timeline constraint
        if (duration <= this.#swipeMaxTime && totalDistance >= this.#swipeMinDistance) {
            this.#analyzeSwipe(deltaX, deltaY);
            gestureProcessed = true;
        }

        // Run continuous trace analysis if the gesture isn't captured by simple linear vectors
        if (!gestureProcessed && this.#trackingState.points.length > 3) {
            this.#analyzeComplexPattern();
        }
    }

    #resetTracking() {
        this.#trackingState.isTracking = false;
        this.#trackingState.points = [];
    }

    /**
     * Map clean, single-vector swipes to direct structural actions.
     */
    #analyzeSwipe(deltaX, deltaY) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        let direction = '';

        if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        globalEventBus.emit('GESTURE_SWIPE', { direction });

        // Sidebar adaptive gesture support (Swipe right from viewport bounds unlocks navbar)
        if (direction === 'right' && this.#trackingState.startX < 50) {
            globalState.state.ui.sidebarOpen = true;
        }
        if (direction === 'left' && globalState.state.ui.sidebarOpen) {
            globalState.state.ui.sidebarOpen = false;
        }
    }

    /**
     * Map multiple rapid taps directly to systemic action keys.
     */
    #detectDoubleTap(x, y, time) {
        const timeDiff = time - this.#trackingState.lastTapTime;
        
        if (timeDiff < this.#doubleTapDelay && timeDiff > 40) {
            globalEventBus.emit('GESTURE_DOUBLE_TAP', { x, y });
            
            const mappedAction = globalState.state.gestures.doubleTapAction;
            if (mappedAction === 'toggle-sidebar') {
                globalState.state.ui.sidebarOpen = !globalState.state.ui.sidebarOpen;
            }
            this.#trackingState.lastTapTime = 0; // Prevent infinite tap-chains
        } else {
            this.#trackingState.lastTapTime = time;
        }
    }

    /**
     * Match real-time complex input coordinate points to programmatic template shapes.
     * Uses directional chain encoding (0 = Right, 1 = Down, 2 = Left, 3 = Up) to verify path gestures.
     */
    #analyzeComplexPattern() {
        const points = this.#trackingState.points;
        const segmentCount = points.length;
        if (segmentCount < 4) return;

        const directionalSequence = [];
        
        // Parse segments into primary axial vectors
        for (let i = 1; i < segmentCount; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const absoluteX = Math.abs(dx);
            const absoluteY = Math.abs(dy);

            if (Math.hypot(dx, dy) < 15) continue; // Skip static noise segments

            let currentDir = -1;
            if (absoluteX > absoluteY) {
                currentDir = dx > 0 ? 0 : 2; // 0 = Right, 2 = Left
            } else {
                currentDir = dy > 0 ? 1 : 3; // 1 = Down, 3 = Up
            }

            // Append unique, non-consecutive vector changes
            if (directionalSequence.length === 0 || directionalSequence[directionalSequence.length - 1] !== currentDir) {
                directionalSequence.push(currentDir);
            }
        }

        // Compare trace to registered pattern vectors
        for (const [patternId, templateSequence] of Object.entries(this.#patternTemplates)) {
            if (this.#verifySequenceMatch(directionalSequence, templateSequence)) {
                globalEventBus.emit('GESTURE_PATTERN_RECOGNIZED', { patternId });
                this.#triggerPatternPayload(patternId);
                break;
            }
        }
    }

    /**
     * Verifies similarity between the generated directional chain and target templates.
     */
    #verifySequenceMatch(inputSeq, templateSeq) {
        if (inputSeq.length !== templateSeq.length) return false;
        return inputSeq.every((val, index) => val === templateSeq[index]);
    }

    /**
     * Dispatch event actions based on recognized patterns.
     */
    #triggerPatternPayload(patternId) {
        switch (patternId) {
            case 'unlock-relics':
                globalEventBus.emit('NOTIFICATION_TRIGGER', {
                    type: 'success',
                    message: 'Ritual recognized: Relic Vault response active.'
                });
                break;
            case 'chamber-ritual':
                globalEventBus.emit('NOTIFICATION_TRIGGER', {
                    type: 'warning',
                    message: 'Secret alignment recognized: Opening Chamber doors.'
                });
                break;
            case 'override-terminal':
                globalEventBus.emit('NOTIFICATION_TRIGGER', {
                    type: 'danger',
                    message: 'System bypass activated: Initializing debugging terminals.'
                });
                break;
        }
    }
}

export const globalGestureEngine = new GestureEngine();
            
