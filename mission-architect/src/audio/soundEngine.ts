/**
 * Procedural Web Audio synthesizer for Mission Architect (Phase 10).
 *
 * Uses zero external audio files or paid APIs: all ambient pads and SFX are
 * synthesized locally via Web Audio API with separate music/SFX buses and
 * automatic music ducking under alarms and fanfare.
 */

export type MusicMode = 'silent' | 'menu' | 'cruise' | 'tension' | 'success' | 'failure';

export type SfxKind =
  | 'tick'
  | 'snap'
  | 'countdown'
  | 'countdownFinal'
  | 'ignition'
  | 'stageSep'
  | 'alarm'
  | 'downlink'
  | 'fanfare';

const CUE_CAPTIONS: Partial<Record<SfxKind, string>> = {
  countdown: 'Countdown beep',
  countdownFinal: 'Liftoff tone',
  ignition: 'Main engine ignition roar',
  stageSep: 'Stage separation charge',
  alarm: 'Telemetry warning alarm',
  downlink: 'Deep-space downlink chirp',
  fanfare: 'Mission success fanfare',
};

type CueListener = (caption: string) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private musicOscs: OscillatorNode[] = [];
  private musicSubGain: GainNode | null = null;
  private currentMode: MusicMode = 'silent';

  private musicVolume = 0.45;
  private sfxVolume = 0.7;
  private muted = false;
  private duckTimer: number | null = null;
  private cueListeners = new Set<CueListener>();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      try {
        this.ctx = new AudioCtor();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        // Subtle orbital echo bus for atmospheric depth
        const echoDelay = this.ctx.createDelay(1.0);
        echoDelay.delayTime.value = 0.34;
        const echoFeedback = this.ctx.createGain();
        echoFeedback.gain.value = 0.26;
        const echoFilter = this.ctx.createBiquadFilter();
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 1200;
        const echoWet = this.ctx.createGain();
        echoWet.gain.value = 0.22;

        echoDelay.connect(echoFilter);
        echoFilter.connect(echoFeedback);
        echoFeedback.connect(echoDelay);
        echoFilter.connect(echoWet);
        echoWet.connect(this.masterGain);

        this.musicGain.connect(this.masterGain);
        this.musicGain.connect(echoDelay);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.applyVolumes();
      } catch {
        this.ctx = null;
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Must be called from a user gesture to unlock Web Audio in browsers. */
  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.currentMode !== 'silent' && this.musicOscs.length === 0) {
      this.startMusicLoop(this.currentMode);
    }
  }

  public configure(opts: { musicVolume: number; sfxVolume: number; muted: boolean }): void {
    this.musicVolume = Math.max(0, Math.min(1, opts.musicVolume));
    this.sfxVolume = Math.max(0, Math.min(1, opts.sfxVolume));
    this.muted = opts.muted;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.25, now, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.5, now, 0.03);
  }

  public onCue(listener: CueListener): () => void {
    this.cueListeners.add(listener);
    return () => {
      this.cueListeners.delete(listener);
    };
  }

  private emitCue(kind: SfxKind): void {
    const caption = CUE_CAPTIONS[kind];
    if (!caption) return;
    for (const listener of this.cueListeners) {
      listener(caption);
    }
  }

  public setMusicMode(mode: MusicMode): void {
    if (this.currentMode === mode && this.musicOscs.length > 0) return;
    this.currentMode = mode;
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.startMusicLoop(mode);
  }

  private stopMusicLoop(): void {
    for (const osc of this.musicOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    }
    this.musicOscs = [];
    if (this.musicSubGain) {
      try {
        this.musicSubGain.disconnect();
      } catch {
        // Ignore
      }
      this.musicSubGain = null;
    }
  }

  private startMusicLoop(mode: MusicMode): void {
    const ctx = this.ctx;
    const musicGain = this.musicGain;
    if (!ctx || !musicGain) return;

    this.stopMusicLoop();
    if (mode === 'silent') return;

    const freqsByMode: Record<Exclude<MusicMode, 'silent'>, number[]> = {
      menu: [110, 164.81, 220, 277.18], // Warm A major pad
      cruise: [98, 146.83, 196, 246.94], // Open G sus/maj space pad
      tension: [82.41, 110, 123.47, 155.56], // Low tense E-based cluster
      success: [130.81, 196, 246.94, 329.63], // Resolving Cmaj7 pad
      failure: [92.5, 110, 138.59], // Somber F#m drone
    };

    const freqs = freqsByMode[mode];
    const subGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mode === 'tension' ? 520 : 420;
    filter.Q.value = 0.8;

    const now = ctx.currentTime;
    // Gentle LFO breathing on the pad filter cutoff
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = mode === 'tension' ? 0.32 : 0.11;
    lfoGain.gain.value = mode === 'tension' ? 160 : 120;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    this.musicOscs.push(lfo);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.45, now + 1.4);

    filter.connect(subGain);
    subGain.connect(musicGain);
    this.musicSubGain = subGain;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 4;
      osc.connect(filter);
      osc.start(now);
      this.musicOscs.push(osc);
    });
  }

  private duckMusic(durationSec: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.06, now, 0.05);
    if (this.duckTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.duckTimer);
    }
    if (typeof window !== 'undefined') {
      this.duckTimer = window.setTimeout(() => {
        if (!this.ctx || !this.musicGain) return;
        this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.25, this.ctx.currentTime, 0.35);
      }, durationSec * 1000);
    }
  }

  public playSfx(kind: SfxKind): void {
    this.emitCue(kind);
    if (this.muted || this.sfxVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const out = this.sfxGain;

    switch (kind) {
      case 'tick': {
        this.playTone(ctx, out, 880, 620, 0.045, 'sine', 0.18, now);
        break;
      }
      case 'snap': {
        this.playTone(ctx, out, 190, 85, 0.09, 'triangle', 0.45, now);
        this.playTone(ctx, out, 720, 480, 0.035, 'sine', 0.18, now + 0.01);
        break;
      }
      case 'countdown': {
        this.playTone(ctx, out, 660, 660, 0.14, 'sine', 0.32, now);
        break;
      }
      case 'countdownFinal': {
        this.playTone(ctx, out, 990, 990, 0.32, 'sine', 0.4, now);
        break;
      }
      case 'ignition': {
        this.duckMusic(2.2);
        this.playNoiseBurst(ctx, out, 1.8, 340, 0.55, now);
        this.playTone(ctx, out, 68, 42, 1.6, 'sawtooth', 0.25, now);
        break;
      }
      case 'stageSep': {
        this.playTone(ctx, out, 240, 60, 0.18, 'triangle', 0.45, now);
        this.playNoiseBurst(ctx, out, 0.25, 1100, 0.28, now);
        break;
      }
      case 'alarm': {
        this.duckMusic(1.5);
        this.playTone(ctx, out, 740, 740, 0.18, 'square', 0.18, now);
        this.playTone(ctx, out, 540, 540, 0.2, 'square', 0.18, now + 0.22);
        this.playTone(ctx, out, 740, 740, 0.18, 'square', 0.16, now + 0.46);
        break;
      }
      case 'downlink': {
        this.playTone(ctx, out, 1120, 1680, 0.08, 'sine', 0.24, now);
        this.playTone(ctx, out, 1480, 1920, 0.09, 'sine', 0.2, now + 0.09);
        break;
      }
      case 'fanfare': {
        this.duckMusic(2.4);
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          this.playTone(ctx, out, freq, freq, 0.32, 'triangle', 0.28, now + idx * 0.12);
        });
        break;
      }
    }
  }

  private playTone(
    ctx: AudioContext,
    dest: AudioNode,
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    startTime: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playNoiseBurst(
    ctx: AudioContext,
    dest: AudioNode,
    duration: number,
    cutoffHz: number,
    peakGain: number,
    startTime: number,
  ): void {
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < sampleCount; i++) {
      // Deterministic-ish brown-tinted noise via simple LCG so no Math.random() needed
      const white = (((i * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
      last = (last + 0.04 * white) / 1.04;
      channel[i] = last * 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoffHz;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }
}

export const soundEngine = new SoundEngine();
