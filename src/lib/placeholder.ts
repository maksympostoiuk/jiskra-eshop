/**
 * Generated, neutral product placeholder illustrations (flat SVG device silhouettes).
 * Served by src/app/ph/[...slug]/route.ts as /ph/<kind>/<hex>/<view>.svg — no binary assets in the repo.
 */

export const PLACEHOLDER_KINDS = [
  "phone",
  "tablet",
  "laptop",
  "monitor",
  "tv",
  "streamer",
  "headphones",
  "earbuds",
  "speaker",
  "watch",
  "band",
  "console",
  "controller",
  "gpu",
  "ssd",
  "charger",
  "powerbank",
  "keyboard",
  "mouse",
  "banner",
] as const;
export type PlaceholderKind = (typeof PLACEHOLDER_KINDS)[number];

export function placeholderUrl(kind: PlaceholderKind, hex: string, view = 1): string {
  return `/ph/${kind}/${hex.replace("#", "").toLowerCase()}/${view}.svg`;
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number) => clamp(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

type Palette = { body: string; edge: string; light: string; dark: string; screen: string; bg: string };

function palette(hex: string): Palette {
  const lum = luminance(hex);
  return {
    body: `#${hex}`,
    edge: lum > 0.75 ? shade(hex, -0.28) : shade(hex, -0.35),
    light: shade(hex, 0.25),
    dark: shade(hex, -0.45),
    screen: "url(#screen)",
    bg: lum > 0.85 ? "#ece6dc" : "#f3eee6",
  };
}

const SCREEN_GRADIENT = `<linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d3b45"/><stop offset=".55" stop-color="#1c2a33"/><stop offset="1" stop-color="#3f5560"/></linearGradient><linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fb7b0" stop-opacity=".55"/><stop offset="1" stop-color="#e3992c" stop-opacity=".35"/></linearGradient>`;

function screenArt(x: number, y: number, w: number, h: number, r = 12): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#screen)"/><path d="M${x} ${y + h * 0.7} Q ${x + w * 0.45} ${y + h * 0.35} ${x + w} ${y + h * 0.55} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} Z" fill="url(#glow)"/>`;
}

