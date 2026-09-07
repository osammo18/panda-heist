/* ============================================================
   Panda Heist — Audio
   Small procedural WebAudio synth engine (no external sound files).
   ============================================================ */
(function (PH) {
  'use strict';

  const Audio = {
    ctx: null,
    muted: false,
    masterGain: null,
    _ambientNodes: null,

    init() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.55;
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('Audio unavailable', e);
      }
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMuted(m) {
      this.muted = m;
      if (this.masterGain) this.masterGain.gain.value = m ? 0 : 0.55;
    },

    _tone(freq, dur, opts) {
      if (!this.ctx) return;
      opts = opts || {};
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
      }
      const vol = opts.vol != null ? opts.vol : 0.25;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },

    _noise(dur, opts) {
      if (!this.ctx) return;
      opts = opts || {};
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = opts.filterType || 'bandpass';
      filter.frequency.value = opts.filterFreq || 1200;
      const gain = this.ctx.createGain();
      gain.gain.value = opts.vol != null ? opts.vol : 0.3;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(t0);
    },

    play(name) {
      if (!this.ctx) return;
      switch (name) {
        case 'collect':
          this._tone(880, 0.08, { type: 'triangle', vol: 0.22 });
          this._tone(1320, 0.12, { type: 'triangle', vol: 0.18, delay: 0.05 });
          break;
        case 'jackpot':
          [660, 880, 1100, 1320].forEach((f, i) => this._tone(f, 0.18, { type: 'square', vol: 0.18, delay: i * 0.07 }));
          break;
        case 'step':
          this._noise(0.04, { filterType: 'lowpass', filterFreq: 300, vol: 0.06 });
          break;
        case 'alert':
          this._tone(220, 0.2, { type: 'sawtooth', vol: 0.25, slideTo: 440 });
          break;
        case 'caught':
          this._tone(300, 0.35, { type: 'sawtooth', vol: 0.3, slideTo: 80 });
          this._noise(0.3, { filterType: 'lowpass', filterFreq: 600, vol: 0.2, delay: 0.05 });
          break;
        case 'ability':
          this._tone(520, 0.09, { type: 'square', vol: 0.2 });
          this._tone(780, 0.12, { type: 'square', vol: 0.16, delay: 0.06 });
          break;
        case 'hack-tick':
          this._tone(700, 0.04, { type: 'square', vol: 0.12 });
          break;
        case 'hack-success':
          [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.14, { type: 'triangle', vol: 0.22, delay: i * 0.06 }));
          break;
        case 'hack-fail':
          this._tone(200, 0.3, { type: 'sawtooth', vol: 0.25, slideTo: 60 });
          break;
        case 'ui-click':
          this._tone(440, 0.05, { type: 'square', vol: 0.15 });
          break;
        case 'win':
          [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.2, { type: 'triangle', vol: 0.25, delay: i * 0.09 }));
          break;
        case 'lose':
          [400, 340, 260, 180].forEach((f, i) => this._tone(f, 0.25, { type: 'sawtooth', vol: 0.22, delay: i * 0.12 }));
          break;
        case 'star':
          this._tone(1046, 0.15, { type: 'triangle', vol: 0.2 });
          break;
        case 'distract':
          this._tone(950, 0.1, { type: 'sine', vol: 0.18, slideTo: 300 });
          break;
      }
    }
  };

  PH.Audio = Audio;
})(window.PH = window.PH || {});
