// Records the README demo tour (site/img/tour.webp and tour-dark.webp) from the browser demo.
//
//   npm run record:tour            # writes site/img/tour.webp and site/img/tour-dark.webp
//   npm run record:tour -- <dir>   # writes to another folder instead
//
// Needs Google Chrome and img2webp (`brew install webp`). Set CHROME_PATH if Chrome isn't in /Applications.
// The demo uses fake data relative to today, so the tour looks the same whenever it's recorded.
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const OUT = resolve(process.argv[2] ?? "site/img");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SIZE = { width: 1200, height: 760 };
const MIN_FRAME_MS = 66; // about 15 fps
const QUALITY = "82";
const END_HOLD_S = 3; // how long the last frame stays before the loop restarts

const server = await createServer({ server: { port: 1431, strictPort: false }, logLevel: "error" });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: CHROME });
try {
  for (const theme of ["light", "dark"]) {
    const file = join(OUT, theme === "light" ? "tour.webp" : "tour-dark.webp");
    const frames = await record(theme);
    encode(frames, file);
  }
} finally {
  await browser.close();
  await server.close();
}

async function record(theme) {
  const page = await browser.newPage({ viewport: SIZE, screen: SIZE, deviceScaleFactor: 1, colorScheme: theme });

  // A fake macOS-style cursor with a click ring, since screenshots don't include the real one.
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const c = document.createElement("div");
      c.innerHTML = `<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2 L2 22 L7 17.5 L10.5 25.5 L14 24 L10.5 16 L17 16 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
      Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", transform: "translate(600px, 500px)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))" });
      const ring = document.createElement("div");
      Object.assign(ring.style, { position: "fixed", width: "34px", height: "34px", marginLeft: "-17px", marginTop: "-17px", borderRadius: "50%", background: "rgba(5,150,105,.28)", zIndex: "2147483646", pointerEvents: "none", opacity: "0" });
      document.body.append(ring, c);
      addEventListener("mousemove", (e) => { c.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`; }, true);
      addEventListener("mousedown", (e) => {
        Object.assign(ring.style, { left: `${e.clientX}px`, top: `${e.clientY}px`, transition: "none", opacity: "1", transform: "scale(.4)" });
        requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(ring.style, { transition: "opacity .45s, transform .45s", opacity: "0", transform: "scale(1.4)" })));
      }, true);
    });
  });

  await page.goto(`${base}demo.html?clean=1#/`);
  await page.waitForTimeout(1500);

  let pos = { x: 600, y: 500 };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  async function moveTo(locator, dx = 0.5, dy = 0.5) {
    const b = await locator.boundingBox();
    const to = { x: b.x + b.width * dx, y: b.y + b.height * dy };
    for (let i = 1; i <= 12; i++) {
      const e = ease(i / 12);
      await page.mouse.move(pos.x + (to.x - pos.x) * e, pos.y + (to.y - pos.y) * e);
      await page.waitForTimeout(16);
    }
    pos = to;
  }
  async function click(locator, dx, dy) {
    await moveTo(locator, dx, dy);
    await page.waitForTimeout(120);
    await page.mouse.down();
    await page.mouse.up();
  }
  async function scrollMain(px, ms) {
    await page.evaluate(([px, ms]) => new Promise((done) => {
      const m = document.querySelector("main");
      const start = m.scrollTop, t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        m.scrollTop = start + px * ease(t);
        t < 1 ? requestAnimationFrame(tick) : done();
      };
      requestAnimationFrame(tick);
    }), [px, ms]);
  }
  const nav = (name) => page.locator("nav a, aside a").filter({ hasText: name }).first();

  // The DevTools screencast sends a frame each time the page paints.
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    frames.push({ data, t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: SIZE.width, maxHeight: SIZE.height });

  // 1. Today: the running timer ticks.
  await page.mouse.move(pos.x, pos.y);
  await page.waitForTimeout(900);
  await moveTo(page.getByRole("button", { name: "Stop" }));
  await page.waitForTimeout(1100);

  // 2. Work log: the week, then a scroll through the days.
  await click(nav("Work log"));
  await page.waitForTimeout(1000);
  await moveTo(page.getByText(/^Wed \d+$/).first());
  await page.waitForTimeout(250);
  await scrollMain(420, 900);
  await page.waitForTimeout(500);

  // 3. Invoices: the list, then a new invoice for Acme Robotics and its preview.
  await click(nav("Invoices"));
  await page.waitForTimeout(1000);
  await click(page.getByRole("link", { name: /New invoice/ }).or(page.getByRole("button", { name: /New invoice/ })).first());
  await page.waitForTimeout(700);
  const clientSelect = page.locator("select").first();
  await click(clientSelect);
  await page.waitForTimeout(250);
  await clientSelect.selectOption({ label: "Acme Robotics (USD)" });
  await page.waitForTimeout(1000);
  await moveTo(page.getByText("Line items").first(), 0.5, 3.2);
  await scrollMain(1600, 1800);
  await page.waitForTimeout(800);

  await cdp.send("Page.stopScreencast");
  await page.close();
  return frames;
}

// Merge frames down to ~15 fps (keeping real timing) and encode an animated WebP.
function encode(frames, file) {
  const dir = mkdtempSync(join(tmpdir(), "hourmint-tour-"));
  try {
    const kept = [];
    frames.forEach((f, i) => {
      const ms = Math.round(((frames[i + 1]?.t ?? f.t + END_HOLD_S) - f.t) * 1000);
      if (kept.length && kept.at(-1).ms < MIN_FRAME_MS) Object.assign(kept.at(-1), { f, ms: kept.at(-1).ms + ms });
      else kept.push({ f, ms });
    });
    const args = ["-loop", "0", "-lossy", "-q", QUALITY, "-m", "6"];
    kept.forEach(({ f, ms }, i) => {
      const png = join(dir, `${String(i).padStart(4, "0")}.png`);
      writeFileSync(png, Buffer.from(f.data, "base64"));
      args.push("-d", String(Math.max(20, ms)), png);
    });
    execFileSync("img2webp", [...args, "-o", file], { stdio: "pipe" });
    const secs = kept.reduce((s, k) => s + k.ms, 0) / 1000;
    console.log(`${file}: ${kept.length} frames, ${secs.toFixed(1)}s, ${(statSync(file).size / 1e6).toFixed(2)} MB`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
