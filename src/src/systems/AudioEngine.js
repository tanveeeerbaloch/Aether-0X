import { globalEventBus } from '../core/EventBus.js';
import { globalState } from '../core/StateManager.js';

/**
 * Aether-0X Audio Engine
 * Handles decoupled high-fidelity background environments, UI feedback, and crossfaded scoring.
 */
export class AudioEngine {
    #context = null;
    #masterGain = null;
    #musicGain = null;
    #sfxGain = null;
    
    #audioBuffers = new Map();
    #activeMusicSources = new Map(); // Track playing music layers for crossfades
    #duckingTimer = null;
    #isUnlocked = false;

    constructor() {
        this.#initAudioContext();
        this.#registerStateListeners();
        this.#registerUserInteractionUnlock();
    }

    /**
     * Set up the routing graph: Source -> Channel Gain -> Master Gain -> Destination
     */
    #initAudioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('[AudioEngine] Web Audio API is not supported in this environment.');
            return;
        }

        this.#context = new AudioContextClass();
        
        // Node creation
        this.#masterGain = this.#context.createGain();
        this.#musicGain = this.#context.createGain();
        this.#sfxGain = this.#context.createGain();

        // Node routing
        this.#musicGain.connect(this.#masterGain);
        this.#sfxGain.connect(this.#masterGain);
        this.#masterGain.connect(this.#context.destination);

        // Synchronize initial volumes from global state
        this.setVolume('master', globalState.state.audio.masterVolume);
        this.setVolume('music', globalState.state.audio.musicMuted ? 0 : 0.8);
        this.setVolume('sfx', globalState.state.audio.sfxMuted ? 0 : 1.0);
    }

    /**
     * Unlock browser auto-play restrictions on the first deliberate interaction.
     */
    #registerUserInteractionUnlock() {
        const unlock = async () => {
            if (this.#isUnlocked || !this.#context) return;
            
            if (this.#context.state === 'suspended') {
                await this.#context.resume();
            }
            
            this.#isUnlocked = true;
            globalEventBus.emit('AUDIO_ENGINE_UNLOCKED');
            
            // Clean up event listeners
            ['click', 'keydown', 'touchstart'].forEach(type => {
                document.removeEventListener(type, unlock);
            });
        };

        ['click', 'keydown', 'touchstart'].forEach(type => {
            document.addEventListener(type, unlock, { passive: true });
        });
    }

    #registerStateListeners() {
        globalEventBus.on('STATE_UPDATE:root.audio.masterVolume', ({ newValue }) => {
            this.setVolume('master', newValue);
        });

        globalEventBus.on('STATE_UPDATE:root.audio.musicMuted', ({ newValue }) => {
            const volume = newValue ? 0 : 0.8;
            this.setVolume('music', volume, 0.4); // Smooth transition over 400ms
        });

        globalEventBus.on('STATE_UPDATE:root.audio.sfxMuted', ({ newValue }) => {
            const volume = newValue ? 0 : 1.0;
            this.setVolume('sfx', volume);
        });
    }

    /**
     * Dynamically change channel volume levels with audio-rate parameter ramps.
     * @param {'master'|'music'|'sfx'} channel 
     * @param {number} value - Floating point value between 0.0 and 1.0
     * @param {number} [rampTime=0.1] - Transition duration in seconds
     */
    setVolume(channel, value, rampTime = 0.1) {
        if (!this.#context) return;
        const normalizedValue = Math.max(0, Math.min(1, value));
        let targetGainNode;

        switch (channel) {
            case 'master': targetGainNode = this.#masterGain; break;
            case 'music': targetGainNode = this.#musicGain; break;
            case 'sfx': targetGainNode = this.#sfxGain; break;
            default: return;
        }

        const t = this.#context.currentTime;
        targetGainNode.gain.linearRampToValueAtTime(normalizedValue, t + rampTime);
    }

    /**
     * Pre-cache asset files into AudioBuffers to eliminate UI execution latency.
     * @param {string} id - Asset tracking identifier
     * @param {string} url - Audio asset location path
     */
    async loadSound(id, url) {
        if (!this.#context) return;
        if (this.#audioBuffers.has(id)) return;

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.#context.decodeAudioData(arrayBuffer);
            this.#audioBuffers.set(id, audioBuffer);
        } catch (error) {
            console.error(`[AudioEngine] Failed to load or decode audio at "${url}":`, error);
        }
    }

    /**
     * Execute a high-priority sound effect with automated music ducking.
     * @param {string} id - Cached asset key
     * @param {Object} [options={}]
     * @param {number} [options.detune=0] - Pitch modification cents (-1200 to 1200)
     * @param {boolean} [options.duck=false] - Temporarily suppress background tracks
     */
    playSFX(id, options = {}) {
        if (!this.#context || !this.#isUnlocked || globalState.state.audio.sfxMuted) return;

        const buffer = this.#audioBuffers.get(id);
        if (!buffer) {
            console.warn(`[AudioEngine] Sound buffer "${id}" is missing or un-cached.`);
            return;
        }

        const source = this.#context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.#sfxGain);

        if (options.detune) {
            source.detune.setValueAtTime(options.detune, this.#context.currentTime);
        }

        if (options.duck) {
            this.#applyMusicDucking(0.2, 0.1, buffer.duration);
        }

        source.start(0);
    }

    /**
     * Duck the background music node smoothly during impactful visual/auditory experiences.
     */
    #applyMusicDucking(duckVolume, fadeSpeed, duration) {
        if (this.#duckingTimer) {
            clearTimeout(this.#duckingTimer);
        }

        const normalMusicVolume = globalState.state.audio.musicMuted ? 0 : 0.8;
        this.setVolume('music', normalMusicVolume * duckVolume, fadeSpeed);

        this.#duckingTimer = setTimeout(() => {
            this.setVolume('music', normalMusicVolume, fadeSpeed * 2);
            this.#duckingTimer = null;
        }, (duration + fadeSpeed) * 1000);
    }

    /**
     * Start a seamless looped audio tracking segment with built-in crossfading.
     * @param {string} id - Cached asset key
     * @param {number} [fadeTime=1.5] - Target transition timeline
     */
    playMusic(id, fadeTime = 1.5) {
        if (!this.#context || !this.#audioBuffers.has(id)) return;

        // If the specified track is already playing, preserve its execution cycle
        if (this.#activeMusicSources.has(id)) return;

        const t = this.#context.currentTime;
        const buffer = this.#audioBuffers.get(id);

        const source = this.#context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const trackGain = this.#context.createGain();
        trackGain.gain.setValueAtTime(0, t);
        
        source.connect(trackGain);
        trackGain.connect(this.#musicGain);

        // Crossfade: Fade out and shut down running music processes
        this.#activeMusicSources.forEach((active, activeId) => {
            active.gainNode.gain.linearRampToValueAtTime(0, t + fadeTime);
            active.sourceNode.stop(t + fadeTime);
            this.#activeMusicSources.delete(activeId);
        });

        // Fade in new music layer
        source.start(t);
        trackGain.gain.linearRampToValueAtTime(1.0, t + fadeTime);

        this.#activeMusicSources.set(id, {
            sourceNode: source,
            gainNode: trackGain
        });

        globalState.state.audio.currentTrack = id;
    }
}

export const globalAudioEngine = new AudioEngine();
                           
