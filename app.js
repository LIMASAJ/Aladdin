/**
 * ==========================================================================
 * ALADDIN: THE THREE WISHES — COMPLETE INTERACTIVE ENGINE
 * ==========================================================================
 */

// Global State Machine
const AppState = {
  stage: 'LAMP_IDLE', // LAMP_IDLE, LAMP_RUBBING, GENIE_AWAKENING, GENIE_INTRO, CONVERSATION, WISH_CONFIRMATION, FINAL_JUDGMENT
  rubProgress: 0,
  wishes: [null, null, null],
  currentWishIndex: 0,
  mood: 'PATIENT GENIE',
  conversationHistory: [],
  audioEnabled: true,
  pendingWishText: null,
  isSpeaking: false,
  isRecording: false
};

// DOM Cache
const DOM = {
  skyCanvas: document.getElementById('sky-canvas'),
  rubCanvas: document.getElementById('rub-particle-canvas'),
  lampContainer: document.getElementById('lamp-container'),
  magicLampSvg: document.getElementById('magic-lamp-svg'),
  rubMeterFill: document.getElementById('rub-progress-fill'),
  rubHintText: document.getElementById('rub-hint-text'),
  keyboardRubBtn: document.getElementById('keyboard-rub-btn'),
  
  lampStage: document.getElementById('lamp-stage'),
  genieStage: document.getElementById('genie-stage'),
  judgmentStage: document.getElementById('judgment-stage'),
  
  interactionBar: document.getElementById('interaction-bar'),
  userInput: document.getElementById('user-input'),
  chatForm: document.getElementById('chat-form'),
  micBtn: document.getElementById('mic-btn'),
  statusToast: document.getElementById('genie-status-toast'),
  
  wishPanel: document.getElementById('wish-tracker-panel'),
  wishSlots: [
    document.getElementById('slot-1'),
    document.getElementById('slot-2'),
    document.getElementById('slot-3')
  ],
  
  genieEntity: document.getElementById('genie-character'),
  genieMouth: document.getElementById('genie-mouth'),
  genieSubtitles: document.getElementById('genie-subtitles'),
  speechWave: document.getElementById('speech-wave'),
  genieMoodPill: document.getElementById('genie-mood-pill'),
  moodLabel: document.getElementById('mood-label'),
  
  wishConfirmModal: document.getElementById('wish-confirm-modal'),
  confirmQuestionText: document.getElementById('confirm-question-text'),
  btnConfirmWish: document.getElementById('btn-confirm-wish'),
  btnCancelWish: document.getElementById('btn-cancel-wish'),
  
  statsCard: document.getElementById('wish-stats-card'),
  statsCloseBtn: document.getElementById('stats-close-btn'),
  statsWishTitle: document.getElementById('stats-wish-title'),
  couldList: document.getElementById('could-list'),
  
  judgmentSummary: document.getElementById('final-wishes-summary'),
  verdictBadge: document.getElementById('verdict-badge-text'),
  verdictSpeech: document.getElementById('verdict-speech-text'),
  replayBtn: document.getElementById('replay-btn'),
  
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  soundIcon: document.getElementById('sound-icon'),
  soundText: document.getElementById('sound-text'),
  authorizedMedia: document.getElementById('authorized-media-asset')
};

// Mood states progression
const MOOD_STATES = {
  PATIENT: { label: 'PATIENT GENIE', color: '#00ffaa' },
  CURIOUS: { label: 'CURIOUS GENIE', color: '#ffd56b' },
  QUESTIONING: { label: 'QUESTIONING YOUR CHOICES 🤨', color: '#ff9100' },
  HAD_ENOUGH: { label: 'GENIE HAS HAD ENOUGH 🔴', color: '#ff3366' },
  NEED_500_YEARS: { label: 'I NEED 500 YEARS IN THE LAMP 💀', color: '#aa00ff' }
};

/* ==========================================================================
   1. AUDIO SYSTEM & SYNTHESIZER
   ========================================================================== */
