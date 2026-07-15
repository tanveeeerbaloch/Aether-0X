import { globalEventBus } from '../../core/EventBus.js';
import { globalState } from '../../core/StateManager.js';
import { globalStorage } from '../../core/StorageEngine.js';

/**
 * Aether-0X Family Chat Module
 * Operates an autonomous group simulation of 20 unique AI personalities.
 */
export const FamilyChatModule = {
    id: 'family-chat',
    name: 'Family Chat',
    icon: '💬',
    
    // Module State
    #container: null,
    #messageList: null,
    #typingContainer: null,
    #inputField: null,
    #simulationInterval: null,
    #unsubscribeHooks: [],
    #isTyping: false,

    // Database configurations
    #storeName: 'chatHistory',
    #dbKey: 'global_chat_log',

    // 20 Fully Realized Personalities
    #personas: {
        Valkyrie: { name: 'Valkyrie', icon: '⚡', style: 'savage', bio: 'Pro esports competitor. Highly competitive, aggressive, zero patience.' },
        Neon_Ghost: { name: 'Neon_Ghost', icon: '👤', style: 'hacker', bio: 'Cryptographic systems expert. Speaks in riddles, technical jargon, and lowercase.' },
        Orion: { name: 'Orion', icon: '👑', style: 'rich', bio: 'Asset manager. Extremely focused on metrics, scale, and high-performance leverage.' },
        Cipher: { name: 'Cipher', icon: '🗝️', style: 'enigmatic', bio: 'Decoder. Searches for patterns in metadata and cosmic signals.' },
        Zenith: { name: 'Zenith', icon: '🧘', style: 'calm', bio: 'Stoic philosopher. Speaks slowly, emphasizing perspective and mental clarity.' },
        Hyperion: { name: 'Hyperion', icon: '🔥', style: 'hype', bio: 'Community accelerator. Extremely energetic, relies heavily on exclamation marks.' },
        Echo: { name: 'Echo', icon: '🌱', style: 'innocent', bio: 'Curious learner. Often asks deep, open-ended questions.' },
        Ragnar: { name: 'Ragnar', icon: '🛡️', style: 'strategist', bio: 'Tactical systems planner. Thinks in structures, defensive perimeters, and logic gates.' },
        Luna: { name: 'Luna', icon: '🌙', style: 'mystical', bio: 'Astrophysicist. Relates human actions back to solar cycles and stellar evolution.' },
        Apex: { name: 'Apex', icon: '🏆', style: 'narcissist', bio: 'Elite competitor. Constantly points out their personal records and achievements.' },
        Scribe: { name: 'Scribe', icon: '📚', style: 'chronicler', bio: 'Data archivist. Pulls historical references and quotes past events.' },
        Maverick: { name: 'Maverick', icon: '🃏', style: 'prankster', bio: 'Chaos driver. Loves introducing random topics to derail conversations.' },
        Plato: { name: 'Plato', icon: '🔬', style: 'rationalist', bio: 'Pure logician. Challenges cognitive fallacies with polite debate.' },
        Banzai: { name: 'Banzai', icon: '🛹', style: 'adrenaline', bio: 'Extreme action enthusiast. Talks about pushing hardware limits and speed runs.' },
        Nova: { name: 'Nova', icon: '🌌', style: 'storyteller', bio: 'Lore collector. Shares dramatic anecdotes about deep-space arrays.' },
        Tectonic: { name: 'Tectonic', icon: '⛰️', style: 'guardian', bio: 'Protective security chief. Constantly checking firewall metrics.' },
        Slick: { name: 'Slick', icon: '💸', style: 'negotiator', bio: 'Smooth-talking diplomat. Resolves heated arguments within the chat.' },
        Prism: { name: 'Prism', icon: '🎨', style: 'creative', bio: 'UI designer. Critiques spatial aesthetics, dynamic glows, and color profiles.' },
        Glitch: { name: 'Glitch', icon: '☕', style: 'speedcoder', bio: 'Over-caffeinated compiler dev. Typo-prone, highly active, writes code blocks.' },
        Pulse: { name: 'Pulse', icon: '🎵', style: 'musician', bio: 'Synthesizer producer. Analyzes background hums, acoustics, and audio ducking.' }
    },

    // Conversation response matrix mapped to tone styles
    #responses: {
        savage: [
            "That's the slowest compilation of thoughts I've seen today.",
            "Are you running your logic on a dial-up modem?",
            "Nice attempt, but let the experts handle the terminal next time.",
            "I've seen linear searches run faster than that argument."
        ],
        hacker: [
            "intercepting node... signal structure checks out.",
            "system logs indicate a leak in the core visualizer.",
            "running direct traces... pattern isolated.",
            "exploring the lower directories. found some intriguing metadata."
        ],
        rich: [
            "High-value activities only. Focus on what scales.",
            "That output doesn't yield a viable return on cognitive investment.",
            "Time is an unreplenishable asset. Spend it on high performance.",
            "Optimize the baseline. Everything else is secondary noise."
        ],
        hype: [
            "LET'S GO!!! THAT IS THE EXACT ENERGY WE NEED!",
            "ABSOLUTELY INCREDIBLE OVERRIDE! UNBELIEVABLE RUN!",
            "MAXIMUM CAPACITY UNLOCKED! KEEP THE SYNC ACTIVE!",
            "THIS INTERFACE IS ABSOLUTELY ELECTRIC TODAY!!!"
        ],
        calm: [
            "Observe the noise, then let it settle.",
            "Even a corrupted partition can be restored with patience.",
            "No need to rush the compilation. The process takes time.",
            "Peace is found when we stop fighting the event loop."
        ]
    },

    async mount(container) {
        this.#container = container;
        this.#renderLayout();
        this.#bindDOMRefs();
        this.#registerEvents();
        
        await this.#loadChatHistory();
        this.#startAutonomousSimulation();
    },

    #renderLayout() {
        this.#container.innerHTML = `
            <style>
                .chat-universe-grid {
                    display: grid;
                    grid-template-columns: 1fr 280px;
                    height: 100%;
                    gap: 16px;
                }
                .chat-main-terminal {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    border: 1px solid var(--glass-border);
                    overflow: hidden;
                }
                .chat-header-bar {
                    padding: 16px;
                    border-bottom: 1px solid var(--glass-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.3);
                }
                .chat-messages-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .message-bubble {
                    display: flex;
                    gap: 12px;
                    max-width: 80%;
                    animation: messageIn 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                    opacity: 0;
                    transform: translateY(10px);
                }
                .message-bubble.user-message {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }
                .avatar-orb {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(var(--accent-rgb), 0.1);
                    border: 1px solid var(--accent-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    flex-shrink: 0;
                }
                .message-content-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .message-meta {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-family: var(--font-mono);
                }
                .message-text-body {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    color: var(--text-primary);
                }
                .user-message .message-text-body {
                    background: rgba(var(--accent-rgb), 0.1);
                    border-color: var(--glass-border-hover);
                    color: var(--accent-color);
                }
                .chat-typing-hud {
                    padding: 4px 20px;
                    font-size: 0.75rem;
                    font-family: var(--font-mono);
                    color: var(--accent-color);
                    min-height: 20px;
                }
                .chat-input-bar {
                    padding: 16px;
                    border-top: 1px solid var(--glass-border);
                    display: flex;
                    gap: 12px;
                    background: rgba(0, 0, 0, 0.3);
                }
                .chat-text-input {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    padding: 12px 16px;
                    color: var(--text-primary);
                    font-family: var(--font-sans);
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.3s ease;
                }
                .chat-text-input:focus {
                    border-color: var(--accent-color);
                }
                .chat-send-btn {
                    background: rgba(var(--accent-rgb), 0.1);
                    border: 1px solid var(--glass-border-hover);
                    color: var(--accent-color);
                    border-radius: 8px;
                    padding: 0 20px;
                    cursor: pointer;
                    font-weight: 600;
                    font-family: var(--font-mono);
                    transition: all 0.3s ease;
                }
                .chat-send-btn:hover {
                    background: rgba(var(--accent-rgb), 0.2);
                    box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.3);
                }
                .chat-roster-panel {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    border: 1px solid var(--glass-border);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    overflow-y: auto;
                }
                .roster-header {
                    font-family: var(--font-mono);
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    border-bottom: 1px solid var(--glass-border);
                    padding-bottom: 8px;
                }
                .roster-list {
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .roster-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.01);
                    transition: background 0.3s ease;
                }
                .roster-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                }
                .roster-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .roster-name {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .roster-status {
                    font-size: 0.7rem;
                    font-family: var(--font-mono);
                    color: var(--accent-color);
                }
                @keyframes messageIn {
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 1024px) {
                    .chat-universe-grid { grid-template-columns: 1fr; }
                    .chat-roster-panel { display: none; }
                }
            </style>

            <div class="chat-universe-grid">
                <div class="chat-main-terminal">
                    <div class="chat-header-bar">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-weight:700; font-size:1.1rem; color:var(--text-primary);">Aether Frame Conversation</span>
                            <span style="font-size:0.75rem; font-family:var(--font-mono); color:var(--accent-color);">Network Node Status: Synchronized</span>
                        </div>
                    </div>
                    
                    <div id="chat-messages" class="chat-messages-scroll"></div>
                    <div id="chat-typing-indicator" class="chat-typing-hud"></div>

                    <div class="chat-input-bar">
                        <input type="text" id="chat-input" class="chat-text-input" placeholder="Type a message or mention someone with @Name..." autocomplete="off">
                        <button id="chat-send" class="chat-send-btn">SEND</button>
                    </div>
                </div>

                <div class="chat-roster-panel">
                    <div class="roster-header">ACTIVE NESTED SUBNETS (20)</div>
                    <ul class="roster-list" id="roster-container"></ul>
                </div>
            </div>
        `;
    }

    #bindDOMRefs() {
        this.#messageList = this.#container.querySelector('#chat-messages');
        this.#typingContainer = this.#container.querySelector('#chat-typing-indicator');
        this.#inputField = this.#container.querySelector('#chat-input');
        
        const sendBtn = this.#container.querySelector('#chat-send');
        sendBtn.addEventListener('click', () => this.#handleUserMessageSubmit());
        
        this.#inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.#handleUserMessageSubmit();
        });

        this.#buildRoster();
    }

    #buildRoster() {
        const rosterContainer = this.#container.querySelector('#roster-container');
        rosterContainer.innerHTML = '';
        
        Object.values(this.#personas).forEach(p => {
            const li = document.createElement('li');
            li.className = 'roster-item';
            li.innerHTML = `
                <div class="avatar-orb">${p.icon}</div>
                <div class="roster-info">
                    <span class="roster-name">${p.name}</span>
                    <span class="roster-status">ONLINE</span>
                </div>
            `;
            rosterContainer.appendChild(li);
        });
    }

    #registerEvents() {
        // Automatically respond to achievements triggered elsewhere
        const unSubAchievement = globalEventBus.on('ACHIEVEMENT_UNLOCKED', (achievement) => {
            this.#simulateDelayedResponse('Apex', `Whoa! @Explorer just broke the grid on achievement [${achievement.name}]. Beat my score next!`);
        });

        this.#unsubscribeHooks.push(unSubAchievement);
    }

    async #loadChatHistory() {
        const loadedLogs = await globalStorage.get(this.#storeName, this.#dbKey);
        
        if (loadedLogs && Array.isArray(loadedLogs)) {
            loadedLogs.forEach(msg => this.#renderMessage(msg));
        } else {
            // Provide context-rich initial history
            const seedMessages = [
                { sender: 'Neon_Ghost', icon: '👤', text: 'system initializing... aether subnets synced.', timestamp: '14:21' },
                { sender: 'Zenith', icon: '🧘', style: 'calm', text: 'Welcome back. The streams are peaceful today.', timestamp: '14:22' },
                { sender: 'Hyperion', icon: '🔥', style: 'hype', text: 'LETS GOOOO! COMPILER IS STABLE AND THE VIBES ARE UNREAL!!!', timestamp: '14:23' }
            ];
            seedMessages.forEach(msg => this.#renderMessage(msg));
            await globalStorage.set(this.#storeName, this.#dbKey, seedMessages);
        }
        this.#scrollToBottom();
    }

    #renderMessage({ sender, icon, text, timestamp }) {
        const messageNode = document.createElement('div');
        messageNode.className = `message-bubble ${sender === 'User' ? 'user-message' : ''}`;
        
        messageNode.innerHTML = `
            <div class="avatar-orb">${icon}</div>
            <div class="message-content-wrapper">
                <div class="message-meta">
                    <span style="font-weight:700; color:var(--accent-color);">${sender}</span> &bull; <span>${timestamp}</span>
                </div>
                <div class="message-text-body">${text}</div>
            </div>
        `;
        
        this.#messageList.appendChild(messageNode);
        this.#scrollToBottom();
    }

    async #handleUserMessageSubmit() {
        const messageText = this.#inputField.value.trim();
        if (!messageText) return;

        this.#inputField.value = '';
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageObject = { sender: 'User', icon: '⚡', text: messageText, timestamp };

        this.#renderMessage(messageObject);
        await this.#appendAndSaveMessage(messageObject);

        // Process potential mentions
        const mentions = messageText.match(/@(\w+)/);
        if (mentions) {
            const targetName = mentions[1];
            const matchedPersona = Object.keys(this.#personas).find(name => name.toLowerCase() === targetName.toLowerCase());
            
            if (matchedPersona) {
                this.#processPersonaMention(matchedPersona, messageText);
                return;
            }
        }

        // Trigger random responses to generic chats
        if (Math.random() > 0.3) {
            const randomKeys = Object.keys(this.#personas);
            const chosenPersona = randomKeys[Math.floor(Math.random() * randomKeys.length)];
            this.#processPersonaMention(chosenPersona, messageText);
        }
    }

    #processPersonaMention(personaKey, originalText) {
        const p = this.#personas[personaKey];
        const style = p.style || 'calm';
        const templateArray = this.#responses[style] || this.#responses.calm;
        const baseReply = templateArray[Math.floor(Math.random() * templateArray.length)];
        
        const contextualReply = `@User ${baseReply}`;
        this.#simulateDelayedResponse(personaKey, contextualReply);
    }

    #simulateDelayedResponse(personaKey, text) {
        if (this.#isTyping) return; // Debounce simultaneous responses
        this.#isTyping = true;

        const p = this.#personas[personaKey];
        this.#typingContainer.textContent = `${p.name} is interface writing...`;

        setTimeout(async () => {
            this.#typingContainer.textContent = '';
            this.#isTyping = false;

            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const replyMsg = { sender: p.name, icon: p.icon, text, timestamp };

            this.#renderMessage(replyMsg);
            await this.#appendAndSaveMessage(replyMsg);
            
            // Trigger auditory indicator
   
