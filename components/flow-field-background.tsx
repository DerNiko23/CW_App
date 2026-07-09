"use client";

import { useEffect, useRef } from "react";

// Canvas kennt keine CSS-Custom-Properties, daher spiegeln wir die Hex-Werte aus
// app/globals.css hier direkt statt sie zur Laufzeit auszulesen.
const PAPER = "#fafafa";
const INKS = ["#141414", "#1c1c1c", "#0d0d0d"];
const ACCENT = "#0b7a6a";
const ACCENT_RATIO = 0.075;

const SCALE = 0.0028;
const CURL = 1.6;
const STEP = 1.7;
// Erststart: Aufbau-Phase ueber echte, animierte Frames (kein Fade) - der Nutzer sieht die
// Linien sichtbar entstehen statt sie fertig vorzufinden. Laeuft danach (ausser bei
// reduced-motion, wo alles sofort synchron steht) endlos mit FADE_ALPHA weiter - "immer in
// Bewegung" statt einmal "gesetzt".
const PREWARM_FRAMES = 500;
const FADE_ALPHA = 0.0012;
// Bei diesem niedrigen FADE_ALPHA (bewusst so belassen - hoehere Werte wurden getestet und
// wuschen das Bild innerhalb von Sekunden zu einem diffusen Grauschleier statt Tinte, siehe
// CHANGELOG) drifted die Flaeche ueber sehr lange Sessions (>10-15 Min. Dauerlauf) langsam
// dunkler. Statt dagegen staerker zu faden (verschlechtert die Optik frueher, siehe oben):
// nach dieser Frame-Zahl (~25 Min bei 60fps) einmalig frisch neu aufsetzen (neuer Seed) statt
// unbegrenzt weiterzudriften.
const LONG_SESSION_RESET_FRAMES = 90000;
const AREA_PER_PARTICLE = 9000;
const MIN_PARTICLES = 140;
const MAX_PARTICLES_MOBILE = 240;
const MAX_PARTICLES_DESKTOP = 460;
// Aufbau-Phase darf kraeftig zeichnen - passiert einmalig beim Erststart/Resize/Reset.
// Die anschliessende Live-Phase (Endlos-Modus) zeichnet dagegen mit deutlich niedrigerer Alpha:
// bei gleicher Staerke wie beim Aufbau wurden die Konvergenz-Linien schon nach ~10s spuerbar
// dicker/dunkler (im Browser verglichen, nicht nur angenommen - siehe CHANGELOG). Mit
// LIVE_INK_ALPHA bleibt das Bild ueber mehrere Sekunden fast unveraendert und entwickelt sich nur
// ueber deutlich laengere Zeitraeume.
const PREWARM_INK_ALPHA = 0.075;
const LIVE_INK_ALPHA = 0.025;
const ACCENT_ALPHA_MULT = 3.2;
const MIN_LIFE = 70;
const MAX_LIFE = 220;

type Rgb = [number, number, number];

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPermutation(random: () => number): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number) {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return (h & 1 ? -u : u) + (h & 2 ? -2 * v : 2 * v);
}

// Klassisches 2D-Perlin-Noise (Permutationstabelle statt Bibliothek) - deterministisch aus dem
// seeded PRNG, damit derselbe Seed immer dasselbe Feld ergibt.
function makePerlin(perm: Uint8Array) {
  return function perlin2(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const a = perm[X] + Y;
    const aa = perm[a];
    const ab = perm[a + 1];
    const b = perm[X + 1] + Y;
    const ba = perm[b];
    const bb = perm[b + 1];
    return lerp(
      lerp(grad(perm[aa], xf, yf), grad(perm[ba], xf - 1, yf), u),
      lerp(grad(perm[ab], xf, yf - 1), grad(perm[bb], xf - 1, yf - 1), u),
      v,
    );
  };
}

