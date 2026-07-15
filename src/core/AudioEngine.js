import { globalEventBus } from './EventBus.js';
import { globalState } from './StateManager.js';

/**
 * Aether-0X Procedural Audio Engine
 * Generates immediate, zero-weight UI soundscapes using native Web Audio synthesizer nodes.
 */
export const AudioEngine = {
    #audioContext: null,
    #masterVolume: null,
    #muted: false,

    init() {
        // Register auditory event hooks across the event bus
        globalEventBus.on('SFX_TRIGGER', ({ sfxId }) => {
            this.playSFX(sfxId);
        });

        // Initialize audio context on first user interaction (browser security policy)
        const unlockAudio = () => {
            this.#ensureAudioContext();
            if (this.#audioContext) {
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
            }
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
    },

    #ensureAudioContext() {
        if (!this.#audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            this.#audioContext = new AudioContextClass();
            this.#masterVolume = this.#audioContext.createGain();
            this.#masterVolume.gain.setValueAtTime(0.15, this.#audioContext.currentTime); // Soft master baseline
            this.#masterVolume.connect(this.#audioContext.destination);
        }

        if (this.#audioContext.state === 'suspended') {
            this.#audioContext.resume();
        }
    },

    playSFX(sfxId) {
        this.#ensureAudioContext();
        if (!this.#audioContext || this.#muted) return;

        const now = this.#audioContext.currentTime;

        switch (sfxId) {
            case 'grid_toggle': {
                // Short, clinical synthetic pluck for game grid moves
                const osc = this.#audioContext.createOscillator();
                const gain = this.#audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(587.33, now); // D5 Note
                osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08); // Arpeggiate up
                
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                osc.connect(gain);
                gain.connect(this.#masterVolume);
                osc.start(now);
                osc.stop(now + 0.13);
                break;
            }

            case 'chat_receive': {
                // Harmonic dual-tone chime representing incoming network messages
                const osc1 = this.#audioContext.createOscillator();
                const osc2 = this.#audioContext.createOscillator();
                const gain = this.#audioContext.createGain();

                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(880, now); // A5
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1318.51, now); // E6

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.#masterVolume);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.4);
                osc2.stop(now + 0.4);
                break;
            }

            case 'achievement': {
                // Heroic, ascending major pentatonic flourish for high scores & level wins
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const osc = this.#audioContext.createOscillator();
                    const gain = this.#audioContext.createGain();
                    const triggerTime = now + (idx * 0.07);

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, triggerTime);

                    gain.gain.setValueAtTime(0.1, triggerTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, triggerTime + 0.25);

                    osc.connect(gain);
                    gain.connect(this.#masterVolume);

                    osc.start(triggerTime);
                    osc.stop(triggerTime + 0.3);
                });
                break;
            }

            default:
                break;
        }
    },

    setMute(muteState) {
        this.#muted = !!muteState;
    }
};
                  