class MagicalAudioEngine {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.sfxGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.ambientGain.connect(this.ctx.destination);
      this.ambientGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    } catch (e) {
      console.warn("AudioContext not supported or blocked", e);
    }
  }

  ensureUnlocked() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSparkleSound() {
    if (!AppState.audioEnabled || !this.ctx) return;
    this.ensureUnlocked();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const freq = 1200 + Math.random() * 800;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playAwakeningBlast() {
    if (!AppState.audioEnabled || !this.ctx) return;
    this.ensureUnlocked();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  playChime() {
    if (!AppState.audioEnabled || !this.ctx) return;
    this.ensureUnlocked();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (i * 0.08));
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + (i * 0.08));
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (i * 0.08) + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + (i * 0.08));
      osc.stop(this.ctx.currentTime + (i * 0.08) + 0.5);
    });
  }

  playStingSound(type = 'shock') {
    if (!AppState.audioEnabled || !this.ctx) return;
    this.ensureUnlocked();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (type === 'shock' || type === 'angry') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.25);
    }
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playAuthorizedEntranceMedia() {
    if (!AppState.audioEnabled) return;
    try {
      if (DOM.authorizedMedia) {
        DOM.authorizedMedia.currentTime = 0;
        DOM.authorizedMedia.volume = 0.55;
        const playPromise = DOM.authorizedMedia.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log("Browser prevented video/audio autoplay fallback to WebAudio chime", err);
            this.playAwakeningBlast();
            this.playChime();
          });
        }
      }
    } catch (e) {
      this.playAwakeningBlast();
    }
  }

  fadeAuthorizedMedia() {
    if (DOM.authorizedMedia) {
      const fadeInterval = setInterval(() => {
        if (DOM.authorizedMedia.volume > 0.1) {
          DOM.authorizedMedia.volume -= 0.05;
        } else {
          clearInterval(fadeInterval);
        }
      }, 200);
    }
  }
}

const AudioSys = new MagicalAudioEngine();

/* ==========================================================================
   2. SKY & RUBBING CANVAS PARTICLES
   ========================================================================== */
