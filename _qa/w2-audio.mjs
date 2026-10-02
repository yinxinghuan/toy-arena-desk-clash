import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright"),
  browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
// QA-only analyser inserted in the real output graph, not production code.
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
      const sources = new Set(),
        nativeSource = this.createBufferSource.bind(this);
      this.createBufferSource = () => {
        const s = nativeSource(),
          start = s.start.bind(s),
          stop = s.stop.bind(s);
        s.start = (...args) => {
          sources.add(s);
          return start(...args);
        };
        s.stop = (...args) => {
          sources.delete(s);
          return stop(...args);
        };
        s.addEventListener("ended", () => sources.delete(s));
        return s;
      };
      window.__audioProbe = { context: this, analyser, sources };
    }
  };
});
await page.goto(process.env.TOY_ARENA_URL || "http://127.0.0.1:4191/");
await page
  .getByRole("button", { name: "Learn by driving", exact: true })
  .click();
async function sample() {
  await page.waitForTimeout(100);
  return page.evaluate(async () => {
    const p = window.__audioProbe,
      data = new Float32Array(p.analyser.fftSize);
    let peak = 0;
    for (let i = 0; i < 30; i++) {
      p.analyser.getFloatTimeDomainData(data);
      peak = Math.max(peak, ...data.map(Math.abs));
      await new Promise((r) => setTimeout(r, 20));
    }
    return {
      state: p.context.state,
      peak,
      activeSources: p.sources.size,
      musicSources: [...p.sources].filter((s) => s.loop).length,
    };
  });
}
const playing = await sample();
await page.keyboard.press("m");
const muted = await sample();
await page.keyboard.press("m");
const restored = await sample();
await page.keyboard.press("p");
const paused = await sample();
await page.getByRole("button", { name: "Resume", exact: true }).click();
for (let i = 0; i < 4; i++) {
  await page.keyboard.press("r");
  await page.waitForTimeout(120);
}
const retried = await sample();
if (
  retried.musicSources !== 1 ||
  retried.activeSources !== 1 ||
  paused.activeSources !== 0 ||
  muted.activeSources !== 0
)
  throw Error("Retry/mute/pause sources leaked");
if (
  playing.peak <= 0 ||
  restored.peak <= 0 ||
  muted.peak > 0.001 ||
  paused.peak > 0.001
)
  throw Error(JSON.stringify({ playing, muted, restored, paused }));
await browser.close();
const report = {
  playing,
  muted,
  restored,
  paused,
  retried,
  note: "W2 licensed buffer audio: measured real WebAudio output graph, not a human listening test. Playwright WebM contains video only.",
};
await fs.writeFile(
  new URL("./w2-audio-results.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
