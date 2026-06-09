// BarAnalyser.ts
import {endlnr} from "@renderer/components/addons/HOC"

export class BarAnalyser {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private animationId: number | null = null;
  private volumeAvg: number = 1;
  private bassAvg: number = 1;
  private highestAvg: number = 1;
  private barsAvg: number[] | null = null;

  // beat detection
  private lastBass: number = 0;
  private beatCooldown: number = 0;

  constructor(audioCtx: AudioContext, source: AudioNode, fftSize = 256) {
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0.8;

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    source.connect(this.analyser);
  }

  start(name = "analyser") {
    const tick = () => {
      this.analyser.getByteFrequencyData(this.dataArray as any);

      const bars = Array.from(this.dataArray);

      const average = bars.reduce((sum, v) => sum + v, 0) / bars.length;
      const highest = Math.max(...bars);

      const bassSlice = bars.slice(0, Math.floor(bars.length * 0.1));
      const bass      = bassSlice.reduce((sum, v) => sum + v, 0) / bassSlice.length;

      // rolling averages
      this.volumeAvg  = this.volumeAvg  * 0.95 + average * 0.05;
      this.bassAvg    = this.bassAvg    * 0.95 + bass    * 0.05;
      this.highestAvg = this.highestAvg * 0.95 + highest * 0.05;

      if (!this.barsAvg) this.barsAvg = new Array(bars.length).fill(1);
      this.barsAvg = this.barsAvg.map((avg, i) => avg * 0.95 + bars[i] * 0.05);

      const normalize = (value: number, avg: number): number =>
        avg > 0 ? Math.min(255, Math.max(0, (value / avg) * 128)) : 0;

      const normalizedAverage = normalize(average, this.volumeAvg);
      const normalizedBass    = normalize(bass,    this.bassAvg);
      const normalizedHighest = normalize(highest, this.highestAvg);
      const normalizedBars    = bars.map((v, i) => normalize(v, this.barsAvg![i]));

      // --- beat detection ---
      const delta = bass - this.lastBass;          // how sharply bass jumped
      this.lastBass = bass;
      this.beatCooldown = Math.max(0, this.beatCooldown - 1);

      const isBeat =
        delta > 6 &&             // was 20 — catches softer transients
        normalizedBass > 113 &&  // was 140 — just above average (128)
        this.beatCooldown === 0;   // not too soon after last beat

      if (isBeat) {
        this.beatCooldown = 6;       // ~8 frames cooldown (~133ms at 60fps)
        endlnr.emit(`${name}.beat`, {
          strength: Math.min(255, Math.max(0, normalizedBass)), // 0–255
          delta,                                                 // raw spike size
        });
      }

      // raw
      endlnr.emit(`${name}.bars`,    { bars });
      endlnr.emit(`${name}.average`, { average });
      endlnr.emit(`${name}.highest`, { highest });
      endlnr.emit(`${name}.bass`,    { bass });

      // normalized
      endlnr.emit(`${name}.bars.norm`,    { bars: normalizedBars });
      endlnr.emit(`${name}.average.norm`, { average: normalizedAverage });
      endlnr.emit(`${name}.highest.norm`, { highest: normalizedHighest });
      endlnr.emit(`${name}.bass.norm`,    { bass: normalizedBass });

      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  connect(destination: AudioNode) {
    this.analyser.connect(destination);
  }
}