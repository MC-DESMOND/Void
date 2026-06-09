import {  endlnr } from "./addons/HOC";
import {  getCenter } from "./addons/anys";

export function initCirclePulse() {
  const circle = document.getElementById("song-circle") as HTMLElement;
  if (!circle) return;

  const anim = circle.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    { duration: 20000, iterations: Infinity, easing: "linear" }
  );

  endlnr.on("analyser.beat", ({ strength }) => {
    // scale pulse
    circle.style.scale = `${1 + (strength / 255) * 0.5}`;
    setTimeout(() => { circle.style.scale = "1"; }, 100);

    // rotation speedup
    const boost = 1 + (strength / 255) * 255;
    anim.playbackRate = boost;

    setTimeout(() => {
      const steps = 20;
      const stepTime = 600 / steps;
      let step = 0;
      const ease = setInterval(() => {
        step++;
        anim.playbackRate = boost + (1 - boost) * (step / steps);
        if (step >= steps) {
          anim.playbackRate = 1;
          clearInterval(ease);
        }
      }, stepTime);
    }, 100);
  });
}

export default function boxesManipulator() {
  interface Ripple {
    radius: number;
    opacity: number;
    speed: number;
  }

  const ripples: Ripple[] = [];
endlnr.on("analyser.beat", ({ strength }) => {
  ripples.push({
    radius: 10,
    opacity: (strength / 255) * 0.8,
    speed: 3 + (strength / 255) * 6,
  });
  const circle = document.getElementById("app") as HTMLElement;
  if (!circle) return;
   circle.style.scale = `${1 + (strength / 255) * 0.1}`;
    setTimeout(() => { circle.style.scale = "1"; }, 100);
});


function animate() {
  const boxes = document.querySelector(".boxes-glow") as HTMLElement;
  if (!boxes) { requestAnimationFrame(animate); return; }

  // read color from CSS variable
  const color = getComputedStyle(boxes)
  .getPropertyValue("--ripple-color")
  .trim() || "rgb(255, 255, 255)";

// use color-mix to control opacity via a second argument
    const withOpacity = (opacity: number) =>
  `color-mix(in srgb, ${color} ${(opacity * 100).toFixed(1)}%, transparent)`;

  for (const r of ripples) {
    r.radius  += r.speed;
    r.opacity -= 0.002;
  }

    const alive = ripples.filter(r => r.opacity > 0 && r.radius < window.innerWidth);
  ripples.length = 0;
  ripples.push(...alive);

  if (ripples.length === 0) {
    boxes.style.background = "transparent";
  } else {
    boxes.style.background = ripples
    .map(r => {
        const width = 30;
        const inner = Math.max(0, r.radius - width);
        const outer = r.radius + width;
        const center = getCenter(".song-circle");
        const percentX = (center.x / window.innerWidth) * 100;
        const percentY = (center.y / window.innerHeight) * 100;
        return `radial-gradient(circle at ${percentX}% ${percentY}%, transparent ${inner}px, ${withOpacity(r.opacity)} ${r.radius}px, transparent ${outer}px)`;
    })
    .join(", ");
  }

  requestAnimationFrame(animate);
}
  animate();
}