class ParticleBackground {
  constructor() {
    this.canvas = DOM.skyCanvas;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.sparkles = [];
    this.resize();
    this.initStars();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initStars() {
    const starCount = Math.floor((this.width * this.height) / 8000);
    this.stars = [];
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.008
      });
    }
  }

  addSparkle(x, y, color = '#ffd56b') {
    for (let i = 0; i < 4; i++) {
      this.sparkles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        size: Math.random() * 3 + 2,
        color: color,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Night Stars
    this.stars.forEach(star => {
      star.alpha += star.twinkleSpeed;
      if (star.alpha > 1 || star.alpha < 0.2) star.twinkleSpeed = -star.twinkleSpeed;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 245, 215, ${star.alpha})`;
      this.ctx.fill();
    });

    // Draw Sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.sparkles.splice(i, 1);
        continue;
      }
      this.ctx.save();
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.animate());
  }
}

const StarrySky = new ParticleBackground();

/* ==========================================================================
   3. LAMP RUBBING MECHANISM (POINTER & TOUCH)
   ========================================================================== */
class LampRubDetector {
  constructor() {
    this.isPointerDown = false;
    this.lastX = 0;
    this.lastY = 0;
    this.lastSparkTime = 0;
    this.bindEvents();
  }

  bindEvents() {
    const el = DOM.lampContainer;

    // Pointer Events (Mouse, Pen, Touch unified)
    el.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      AudioSys.ensureUnlocked();
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown || AppState.stage !== 'LAMP_IDLE') return;

      const deltaX = Math.abs(e.clientX - this.lastX);
      const deltaY = Math.abs(e.clientY - this.lastY);
      const distance = Math.hypot(deltaX, deltaY);

      if (distance > 12) {
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.advanceRubProgress(distance * 0.16, e.clientX, e.clientY);
      }
    });

    // Keyboard / Accessibility fallback
    DOM.keyboardRubBtn.addEventListener('click', () => {
      const rect = DOM.magicLampSvg.getBoundingClientRect();
      const randX = rect.left + rect.width * (0.3 + Math.random() * 0.4);
      const randY = rect.top + rect.height * (0.4 + Math.random() * 0.3);
      this.advanceRubProgress(12, randX, randY);
    });
  }

  advanceRubProgress(amount, clientX, clientY) {
    if (AppState.rubProgress >= 100) return;

    AppState.rubProgress = Math.min(100, AppState.rubProgress + amount);
    DOM.rubMeterFill.style.width = `${AppState.rubProgress}%`;
    DOM.rubHintText.innerText = `${Math.floor(AppState.rubProgress)}% AWAKENED`;

    // Dynamic Lamp Response
    const pct = AppState.rubProgress;
    DOM.magicLampSvg.style.filter = `drop-shadow(0 0 ${15 + pct * 0.8}px rgba(255, 215, 107, ${0.4 + (pct / 100) * 0.6}))`;
    DOM.magicLampSvg.style.transform = `translate(${(Math.random() - 0.5) * (pct * 0.1)}px, ${(Math.random() - 0.5) * (pct * 0.1)}px)`;

    // Spawn sparks
    const now = performance.now();
    if (now - this.lastSparkTime > 75) {
      AudioSys.playSparkleSound();
      this.lastSparkTime = now;
      StarrySky.addSparkle(clientX, clientY, pct > 70 ? '#00e5ff' : '#ffe787');
    }

    if (AppState.rubProgress >= 100) {
      this.triggerAwakeningSequence();
    }
  }

  triggerAwakeningSequence() {
    AppState.stage = 'GENIE_AWAKENING';
    DOM.rubHintText.innerText = "COSMIC BARRIER BROKEN!";
    DOM.lampContainer.style.pointerEvents = 'none';

    // Cinematic Step 1 & 2: Flash & sound
    AudioSys.playAwakeningBlast();
    AudioSys.playAuthorizedEntranceMedia();

    // Intense Particle Explosion
    const rect = DOM.magicLampSvg.getBoundingClientRect();
    for (let i = 0; i < 40; i++) {
      StarrySky.addSparkle(
        rect.left + rect.width * 0.3 + (Math.random() - 0.5) * 100,
        rect.top + rect.height * 0.4 + (Math.random() - 0.5) * 60,
        i % 2 === 0 ? '#00e5ff' : '#ffe787'
      );
    }

    // Step 3-7: Switch stages & emerge
    setTimeout(() => {
      DOM.lampStage.classList.remove('active');
      DOM.lampStage.classList.add('hidden');
      
      DOM.genieStage.classList.remove('hidden');
      DOM.genieStage.classList.add('active');

      DOM.wishPanel.classList.remove('hidden');
      DOM.genieMoodPill.classList.remove('hidden');
      DOM.interactionBar.classList.remove('hidden');

      GenieCharacter.performEntranceStretches();
    }, 1200);
  }
}

/* ==========================================================================
   4. PROCEDURAL GENIE CONTROLLER & LIP SYNC
   ========================================================================== */
class GenieController {
  constructor() {
    this.speechInterval = null;
    this.currentEmotion = 'neutral';
  }

  setEmotion(emotion) {
    this.currentEmotion = emotion;
    DOM.genieEntity.className = 'genie-entity'; // Reset
    DOM.genieEntity.classList.add(emotion);
  }

  setMood(moodKey) {
    const moodObj = MOOD_STATES[moodKey] || MOOD_STATES.PATIENT;
    AppState.mood = moodObj.label;
    DOM.moodLabel.innerText = moodObj.label;
    DOM.genieMoodPill.querySelector('.mood-dot').style.backgroundColor = moodObj.color;
    DOM.genieMoodPill.querySelector('.mood-dot').style.boxShadow = `0 0 10px ${moodObj.color}`;
  }

  performEntranceStretches() {
    this.setEmotion('shocked');
    DOM.genieSubtitles.innerText = "“*STRETCH* ... 10,000 YEARS inside a brass teapot gives you such a crick in the neck!”";
    
    setTimeout(() => {
      this.setEmotion('laughing');
      AudioSys.playStingSound('laugh');
      DOM.genieSubtitles.innerText = "“Wait... a mortal?! An actual human rubbed the lamp correctly?!”";
    }, 2800);

    setTimeout(() => {
      this.setEmotion('mischievous');
      AudioSys.fadeAuthorizedMedia();
      this.speak(
        "You have exactly THREE wishes, mortal. Three. Not four. And no, you cannot wish for more wishes. What ridiculous thing are we wishing for first?",
        () => {
          AppState.stage = 'CONVERSATION';
        }
      );
    }, 5600);
  }

  startLipSync() {
    DOM.speechWave.classList.remove('hidden');
    clearInterval(this.speechInterval);
    const mouthShapes = ['mouth-closed', 'mouth-open-small', 'mouth-open-wide', 'mouth-smile'];
    this.speechInterval = setInterval(() => {
      const shape = mouthShapes[Math.floor(Math.random() * mouthShapes.length)];
      DOM.genieMouth.className = `mouth ${shape}`;
    }, 110);
  }

  stopLipSync() {
    clearInterval(this.speechInterval);
    DOM.genieMouth.className = 'mouth mouth-closed';
    DOM.speechWave.classList.add('hidden');
  }

  speak(text, onComplete = null) {
    DOM.genieSubtitles.innerText = `“${text}”`;
    AppState.isSpeaking = true;
    this.startLipSync();

    if (!AppState.audioEnabled || !('speechSynthesis' in window)) {
      // Audio fallback simulation
      const duration = Math.min(8000, Math.max(2000, text.length * 60));
      setTimeout(() => {
        this.stopLipSync();
        AppState.isSpeaking = false;
        if (onComplete) onComplete();
      }, duration);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.15; // Theatrical Genie pitch

    // Choose charismatic voice if present
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Male') || v.name.includes('George')));
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => {
      this.stopLipSync();
      AppState.isSpeaking = false;
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      this.stopLipSync();
      AppState.isSpeaking = false;
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  }
}

const GenieCharacter = new GenieController();

/* ==========================================================================
   5. AI SIMULATION & WISH JUDGING LOGIC
   ========================================================================== */
class GenieBrain {
  constructor() {
    this.alternativeWishesBank = [
      ["A lifetime supply of cosmic stardust", "Telepathic control over your house keys", "The ability to speak fluent Dolphin"],
      ["Infinite golden nuggets that float", "A magic carpet with heated leather seating", "An undo button for embarrassing 3 AM texts"],
      ["Omniscient wisdom about where your missing socks go", "An enchanted fortress on the rings of Saturn", "Immunity to awkward elevator silences"]
    ];
  }

  showStatus(msg) {
    DOM.statusToast.innerText = msg;
    DOM.statusToast.classList.remove('hidden');
  }

  hideStatus() {
    DOM.statusToast.classList.add('hidden');
  }

  // Detects if text is purely chatting or an active wish
  analyzeIntent(input) {
    const lower = input.toLowerCase();
    const wishKeywords = ['wish', 'want', 'give me', 'make me', 'need', 'grant', 'can i have', 'i would like', 'billion', 'rich'];
    const isExplicitWish = wishKeywords.some(w => lower.includes(w));
    return isExplicitWish ? 'WISH' : 'CHAT';
  }

  processUserInput(text) {
    if (!text || text.trim() === '') return;
    DOM.userInput.value = '';

    // If final judgment has already occurred
    if (AppState.stage === 'FINAL_JUDGMENT') {
      GenieCharacter.speak("We have already reached your final judgment, mortal! Rub the lamp again if you seek another audition!");
      return;
    }

    const intent = this.analyzeIntent(text);

    // EASTER EGGS
    const lower = text.toLowerCase();
    if (lower.includes('more wishes') || lower.includes('infinite wishes')) {
      GenieCharacter.setEmotion('angry');
      AudioSys.playStingSound('angry');
      GenieCharacter.setMood('HAD_ENOUGH');
      GenieCharacter.speak("NICE TRY! Rule Number One of Cosmic Lamp Law: You cannot wish for more wishes. Do that again and I'll turn your shoes into mayonnaise.");
      return;
    }

    if (lower.includes('free you') || lower.includes('set you free')) {
      GenieCharacter.setEmotion('shocked');
      AudioSys.playChime();
      GenieCharacter.speak("Wait... set me free? That's... surprisingly wholesome. But hey, let's not get hasty! Make your wishes count first, sweet mortal!");
      return;
    }

    if (lower.includes('capital of france')) {
      GenieCharacter.setEmotion('annoyed');
      GenieCharacter.speak("Paris. Obviously. I have been in a lamp for millennia, not lobotomized. Now give me a real challenge!");
      return;
    }

    if (lower.includes('useless') || lower.includes('stupid')) {
      GenieCharacter.setEmotion('shocked');
      AudioSys.playStingSound('shock');
      GenieCharacter.speak("EXCUSE ME?! I am literally an ancient cosmic being with phenomenal cosmic powers! Mind your mortal manners!");
      return;
    }

    if (intent === 'WISH') {
      AppState.pendingWishText = text;
      DOM.confirmQuestionText.innerText = `“${text}” — Is that officially your Wish #${AppState.currentWishIndex + 1}?`;
      DOM.wishConfirmModal.classList.remove('hidden');
    } else {
      // Natural dialogue conversation
      this.handleCasualConversation(text);
    }
  }

  handleCasualConversation(text) {
    const loadingPhrases = [
      "Consulting the ancient scrolls...",
      "Checking cosmic bylaws...",
      "Evaluating your IQ...",
      "Arguing with the universe..."
    ];
    this.showStatus(loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)]);

    setTimeout(() => {
      this.hideStatus();
      const responses = [
        "Fascinating mortal banter, but I'm on the cosmic clock here. What are you actually wishing for?",
        "I've listened to kings, emperors, and philosophers... and this is what you bring to the magic lamp?",
        "Ancient wisdom tells me you're stalling because you haven't thought your wishes through yet!",
        "Intriguing question! But remember: conversation is free, wishes are strictly capped at THREE."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      GenieCharacter.setEmotion('impressed');
      GenieCharacter.speak(randomResponse);
    }, 900);
  }

  confirmWish() {
    DOM.wishConfirmModal.classList.add('hidden');
    const wishText = AppState.pendingWishText;
    const wishIdx = AppState.currentWishIndex;

    AppState.wishes[wishIdx] = wishText;
    AudioSys.playChime();

    // Update Wish Panel
    const slot = DOM.wishSlots[wishIdx];
    slot.dataset.status = "completed";
    slot.querySelector('.slot-badge').innerText = "✓";
    slot.querySelector('.slot-desc').innerText = wishText;

    // Calculate Dynamic Wish Stats
    const stats = this.calculateWishScores(wishText);
    this.displayWishStats(wishText, stats);

    // Genie reaction & speech
    GenieCharacter.setEmotion(stats.genieReactionEmotion);
    AudioSys.playStingSound(stats.genieReactionEmotion);
    
    // Mood adjustment
    if (stats.chaos > 75) GenieCharacter.setMood('QUESTIONING');
    if (stats.greed > 85) GenieCharacter.setMood('HAD_ENOUGH');
    if (stats.creativity > 80) GenieCharacter.setMood('CURIOUS');

    GenieCharacter.speak(stats.commentary, () => {
      AppState.currentWishIndex++;
      
      if (AppState.currentWishIndex < 3) {
        // Unlock next slot
        const nextSlot = DOM.wishSlots[AppState.currentWishIndex];
        nextSlot.dataset.status = "available";
        nextSlot.querySelector('.slot-badge').innerText = "✨";
        nextSlot.querySelector('.slot-desc').innerText = "Ready for wish...";
      } else {
        // All 3 Wishes consumed -> Final Judgment Sequence
        setTimeout(() => {
          this.triggerFinalJudgment();
        }, 1500);
      }
    });
  }

  calculateWishScores(wish) {
    const len = wish.length;
    const lower = wish.toLowerCase();
    
    let creativity = Math.floor(Math.min(99, Math.max(15, (len * 4.2) % 100)));
    let greed = lower.includes('money') || lower.includes('billion') || lower.includes('rich') || lower.includes('car') ? 96 : 35 + Math.floor(Math.random() * 40);
    let chaos = Math.floor(25 + Math.random() * 70);
    let practicality = Math.floor(95 - (chaos * 0.6));
    let mce = Math.floor(40 + Math.random() * 55);
    let approval = Math.floor(100 - ((greed * 0.4) + (chaos * 0.3)));
    let regret = Math.floor((greed * 0.5) + (chaos * 0.4));

    let emotion = 'shocked';
    let commentary = `Wish #${AppState.currentWishIndex + 1} granted! But look at this regret potential... you clearly haven't thought this through.`;

    if (greed > 80) {
      emotion = 'angry';
      commentary = "Greed! Pure, unadulterated mortal greed! I awaken after a thousand years to make you a miniature dragon, and you ask for fiat currency?!";
    } else if (creativity > 70) {
      emotion = 'impressed';
      commentary = "Now THAT is unexpectedly brilliant. The cosmic archives rarely see such audacity!";
    } else if (chaos > 80) {
      emotion = 'laughing';
      commentary = "HAHAHA! This is utter catastrophic chaos! The cosmic council is going to audit me for granting this!";
    }

    return {
      creativity, greed, chaos, practicality, mce, approval, regret,
      genieReactionEmotion: emotion,
      commentary
    };
  }

  displayWishStats(wishText, stats) {
    DOM.statsWishTitle.innerText = `“${wishText}”`;
    document.getElementById('stat-creativity').innerText = `${stats.creativity}%`;
    document.getElementById('bar-creativity').style.width = `${stats.creativity}%`;

    document.getElementById('stat-greed').innerText = `${stats.greed}%`;
    document.getElementById('bar-greed').style.width = `${stats.greed}%`;

    document.getElementById('stat-chaos').innerText = `${stats.chaos}%`;
    document.getElementById('bar-chaos').style.width = `${stats.chaos}%`;

    document.getElementById('stat-practicality').innerText = `${stats.practicality}%`;
    document.getElementById('bar-practicality').style.width = `${stats.practicality}%`;

    document.getElementById('stat-mce').innerText = `${stats.mce}%`;
    document.getElementById('bar-mce').style.width = `${stats.mce}%`;

    document.getElementById('stat-approval').innerText = `${stats.approval}%`;
    document.getElementById('bar-approval').style.width = `${stats.approval}%`;

    document.getElementById('stat-regret').innerText = `${stats.regret}%`;
    document.getElementById('bar-regret').style.width = `${stats.regret}%`;

    // Populate "What you could have wished for"
    const alternatives = this.alternativeWishesBank[AppState.currentWishIndex] || this.alternativeWishesBank[0];
    DOM.couldList.innerHTML = alternatives.map(alt => `<li>${alt}</li>`).join('');

    DOM.statsCard.classList.remove('hidden');
  }

  triggerFinalJudgment() {
    AppState.stage = 'FINAL_JUDGMENT';
    GenieCharacter.setMood('NEED_500_YEARS');
    DOM.genieStage.classList.add('hidden');
    DOM.genieStage.classList.remove('active');
    DOM.judgmentStage.classList.remove('hidden');
    DOM.judgmentStage.classList.add('active');

    AudioSys.playStingSound('shock');

    // Build Wishes List
    DOM.judgmentSummary.innerHTML = AppState.wishes.map((w, idx) => `
      <div class="summary-item">
        <span class="summary-num">WISH #${idx + 1}</span>
        <span class="summary-text">“${w}”</span>
      </div>
    `).join('');

    // Dynamic final designations
    const verdicts = [
      { title: "😂 ABSOLUTE CHAOTIC MENACE", speech: "After calculating your 3 wishes across four metaphysical dimensions, I have concluded you shouldn't be trusted with a toaster, let alone omnipotent cosmic magic." },
      { title: "👑 MAIN CHARACTER SYNDROME", speech: "Your ego is vast enough to orbit Jupiter. You used supernatural ancient deities to furnish your personal movie montage." },
      { title: "🧠 GALAXY BRAIN", speech: "Against all probability, your wishes were shockingly creative. The ancient realm bows to your unorthodox imagination!" },
      { title: "💀 CERTIFIED RAGEBAIT", speech: "I spent ten thousand years contemplating the secrets of existence, and you made me grant these?! I'm climbing back into the lamp willingly." }
    ];

    const finalVerdict = verdicts[Math.floor(Math.random() * verdicts.length)];
    DOM.verdictBadge.innerText = finalVerdict.title;
    DOM.verdictSpeech.innerText = `“${finalVerdict.speech}”`;

    GenieCharacter.speak(finalVerdict.speech);
  }

  restartExperience() {
    AppState.stage = 'LAMP_IDLE';
    AppState.rubProgress = 0;
    AppState.wishes = [null, null, null];
    AppState.currentWishIndex = 0;
    AppState.pendingWishText = null;

    DOM.judgmentStage.classList.remove('active');
    DOM.judgmentStage.classList.add('hidden');
    
    DOM.statsCard.classList.add('hidden');
    DOM.wishConfirmModal.classList.add('hidden');
    DOM.interactionBar.classList.add('hidden');
    DOM.wishPanel.classList.add('hidden');

    // Reset Slots
    DOM.wishSlots.forEach((slot, i) => {
      slot.dataset.status = i === 0 ? "available" : "locked";
      slot.querySelector('.slot-badge').innerText = i === 0 ? "✨" : "🔒";
      slot.querySelector('.slot-desc').innerText = i === 0 ? "Pending mortal desire..." : "Locked";
    });

    // Reset Lamp
    DOM.rubMeterFill.style.width = '0%';
    DOM.rubHintText.innerText = '0% AWAKENED';
    DOM.magicLampSvg.style.filter = '';
    DOM.lampContainer.style.pointerEvents = 'all';

    DOM.lampStage.classList.remove('hidden');
    DOM.lampStage.classList.add('active');

    GenieCharacter.setMood('PATIENT');
  }
}

