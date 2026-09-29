/* ========================================================
   ECOSHIFT — SISTEMA DE ÁUDIO PROCEDURAL (Web Audio API)
   Efeitos sonoros e trilha sonora adaptativa sem dependências externas.
   100% autônomo, offline e leve.
   ======================================================== */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.currentWorld = 'polluted'; // 'polluted' ou 'sustainable'
    this.ambientInterval = null;
    this.isInitialized = false;

    // Carregar preferência salva
    const saved = localStorage.getItem('ecoshift_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  // Inicializa o contexto de áudio após interação do usuário (exigência dos navegadores)
  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Ambient Music Gain
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.isInitialized = true;
      this.startAmbientMusic();
    } catch (e) {
      console.warn('Web Audio API não suportada ou bloqueada:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('ecoshift_muted', this.isMuted.toString());

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  setWorld(world) {
    this.currentWorld = world;
  }

  // ==========================================
  // EFEITOS SONOROS (SFX)
  // ==========================================

  playJump() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.16);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  playShift() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Camada 1: Sweep dimensional (Whoosh ressonante)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'triangle';
    filter.type = 'bandpass';
    filter.Q.value = 3;

    if (this.currentWorld === 'sustainable') {
      // Entrando no Sustentável: tom ascendente, brilhante
      osc1.frequency.setValueAtTime(180, t);
      osc1.frequency.exponentialRampToValueAtTime(560, t + 0.35);
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    } else {
      // Entrando no Poluído: tom descendente, mais denso
      osc1.frequency.setValueAtTime(420, t);
      osc1.frequency.exponentialRampToValueAtTime(140, t + 0.35);
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(220, t + 0.35);
    }

    gain1.gain.setValueAtTime(0.45, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.sfxGain);

    osc1.start(t);
    osc1.stop(t + 0.36);

    // Camada 2: Pequeno sino cristalino
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(this.currentWorld === 'sustainable' ? 659.25 : 329.63, t); // E5 ou E4
    gain2.gain.setValueAtTime(0.25, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc2.start(t);
    osc2.stop(t + 0.29);
  }

  playCollect() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Arpeggio brilhante de 3 notas
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(0.3, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.23);
    });
  }

  playClick() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playInteract() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Hum de energia sustentável
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  playHurt() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  playLevelComplete() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Fanfarra alegre e suave (C-E-G-C-E)
    const chord = [261.63, 329.63, 392.00, 523.25, 659.25];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === chord.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      const dur = idx === chord.length - 1 ? 0.6 : 0.25;
      gain.gain.setValueAtTime(0.35, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + dur);
    });
  }

  playVictory() {
    if (!this.isInitialized || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Grande fanfarra de finalização
    const melody = [
      { f: 392.00, d: 0.18 }, // G4
      { f: 523.25, d: 0.18 }, // C5
      { f: 659.25, d: 0.22 }, // E5
      { f: 783.99, d: 0.28 }, // G5
      { f: 659.25, d: 0.18 }, // E5
      { f: 783.99, d: 0.18 }, // G5
      { f: 1046.50, d: 0.8 }  // C6
    ];

    let offset = 0;
    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t + offset);

      gain.gain.setValueAtTime(0.4, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + offset);
      osc.stop(t + offset + note.d);

      offset += note.d * 0.85;
    });
  }

  // ==========================================
  // TRILHA AMBIENTE PROCESSUAL (Sutil e contínua)
  // ==========================================

  startAmbientMusic() {
    if (this.ambientInterval) clearInterval(this.ambientInterval);

    let step = 0;
    // Escalas musicais sutis:
    // Poluído: modo menor/dórico mais fechado, notas graves espaçadas
    const pollutedNotes = [110, 130.81, 146.83, 164.81, 196.00]; // A2, C3, D3, E3, G3
    // Sustentável: pentatônica maior brilhante e quente
    const sustNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4, D4, E4, G4, A4, C5

    this.ambientInterval = setInterval(() => {
      if (!this.isInitialized || this.isMuted || !this.ctx) return;
      if (this.ctx.state === 'suspended') return;

      const t = this.ctx.currentTime;
      const isSust = this.currentWorld === 'sustainable';

      const pool = isSust ? sustNotes : pollutedNotes;
      const freq = pool[Math.floor(Math.random() * pool.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = isSust ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isSust ? 800 : 350, t);

      const duration = isSust ? 1.8 : 2.5;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(isSust ? 0.08 : 0.06, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(t);
      osc.stop(t + duration);

      step++;
    }, 1200);
  }
}

// Instância global de áudio
const audioManager = new AudioManager();
