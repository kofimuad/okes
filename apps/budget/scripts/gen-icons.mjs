// Generates the Okes app icons from SVG. Run: node apps/budget/scripts/gen-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");

// The "O orbit" mark, centred in a 1024 box.
const mark = `
  <g transform="rotate(-28 512 512)">
    <ellipse cx="512" cy="512" rx="384" ry="150" fill="none" stroke="#9788c9" stroke-width="14"/>
  </g>
  <circle cx="512" cy="512" r="230" fill="none" stroke="url(#ring)" stroke-width="86" stroke-linecap="round"/>
  <g transform="rotate(-28 512 512)">
    <circle cx="896" cy="512" r="40" fill="#7fe9ff"/>
  </g>
`;

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#232b40"/>
      <stop offset="0.6" stop-color="#15171f"/>
      <stop offset="1" stop-color="#0d0f14"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="44%" r="52%">
      <stop offset="0" stop-color="#58bab8" stop-opacity="0.40"/>
      <stop offset="1" stop-color="#58bab8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7fe9ff"/>
      <stop offset="1" stop-color="#58bab8"/>
    </linearGradient>
  </defs>
`;

const full = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  ${mark}
</svg>`;

// Transparent, mark scaled into the Android adaptive-icon safe zone.
const foreground = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <g transform="translate(512,512) scale(0.7) translate(-512,-512)">${mark}</g>
</svg>`;

const render = (svg, file, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, file));

await Promise.all([
  render(full, "icon.png", 1024),
  render(foreground, "android-icon-foreground.png", 1024),
  render(foreground, "splash-icon.png", 1024),
  render(full, "favicon.png", 48),
]);

console.log("✅ icons written to", OUT);