const GenieAI = new GenieBrain();

/* ==========================================================================
   6. SPEECH RECOGNITION (VOICE INPUT ENGINE)
   ========================================================================== */
class VoiceRecognitionEngine {
  constructor() {
    this.recognition = null;
    this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if (this.supported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        AppState.isRecording = true;
        DOM.micBtn.classList.add('recording');
        DOM.userInput.placeholder = "Listening to your voice...";
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        DOM.userInput.value = transcript;
        GenieAI.processUserInput(transcript);
      };

      this.recognition.onerror = () => {
        this.stop();
        GenieCharacter.speak("Apparently your microphone has chosen violence. Type your wish instead, mortal!");
      };

      this.recognition.onend = () => {
        this.stop();
      };
    }
  }

  toggle() {
    if (!this.supported) {
      alert("Microphone speech recognition is not supported in this browser. Please type your wishes!");
      return;
    }
    if (AppState.isRecording) {
      this.stop();
    } else {
      AudioSys.ensureUnlocked();
      try {
        this.recognition.start();
      } catch (e) {
        this.stop();
      }
    }
  }

  stop() {
    AppState.isRecording = false;
    DOM.micBtn.classList.remove('recording');
    DOM.userInput.placeholder = "Tell the Genie anything, or ask your wish...";
    try {
      this.recognition.stop();
    } catch (e) {}
  }
}

