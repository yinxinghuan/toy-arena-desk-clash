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
      window.__audioProbe = { context: this, analyser };
    }
  };
});
await page.goto("http://127.0.0.1:4186/");
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
    return { state: p.context.state, peak };
  });
}
const playing = await sample();
await page.keyboard.press("m");
const muted = await sample();
await page.keyboard.press("m");
const restored = await sample();
await page.keyboard.press("p");
const paused = await sample();
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
  note: "Measured real WebAudio output graph, not a human listening test. Playwright WebM contains video only.",
};
await fs.writeFile(
  new URL("./audio-results.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
