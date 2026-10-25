/**
 * Audio Synthesis Engine for "Our Museum"
 * Generates ambient museum soundscapes, gentle piano chords, footsteps, and interaction chimes
 * using Web Audio API (Zero external assets required).
 */

class MuseumAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingAmbient = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.timer = null;
    this.isMoving = false;
    this.lastStepTime = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    this.startAmbient();
  }

  toggleMute() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  startAmbient() {
    if (!this.ctx || this.isPlayingAmbient) return;
    this.isPlayingAmbient = true;

    // Ambient Museum Warm Drone (soft low resonant frequencies simulating quiet gallery acoustics)
    const baseFreqs = [110, 164.81, 220, 329.63]; // A2, E3, A3, E4 chord
    baseFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04 / (idx + 1), this.ctx.currentTime);

      // Subtle LFO modulation for organic breath
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.1 + idx * 0.05, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
      lfo.connect(osc.frequency);
      lfo.start();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();
    });

    // Gentle distant ambient chime loop
    this.playPeriodicChimes();
  }

  playPeriodicChimes() {
    if (!this.ctx) return;
    const notes = [440, 523.25, 587.33, 659.25, 783.99, 880]; // A4, C5, D5, E5, G5, A5
    const scheduleNext = () => {
      if (this.isMuted || !this.ctx) {
        this.timer = setTimeout(scheduleNext, 8000);
        return;
      }
      const note = notes[Math.floor(Math.random() * notes.length)];
      this.playSoftBell(note, 0.12, 3.5);

      // Schedule next chime between 6 to 14 seconds
      const delay = 6000 + Math.random() * 8000;
      this.timer = setTimeout(scheduleNext, delay);
    };
    scheduleNext();
  }

  playSoftBell(freq, volume = 0.15, duration = 3.0) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    } catch (e) {}
  }

  // Footstep on polished museum floor
  playFootstep() {
    if (!this.ctx || this.isMuted) return;
    const now = performance.now();
    if (now - this.lastStepTime < 340) return;
    this.lastStepTime = now;

    try {
      const ctxNow = this.ctx.currentTime;
      // Soft high tap + low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95 + Math.random() * 20, ctxNow);
      osc.frequency.exponentialRampToValueAtTime(40, ctxNow + 0.09);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, ctxNow);

      gain.gain.setValueAtTime(0.12, ctxNow);
      gain.gain.exponentialRampToValueAtTime(0.001, ctxNow + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(ctxNow);
      osc.stop(ctxNow + 0.1);
    } catch (e) {}
  }

  // Inspection zoom-in chime
  playInspect() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.06);

        gain.gain.setValueAtTime(0.001, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.06 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 1.3);
      });
    } catch (e) {}
  }

  // Sit down / interact chime
  playInteract() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  }

  // Emote reaction chime (sparkling upward arpeggio)
  playEmote() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const arpeggio = [659.25, 783.99, 987.77, 1318.51];
      arpeggio.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.7);
      });
    } catch (e) {}
  }
}

window.museumAudio = new MuseumAudio();
