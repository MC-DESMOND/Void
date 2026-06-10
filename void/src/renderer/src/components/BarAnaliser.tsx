// BarAnalyser.ts
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { endlnr } from "@renderer/components/addons/HOC";

export class BarAnalyser {
  private motion: AudioMotionAnalyzer;

  // rolling averages
  private volumeAvg  = 1;
  private bassAvg    = 1;
  private highestAvg = 1;
  private barsAvg: number[] | null = null;

  // beat detection
  private lastBass     = 0;
  private slowBassAvg  = 1;
  private beatCooldown = 0;
  private beatSensitivity = 1.1;

  constructor(audioCtx: AudioContext, source: AudioNode) {
    this.motion = new AudioMotionAnalyzer(undefined, {
      audioCtx,
      source,
      useCanvas:       false,
      connectSpeakers: false,
      fftSize:         8192,
      smoothing:       0.5,
      start:           true,
      onCanvasDraw:    () => this.tick(),
    });

    // allow external sensitivity control
    endlnr.on("analyser.sensitivity", ({ value }) => {
      this.beatSensitivity = value;
    });
  }

  private tick(name = "analyser") {
    const m = this.motion;

    const bassRaw    = m.getEnergy('bass');
    const midRaw     = m.getEnergy('mid');
    const trebleRaw  = m.getEnergy('treble');
    const overallRaw = m.getEnergy();
    const peakRaw    = m.getEnergy('peak');

    const barsData = m.getBars();
    const bars255  = barsData.map(b => Math.round(b.value[0] * 255));
    const highest  = Math.max(...bars255);
    const average  = bars255.reduce((s, v) => s + v, 0) / bars255.length;
    const bass     = Math.round(bassRaw * 255);

    // rolling averages
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

    // beat detection
    this.slowBassAvg  = this.slowBassAvg * 0.98 + bass * 0.02;
    const delta       = bass - this.lastBass;
    this.lastBass     = bass;
    this.beatCooldown = Math.max(0, this.beatCooldown - 1);

    const isBeat =
      bass > this.slowBassAvg * this.beatSensitivity &&
      delta > 0 &&
      this.beatCooldown === 0;

    if (isBeat) {
      this.beatCooldown = 6;
      endlnr.emit(`${name}.beat`, {
        strength: Math.min(255, Math.max(0, normalizedBass)),
        delta,
      });
    }

    // raw
    endlnr.emit(`${name}.bars`,    { bars: bars255 });
    endlnr.emit(`${name}.average`, { average });
    endlnr.emit(`${name}.highest`, { highest });
    endlnr.emit(`${name}.bass`,    { bass });

    // normalized
    endlnr.emit(`${name}.bars.norm`,    { bars: normalizedBars });
    endlnr.emit(`${name}.average.norm`, { average: normalizedAverage });
    endlnr.emit(`${name}.highest.norm`, { highest: normalizedHighest });
    endlnr.emit(`${name}.bass.norm`,    { bass: normalizedBass });

    // extras
    endlnr.emit(`${name}.mid`,    { mid:    Math.round(midRaw    * 255) });
    endlnr.emit(`${name}.treble`, { treble: Math.round(trebleRaw * 255) });
    endlnr.emit(`${name}.peak`,   { peak:   Math.round(peakRaw   * 255) });
    endlnr.emit(`${name}.overall`,{ overall:Math.round(overallRaw* 255) });
  }

  stop()  { this.motion.stop();  }
  start() { this.motion.start(); }

  connect(destination: AudioNode) {
    this.motion.connectOutput(destination);
  }

  getMotion(): AudioMotionAnalyzer {
    return this.motion;
  }
}