function drawFront(kind: PlaceholderKind, p: Palette, view: number): string {
  const s = `stroke="${p.edge}" stroke-width="4"`;
  switch (kind) {
    case "phone":
      if (view === 2)
        return `<rect x="270" y="140" width="260" height="520" rx="44" fill="${p.body}" ${s}/><rect x="298" y="170" width="120" height="150" rx="34" fill="${p.dark}"/><circle cx="336" cy="210" r="24" fill="#1b1f24" stroke="${p.light}" stroke-width="5"/><circle cx="380" cy="272" r="24" fill="#1b1f24" stroke="${p.light}" stroke-width="5"/><circle cx="336" cy="272" r="9" fill="${p.light}"/>`;
      return `<rect x="270" y="140" width="260" height="520" rx="44" fill="${p.body}" ${s}/>${screenArt(286, 158, 228, 484, 32)}<rect x="370" y="172" width="60" height="16" rx="8" fill="#0d1216"/>`;
    case "tablet":
      return `<rect x="190" y="130" width="420" height="560" rx="38" fill="${p.body}" ${s}/>${screenArt(214, 154, 372, 512, 20)}`;
    case "laptop":
      return `<rect x="170" y="190" width="460" height="300" rx="18" fill="${p.body}" ${s}/>${screenArt(188, 208, 424, 262, 6)}<path d="M120 500 H680 L650 548 Q646 556 636 556 H164 Q154 556 150 548 Z" fill="${p.light}" ${s}/><rect x="350" y="502" width="100" height="10" rx="5" fill="${p.edge}"/>`;
    case "monitor":
      return `<rect x="130" y="160" width="540" height="330" rx="14" fill="${p.body}" ${s}/>${screenArt(146, 176, 508, 290, 4)}<path d="M370 490 h60 l20 120 h-100 z" fill="${p.light}" ${s}/><rect x="290" y="606" width="220" height="22" rx="11" fill="${p.body}" ${s}/>`;
    case "tv":
      return `<rect x="80" y="190" width="640" height="370" rx="10" fill="${p.body}" ${s}/>${screenArt(92, 202, 616, 346, 3)}<path d="M200 560 l-30 60 h24 l30 -60 z M600 560 l30 60 h-24 l-30 -60 z" fill="${p.edge}"/>`;
    case "streamer":
      return `<rect x="200" y="380" width="260" height="110" rx="40" fill="${p.body}" ${s}/><circle cx="330" cy="435" r="10" fill="${p.light}"/><rect x="520" y="230" width="90" height="360" rx="45" fill="${p.dark}" ${s}/><circle cx="565" cy="300" r="26" fill="${p.light}"/><circle cx="565" cy="380" r="10" fill="${p.light}"/><circle cx="565" cy="420" r="10" fill="${p.light}"/>`;
    case "headphones":
      return `<path d="M230 470 V380 Q230 190 400 190 Q570 190 570 380 V470" fill="none" stroke="${p.body}" stroke-width="34" stroke-linecap="round"/><path d="M230 470 V380 Q230 190 400 190 Q570 190 570 380 V470" fill="none" stroke="${p.edge}" stroke-width="4" stroke-linecap="round" opacity=".5"/><rect x="180" y="400" width="110" height="190" rx="52" fill="${p.body}" ${s}/><rect x="510" y="400" width="110" height="190" rx="52" fill="${p.body}" ${s}/><rect x="270" y="430" width="30" height="130" rx="14" fill="${p.dark}"/><rect x="500" y="430" width="30" height="130" rx="14" fill="${p.dark}"/>`;
    case "earbuds":
      return `<rect x="230" y="330" width="340" height="250" rx="110" fill="${p.body}" ${s}/><line x1="240" y1="430" x2="560" y2="430" stroke="${p.edge}" stroke-width="4"/><circle cx="400" cy="480" r="9" fill="#e3992c"/><g transform="translate(250 170)"><ellipse cx="60" cy="60" rx="56" ry="50" fill="${p.body}" ${s}/><rect x="40" y="90" width="38" height="90" rx="19" fill="${p.body}" ${s}/></g><g transform="translate(420 170)"><ellipse cx="60" cy="60" rx="56" ry="50" fill="${p.body}" ${s}/><rect x="42" y="90" width="38" height="90" rx="19" fill="${p.body}" ${s}/></g>`;
    case "speaker":
      return `<rect x="290" y="150" width="220" height="500" rx="100" fill="${p.body}" ${s}/>${Array.from({ length: 9 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<circle cx="${330 + c * 35}" cy="${230 + r * 40}" r="7" fill="${p.dark}" opacity=".55"/>`).join("")).join("")}<rect x="360" y="600" width="80" height="12" rx="6" fill="${p.light}"/>`;
    case "watch":
      return `<rect x="335" y="110" width="130" height="580" rx="40" fill="${p.dark}"/><rect x="270" y="250" width="260" height="300" rx="70" fill="${p.body}" ${s}/>${screenArt(292, 272, 216, 256, 52)}<rect x="528" y="350" width="18" height="60" rx="8" fill="${p.edge}"/>`;
    case "band":
      return `<rect x="355" y="120" width="90" height="560" rx="45" fill="${p.body}" ${s}/>${screenArt(365, 300, 70, 200, 30)}`;
    case "console":
      return `<path d="M250 160 h300 q20 0 20 20 v440 q0 20 -20 20 h-300 q-20 0 -20 -20 v-440 q0 -20 20 -20z" fill="${p.body}" ${s}/><rect x="380" y="160" width="40" height="480" fill="${p.dark}" opacity=".85"/><rect x="270" y="590" width="80" height="10" rx="5" fill="${p.edge}"/>`;
    case "controller":
      return `<path d="M220 330 Q240 270 320 270 H480 Q560 270 580 330 L640 520 Q660 590 600 600 Q560 606 520 540 L500 500 H300 L280 540 Q240 606 200 600 Q140 590 160 520 Z" fill="${p.body}" ${s}/><circle cx="310" cy="380" r="34" fill="${p.dark}"/><circle cx="460" cy="440" r="30" fill="${p.dark}"/><circle cx="520" cy="350" r="12" fill="${p.light}"/><circle cx="550" cy="380" r="12" fill="${p.light}"/><circle cx="490" cy="380" r="12" fill="${p.light}"/><circle cx="520" cy="410" r="12" fill="${p.light}"/>`;
    case "gpu":
      return `<rect x="100" y="280" width="600" height="240" rx="20" fill="${p.body}" ${s}/>${[230, 400, 570].map((cx) => `<circle cx="${cx}" cy="400" r="80" fill="${p.dark}"/><circle cx="${cx}" cy="400" r="22" fill="${p.light}"/>`).join("")}<rect x="160" y="520" width="380" height="26" fill="#c9a24a"/>`;
    case "ssd":
      return `<rect x="140" y="340" width="520" height="120" rx="10" fill="${p.body}" ${s}/><rect x="200" y="365" width="120" height="70" rx="6" fill="${p.dark}"/><rect x="350" y="365" width="90" height="70" rx="6" fill="${p.dark}"/><rect x="470" y="365" width="90" height="70" rx="6" fill="${p.dark}"/><rect x="620" y="360" width="40" height="80" fill="#c9a24a"/>`;
    case "charger":
      return `<rect x="270" y="260" width="260" height="280" rx="46" fill="${p.body}" ${s}/><rect x="330" y="200" width="20" height="70" rx="6" fill="${p.edge}"/><rect x="450" y="200" width="20" height="70" rx="6" fill="${p.edge}"/><rect x="360" y="460" width="80" height="22" rx="8" fill="${p.dark}"/>`;
    case "powerbank":
      return `<rect x="250" y="170" width="300" height="460" rx="50" fill="${p.body}" ${s}/>${[0, 1, 2, 3].map((i) => `<circle cx="${355 + i * 30}" cy="560" r="8" fill="${i < 3 ? "#7fb7b0" : p.dark}"/>`).join("")}`;
    case "keyboard":
      return `<rect x="90" y="300" width="620" height="230" rx="22" fill="${p.body}" ${s}/>${Array.from({ length: 4 }, (_, r) => Array.from({ length: 12 }, (_, c) => `<rect x="${115 + c * 48}" y="${322 + r * 46}" width="40" height="36" rx="7" fill="${p.light}" stroke="${p.edge}" stroke-width="2"/>`).join("")).join("")}`;
    case "mouse":
      return `<path d="M400 180 C520 180 540 300 540 420 C540 560 480 620 400 620 C320 620 260 560 260 420 C260 300 280 180 400 180 Z" fill="${p.body}" ${s}/><line x1="400" y1="180" x2="400" y2="330" stroke="${p.edge}" stroke-width="4"/><rect x="388" y="230" width="24" height="56" rx="12" fill="${p.dark}"/>`;
    case "banner":
      return `<circle cx="560" cy="300" r="220" fill="${p.light}" opacity=".7"/><circle cx="300" cy="520" r="160" fill="${p.body}" opacity=".55"/><path d="M400 170c6 44 41 79 85 85-44 6-79 41-85 85-6-44-41-79-85-85 44-6 79-41 85-85Z" fill="#e3992c"/>`;
  }
}

export function renderPlaceholderSvg(kind: PlaceholderKind, hex: string, view: number): string {
  const p = palette(hex);
  const shape = drawFront(kind, p, view);
  const transform =
    view === 3 ? `transform="translate(400 400) scale(1.35) rotate(-10) translate(-400 -400)"` : view === 2 && kind !== "phone" ? `transform="rotate(-6 400 400)"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800"><defs>${SCREEN_GRADIENT}<radialGradient id="bg" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${p.bg}"/></radialGradient></defs><rect width="800" height="800" fill="url(#bg)"/><ellipse cx="400" cy="700" rx="250" ry="22" fill="#25212b" opacity=".07"/><g ${transform}>${shape}</g></svg>`;
}
