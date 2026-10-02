import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 800, height: 450 },
  recordVideo: {
    dir: new URL("./video/stress/", import.meta.url).pathname,
    size: { width: 800, height: 450 },
  },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.addInitScript(() => {
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      const analyser = this.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(this.destination);
      const create = this.createGain.bind(this);
      this.createGain = () => {
        const gain = create(),
          connect = gain.connect.bind(gain);
        gain.connect = (node, ...rest) =>
          connect(node === this.destination ? analyser : node, ...rest);
        return gain;
      };
      window.__audioProbe = { context: this, analyser };
    }
  };
});
const base = process.env.TOY_ARENA_URL || "http://127.0.0.1:4187/";
await page.goto(base);
await page.getByRole("button", { name: /01 \/ Tape Sprint/ }).click();
const snap = () => page.evaluate(() => window.toyArena.snapshot());
const checks = [];
await page.keyboard.down("d");
await page.waitForTimeout(650);
await page.keyboard.up("d");
for (let i = 0; i < 25; i++) await page.mouse.click(580, 270);
checks.push({ case: "25 rapid dash clicks", snapshot: await snap() });
for (let i = 0; i < 20; i++) await page.keyboard.press("r");
await page.waitForTimeout(150);
const restarted = await snap();
if (
  restarted.phase !== "playing" ||
  restarted.time > 1 ||
  restarted.gate !== 0 ||
  restarted.hits !== 0
)
  throw Error("Rapid retry did not reset");
checks.push({ case: "20 rapid retries", snapshot: restarted });
const mutedBefore = (await snap()).muted;
for (let i = 0; i < 20; i++) await page.keyboard.press("m");
if ((await snap()).muted !== mutedBefore) throw Error("Mute parity failed");
for (let i = 0; i < 8; i++) {
  await page.keyboard.press("p");
  await page.waitForTimeout(80);
}
if ((await snap()).phase !== "playing")
  throw Error("Rapid pause/resume did not settle");
await page.keyboard.press("p");
const paused = await snap();
await page.waitForTimeout(450);
if ((await snap()).time !== paused.time) throw Error("Pause advanced time");
await page.screenshot({
  path: new URL("./ui/800x450-stress-paused.png", import.meta.url).pathname,
});
await page.getByRole("button", { name: "Resume", exact: true }).click();
const focusBefore = await page.evaluate(() => ({
  focus: document.hasFocus(),
  visibility: document.visibilityState,
}));
const other = await context.newPage();
await other.goto("about:blank");
await other.bringToFront();
await page.waitForTimeout(450);
let blurred = await snap();
const focusAfter = await page.evaluate(() => ({
  focus: document.hasFocus(),
  visibility: document.visibilityState,
}));
const nativeBlurObserved = blurred.phase === "paused";
if (!nativeBlurObserved) {
  if (
    focusAfter.visibility === "hidden" ||
    (focusBefore.focus && !focusAfter.focus)
  )
    throw Error("Observed real focus loss did not pause");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  blurred = await snap();
  if (blurred.phase !== "paused")
    throw Error("Explicit blur event did not pause");
}
await page.bringToFront();
const blurTime = blurred.time;
await page.waitForTimeout(250);
if ((await snap()).time !== blurTime)
  throw Error("Returning to tab resumed without consent");
await other.close();
checks.push({
  case: "tab-switch focus probe; explicit blur fallback if no native event",
  focusBefore,
  focusAfter,
  nativeBlurObserved,
  snapshot: await snap(),
});
await page.getByRole("button", { name: "Resume", exact: true }).click();
async function signal() {
  await page.waitForTimeout(100);
  return page.evaluate(async () => {
    const p = window.__audioProbe,
      a = new Float32Array(p.analyser.fftSize);
    let peak = 0;
    for (let i = 0; i < 30; i++) {
      p.analyser.getFloatTimeDomainData(a);
      peak = Math.max(peak, ...a.map(Math.abs));
      await new Promise((r) => setTimeout(r, 20));
    }
    return { state: p.context.state, peak };
  });
}
const sound = await signal();
await page.keyboard.press("m");
const silent = await signal();
await page.keyboard.press("m");
const restored = await signal();
await page.keyboard.press("p");
const stopped = await signal();
if (
  sound.peak <= 0 ||
  restored.peak <= 0 ||
  silent.peak > 0.001 ||
  stopped.peak > 0.001
)
  throw Error("Audio state failed");
await page.screenshot({
  path: new URL("./ui/800x450-stress-recheck.png", import.meta.url).pathname,
});
const video = page.video();
await context.close();
const videoPath = new URL("./video/800x450-stress-input.webm", import.meta.url)
  .pathname;
await video.saveAs(videoPath);
const old = await video.path();
if (old !== videoPath) await fs.unlink(old);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
const report = {
  base,
  productionCommit: "71cdef815c946f53fd650b33d100d6948cf76051",
  checks,
  audio: { sound, silent, restored, stopped },
  errors,
  note: "Normal keyboard/mouse events; tab-switch focus probe reports whether native blur was observed. If not, an explicit blur event only tests the handler, not OS focus behavior. Read-only diagnostics and QA-only analyser; no game progress writes. Video has no audio track.",
};
await fs.writeFile(
  new URL("./stress-input-results.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
