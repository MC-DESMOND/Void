// BarAnalyser.ts
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { endlnr } from "@renderer/components/addons/HOC";

export class BarAnalyser {
  private motion: AudioMotionAnalyzer;

  // rolling averages for normalization
  private volumeAvg  = 1;
  private bassAvg    = 1;
  private highestAvg = 1;
  private barsAvg: number[] | null = null;

  // beat detection
  private lastBass     = 0;
  private slowBassAvg  = 1;
  private beatCooldown = 0;

  constructor(audioCtx: AudioContext, source: AudioNode) {
    this.motion = new AudioMotionAnalyzer(undefined, {
      audioCtx,
      source,
      useCanvas:        false, // we handle visuals ourselves
      connectSpeakers:  false, // AudioController already connects to destination
      fftSize:          8192,  // high resolution
      smoothing:        0.5,
      start:            true,
      onCanvasDraw:     () => this.tick(),
    });
  }

  private tick(name = "analyser") {
    const m = this.motion;

    // --- energy presets (0–1) from audioMotion ---
    const bassRaw    = m.getEnergy('bass');
    const midRaw     = m.getEnergy('mid');
    const trebleRaw  = m.getEnergy('treble');
    // const overallRaw = m.getEnergy();
    const peakRaw    = m.getEnergy('peak');

    // --- bars (0–1 each) ---
    const barsData   = m.getBars();
    const bars255    = barsData.map(b => Math.round(b.value[0] * 255));
    const highest    = Math.max(...bars255);
    const average    = bars255.reduce((s, v) => s + v, 0) / bars255.length;
    const bass       = Math.round(bassRaw * 255);

    // --- rolling averages ---
    this.volumeAvg  = this.volumeAvg  * 0.95 + average * 0.05;
    this.bassAvg    = this.bassAvg    * 0.95 + bass    * 0.05;
    this.highestAvg = this.highestAvg * 0.95 + highest * 0.05;

    if (!this.barsAvg) this.barsAvg = new Array(bars255.length).fill(1);
    this.barsAvg = this.barsAvg.map((avg, i) => avg * 0.95 + bars255[i] * 0.05);

    const normalize = (value: number, avg: number): number =>
      avg > 0 ? Math.min(255, Math.max(0, (value / avg) * 128)) : 0;

    const normalizedAverage = normalize(average, this.volumeAvg);
    const normalizedBass    = normalize(bass,    this.bassAvg);
    const normalizedHighest = normalize(highest, this.highestAvg);
    const normalizedBars    = bars255.map((v, i) => normalize(v, this.barsAvg![i]));

    // --- beat detection ---
    // slow baseline tracks the floor between beats
    this.slowBassAvg = this.slowBassAvg * 0.98 + bass * 0.02;
    const delta  = bass - this.lastBass;
    this.lastBass = bass;
    this.beatCooldown = Math.max(0, this.beatCooldown - 1);

    const isBeat =
      bass > this.slowBassAvg * 1.1 &&  // above local baseline
      delta > 0 &&                        // moving up
      this.beatCooldown === 0;

    if (isBeat) {
      this.beatCooldown = 6;
      endlnr.emit(`${name}.beat`, {
        strength: Math.min(255, Math.max(0, normalizedBass)),
        delta,
      });
    }

    // --- raw ---
    endlnr.emit(`${name}.bars`,    { bars: bars255 });
    endlnr.emit(`${name}.average`, { average });
    endlnr.emit(`${name}.highest`, { highest });
    endlnr.emit(`${name}.bass`,    { bass });

    // --- normalized ---
    endlnr.emit(`${name}.bars.norm`,    { bars: normalizedBars });
    endlnr.emit(`${name}.average.norm`, { average: normalizedAverage });
    endlnr.emit(`${name}.highest.norm`, { highest: normalizedHighest });
    endlnr.emit(`${name}.bass.norm`,    { bass: normalizedBass });

    // --- audioMotion extras (0–255) ---
    endlnr.emit(`${name}.mid`,    { mid:    Math.round(midRaw    * 255) });
    endlnr.emit(`${name}.treble`, { treble: Math.round(trebleRaw * 255) });
    endlnr.emit(`${name}.peak`,   { peak:   Math.round(peakRaw   * 255) });
  }

  stop() {
    this.motion.stop();
  }
  connect(destination: AudioNode) {
    this.motion.connectOutput(destination);
  }

  start() {
    this.motion.start();
  }

  /** expose for wiring to AudioController if needed */
  getMotion(): AudioMotionAnalyzer {
    return this.motion;
  }
}