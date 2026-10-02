import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage({ viewport: { width: 800, height: 450 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const base = process.env.TOY_ARENA_URL || "http://127.0.0.1:4186/",
  sizes = [];
page.on("response", async (r) => {
  if (r.url().startsWith(base) && !r.url().includes("favicon"))
    try {
      sizes.push({
        url: new URL(r.url()).pathname,
        bytes: (await r.body()).length,
      });
    } catch {}
});
await page.goto(base, { waitUntil: "networkidle" });
const firstScreen = sizes.reduce((a, s) => a + s.bytes, 0);
const frames = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const deltas = [];
      let last = performance.now(),
        start = last;
      function frame(t) {
        deltas.push(t - last);
        last = t;
        if (t - start < 2000) requestAnimationFrame(frame);
        else
          resolve({
            frames: deltas.length,
            meanMs: deltas.reduce((a, b) => a + b, 0) / deltas.length,
            worstMs: Math.max(...deltas),
            dpr: devicePixelRatio,
            canvasWidth: document.querySelector("canvas").width,
          });
      }
      requestAnimationFrame(frame);
    }),
);
await page
  .getByRole("button", { name: "Learn by driving", exact: true })
  .click();
await page.waitForFunction(
  () => window.toyArena.snapshot().phase === "paused",
  {},
  { timeout: 35000 },
);
await page.screenshot({
  path: new URL("./ui/800x450-tutorial-30s.png", import.meta.url).pathname,
});
if ((await page.evaluate(() => window.toyArena.snapshot())).time !== 0)
  throw Error("Tutorial spent challenge time");
await page.getByRole("button", { name: "Start race", exact: true }).click();
if (await page.locator("#tutorial").isVisible())
  throw Error("Tutorial visible after timeout exit");
await page.evaluate(() => window.dispatchEvent(new Event("blur")));
const before = await page.evaluate(() => window.toyArena.snapshot());
await page.waitForTimeout(1000);
const after = await page.evaluate(() => window.toyArena.snapshot());
if (after.phase !== "paused" || after.time !== before.time)
  throw Error("Blur did not freeze simulation");
await page.getByRole("button", { name: "Resume", exact: true }).click();
await page.setViewportSize({ width: 907, height: 510 });
await page.screenshot({
  path: new URL("./ui/907x510-race.png", import.meta.url).pathname,
});
await page.setViewportSize({ width: 1920, height: 1080 });
await page.screenshot({
  path: new URL("./ui/1920x1080-race.png", import.meta.url).pathname,
});
const corrupt = await browser.newPage({
  viewport: { width: 800, height: 450 },
});
await corrupt.addInitScript(() =>
  localStorage.setItem("toy-arena-desk-clash:v1", "{"),
);
await corrupt.goto(base);
if (
  !(await corrupt.locator("#save-warning").textContent()).includes(
    "could not be read",
  )
)
  throw Error("Corrupt save not reported");
await corrupt.screenshot({
  path: new URL("./ui/800x450-save-recovery.png", import.meta.url).pathname,
});
const blocked = await browser.newPage();
await blocked.addInitScript(() => {
  Object.defineProperty(window, "localStorage", {
    get() {
      throw Error("Disabled");
    },
  });
});
await blocked.goto(base);
await blocked
  .getByRole("button", { name: "Learn by driving", exact: true })
  .click();
if (
  !(await blocked.locator("#save-warning").textContent()).includes(
    "could not be read",
  )
)
  throw Error("Blocked storage not reported");
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
const report = {
  firstScreenBytes: firstScreen,
  resources: sizes.slice(0, 3),
  frames,
  tutorialTimeout: "30 seconds → safe pause, no forced learning claim",
  blur: "simulation frozen",
  corruptSave: "warning and playable reset",
  blockedSave: "warning and playable session",
  errors,
};
await fs.writeFile(
  new URL("./resilience-results.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
