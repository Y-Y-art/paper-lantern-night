export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private drone: GainNode | null = null;
  muted = false;
  private started = false;

  async resume() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.started) {
      this.started = true;
      this.startBeds();
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.04);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private startBeds() {
    const ctx = this.ctx!;
    const master = this.master!;

    // pink-ish wind
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.668 * b2 + white * 1.052691;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0.08;
    noise.connect(filter);
    filter.connect(this.wind);
    this.wind.connect(master);
    noise.start();

    // low drone
    this.drone = ctx.createGain();
    this.drone.gain.value = 0.03;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 92;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 138;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    osc.connect(this.drone);
    osc2.connect(g2);
    g2.connect(this.drone);
    this.drone.connect(master);
    osc.start();
    osc2.start();
  }

  setWind(amount: number) {
    if (!this.wind || !this.ctx) return;
    this.wind.gain.setTargetAtTime(0.06 + amount * 0.12, this.ctx.currentTime, 0.2);
  }

  burst() {
    this.blip(180, 0.12, 0.18, 'sine');
    this.noiseBurst(0.08, 400, 0.12);
  }

  collect() {
    this.blip(880, 0.07, 0.12, 'sine');
    this.blip(1320, 0.06, 0.16, 'triangle');
  }

  gate() {
    this.blip(520, 0.06, 0.1, 'triangle');
    this.blip(780, 0.05, 0.14, 'sine');
  }

  firework() {
    this.noiseBurst(0.16, 900, 0.28);
    this.blip(220, 0.1, 0.12, 'square');
  }

  crash() {
    this.noiseBurst(0.28, 300, 0.45);
    this.blip(90, 0.25, 0.3, 'sawtooth');
  }

  private blip(freq: number, dur: number, vol: number, type: OscillatorType) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(vol: number, cutoff: number, dur: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }
}