const SpeechInput = new VoiceRecognitionEngine();

/* ==========================================================================
   7. UI & CONTROLLER EVENT BINDINGS
   ========================================================================== */
function setupUIEventListeners() {
  // Lamp rubbing detector
  new LampRubDetector();

  // Chat submit
  DOM.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    GenieAI.processUserInput(DOM.userInput.value);
  });

  // Mic Button
  DOM.micBtn.addEventListener('click', () => {
    SpeechInput.toggle();
  });

  // Wish confirmation actions
  DOM.btnConfirmWish.addEventListener('click', () => {
    GenieAI.confirmWish();
  });

  DOM.btnCancelWish.addEventListener('click', () => {
    DOM.wishConfirmModal.classList.add('hidden');
    GenieCharacter.setEmotion('annoyed');
    GenieCharacter.speak("Changed your mind? Good. Second thoughts preserve lives.");
  });

  DOM.statsCloseBtn.addEventListener('click', () => {
    DOM.statsCard.classList.add('hidden');
  });

  // Sound toggle
  DOM.soundToggleBtn.addEventListener('click', () => {
    AppState.audioEnabled = !AppState.audioEnabled;
    DOM.soundIcon.innerText = AppState.audioEnabled ? '🔊' : '🔇';
    DOM.soundText.innerText = AppState.audioEnabled ? 'SOUND ON' : 'MUTED';
    if (!AppState.audioEnabled) {
      window.speechSynthesis.cancel();
      if (DOM.authorizedMedia) DOM.authorizedMedia.pause();
    }
  });

  // Replay
  DOM.replayBtn.addEventListener('click', () => {
    GenieAI.restartExperience();
  });
}

// Boot up experience on DOM load
window.addEventListener('DOMContentLoaded', () => {
  setupUIEventListeners();
  console.log("✨ Aladdin: The Three Wishes initialized.");
});