// 3 Oktaven summiert -> breite Stroemungen mit feinen Wirbeln darin, statt gleichfoermigem Rauschen.
function makeField(perlin: (x: number, y: number) => number) {
  return function field(x: number, y: number): number {
    let f = 0;
    let amp = 0.6;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < 3; o++) {
      f += perlin(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return f / norm;
  };
}

function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${r},${g},${b},${alpha})`;
}

type Particle = {
  x: number;
  y: number;
  life: number;
  isAccent: boolean;
  color: Rgb;
};

// Animierter Tintenlinien-Hintergrund: seeded Flow-Field aus Noise-Partikeln, komplett auf
// Canvas 2D berechnet (kein Bild-Asset, kein npm-Package). Laeuft unabhaengig vom umgebenden
// Formular-/Seiten-Status daneben (kein Props-/State-Kontakt zu anderen Komponenten).
// Ohne `durationSeconds`: laeuft endlos (Login). Mit `durationSeconds`: stoppt nach dieser Dauer
// dauerhaft und bleibt beim letzten Stand stehen, statt weiterzulaufen (Inbox - dezenter Moment
// beim Laden, kein Dauerlauf hinter einer taeglich genutzten Arbeitsliste).
export function FlowFieldBackground({ durationSeconds }: { durationSeconds?: number } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const durationFrames =
      durationSeconds !== undefined ? Math.round(durationSeconds * 60) : undefined;
    // Aufbau-Phase dauert beim Endlos-Modus PREWARM_FRAMES, beim zeitbegrenzten Modus (Inbox)
    // ist die gesamte Laufzeit selbst die Aufbau-Phase - kein separater Live/Fade-Abschnitt.
    const buildFrames = durationFrames !== undefined ? durationFrames : PREWARM_FRAMES;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const inkRgb = INKS.map(hexToRgb);
    const accentRgb = hexToRgb(ACCENT);
    const paperRgb = hexToRgb(PAPER);

    let width = 0;
    let height = 0;
    let random = mulberry32(Date.now());
    let field = makeField(makePerlin(buildPermutation(random)));
    let particles: Particle[] = [];
    let rafId = 0;
    let sessionFrame = 0;
    let phase: "building" | "live" = "building";
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function particleCount(): number {
      const area = width * height;
      const cap = width < 640 ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
      return Math.min(cap, Math.max(MIN_PARTICLES, Math.floor(area / AREA_PER_PARTICLE)));
    }

    function spawn(p: Particle) {
      p.x = random() * width;
      p.y = random() * height;
      p.life = MIN_LIFE + random() * (MAX_LIFE - MIN_LIFE);
      p.isAccent = random() < ACCENT_RATIO;
      p.color = p.isAccent ? accentRgb : inkRgb[Math.floor(random() * inkRgb.length)];
    }

    function setup() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = rgba(paperRgb, 1);
      ctx!.fillRect(0, 0, width, height);

      random = mulberry32(Date.now() ^ ((width * 7919 + height * 104729) | 0));
      field = makeField(makePerlin(buildPermutation(random)));

      const count = particleCount();
      particles = Array.from({ length: count }, () => {
        const p: Particle = { x: 0, y: 0, life: 0, isAccent: false, color: inkRgb[0] };
        spawn(p);
        // Gestaffelter Erststart, sonst respawnen alle Partikel im selben Frame gemeinsam.
        p.life = random() * MAX_LIFE;
        return p;
      });
      stopped = false;
    }

    function step(inkAlpha: number, withFade: boolean) {
      if (withFade) {
        ctx!.fillStyle = rgba(paperRgb, FADE_ALPHA);
        ctx!.fillRect(0, 0, width, height);
      }
      ctx!.lineWidth = 0.8;
      for (const p of particles) {
        const angle = (field(p.x * SCALE, p.y * SCALE) * Math.PI * 2) / CURL;
        const nx = p.x + Math.cos(angle) * STEP;
        const ny = p.y + Math.sin(angle) * STEP;
        const alpha = inkAlpha * (p.isAccent ? ACCENT_ALPHA_MULT : 1);
        ctx!.strokeStyle = rgba(p.color, alpha);
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(nx, ny);
        ctx!.stroke();
        p.x = nx;
        p.y = ny;
        p.life -= 1;
        if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          spawn(p);
        }
      }
    }

    // Phase "building": sichtbarer Aufbau ueber echte, gemalte Frames (kein Fade, volle
    // PREWARM_INK_ALPHA) - der Nutzer sieht die Linien ueber ~buildFrames/60 Sekunden entstehen,
    // statt sie fertig vorzufinden. Endlos-Modus wechselt danach in Phase "live" (LIVE_INK_ALPHA
    // + Fade, laeuft fuer immer weiter). Zeitbegrenzter Modus (Inbox) stoppt nach der Aufbauphase.
    function loop() {
      if (stopped) return;
      if (phase === "building") {
        step(PREWARM_INK_ALPHA, false);
        sessionFrame += 1;
        if (sessionFrame >= buildFrames) {
          if (durationFrames !== undefined) {
            stopped = true;
            return;
          }
          phase = "live";
          sessionFrame = 0;
        }
      } else {
        step(LIVE_INK_ALPHA, true);
        sessionFrame += 1;
        if (sessionFrame >= LONG_SESSION_RESET_FRAMES) {
          setup();
          phase = "building";
          sessionFrame = 0;
        }
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (prefersReducedMotion) {
        // Kein Animations-Loop erlaubt: synchron auf den fertigen Stand vorzeichnen und einfrieren.
        for (let i = 0; i < buildFrames; i++) step(PREWARM_INK_ALPHA, false);
        stopped = true;
      } else {
        phase = "building";
        sessionFrame = 0;
        rafId = requestAnimationFrame(loop);
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else if (!stopped) {
        rafId = requestAnimationFrame(loop);
      }
    }

    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Mobile Browser feuern beim Scrollen resize-Events, wenn die Adressleiste ein-/
        // ausblendet (aendert nur innerHeight um ~50-100px, nie innerWidth). Nur bei echter
        // Breitenaenderung oder einer deutlichen Hoehenaenderung (>150px, z. B. Rotation/
        // Fenster-Resize) neu aufbauen - sonst wuerde jeder Scroll das Bild zuruecksetzen.
        const widthChanged = window.innerWidth !== width;
        const heightChanged = Math.abs(window.innerHeight - height) > 150;
        if (!widthChanged && !heightChanged) return;
        cancelAnimationFrame(rafId);
        setup();
        start();
      }, 200);
    }

    setup();
    start();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
    };
  }, [durationSeconds]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
