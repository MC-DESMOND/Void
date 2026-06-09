import { enddata, endlnr } from "./addons/HOC";

export default function boxesManipulator() {
  interface Ripple {
    radius: number;
    opacity: number;
    speed: number;
  }

  const ripples: Ripple[] = [];

  // spawn a ripple on each bass hit
endlnr.on("analyser.beat", ({ strength }) => {
  ripples.push({
    radius: 10,
    opacity: (strength / 255) * 0.8,
    speed: 3 + (strength / 255) * 6,
  });
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
        return `radial-gradient(circle at 50% 100%, transparent ${inner}px, ${withOpacity(r.opacity)} ${r.radius}px, transparent ${outer}px)`;
    })
    .join(", ");
  }

  requestAnimationFrame(animate);
}
  animate();
}