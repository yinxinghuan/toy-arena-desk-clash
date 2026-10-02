import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright"),
  browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 907, height: 510 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.TOY_ARENA_URL || "http://127.0.0.1:4191/";
const responses = [];
page.on("response", async (r) => {
  try {
    if (r.url().startsWith(url))
      responses.push({
        url: r.url().slice(url.length),
        size: (await r.body()).length,
      });
  } catch {
    /* Pending noncritical responses can close with the QA browser. */
  }
});
await page.goto(url);
await page.waitForTimeout(500);
const first = responses.slice();
await page.getByRole("button", { name: "Sandbox", exact: true }).click();
await page.waitForTimeout(1500);
const client = await page.context().newCDPSession(page);
await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.keyboard.down("d");
await page.keyboard.down("w");
const timing = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let last = performance.now(),
        times = [];
      function tick(now) {
        times.push(now - last);
        last = now;
        if (times.length < 600) requestAnimationFrame(tick);
        else {
          times.sort((a, b) => a - b);
          resolve({
            frames: times.length,
            median: times[300],
            p95: times[570],
            p99: times[594],
            max: times.at(-1),
          });
        }
      }
      requestAnimationFrame(tick);
    }),
);
await page.keyboard.up("d");
await page.keyboard.up("w");
await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await page.setViewportSize({ width: 640, height: 360 });
await page.screenshot({
  path: new URL("./ui/w2/640-sandbox.png", import.meta.url).pathname,
});
await page.keyboard.press("p");
await page.screenshot({
  path: new URL("./ui/w2/640-pause.png", import.meta.url).pathname,
});
const clipping = await page.evaluate(() =>
  [...document.querySelectorAll("#hud button")].map((e) => {
    const r = e.getBoundingClientRect();
    return {
      text: e.textContent,
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      inside: r.right <= innerWidth && r.bottom <= innerHeight,
    };
  }),
);
// Embed the same production URL in a 640x360 host iframe; do not set game state.
await page.setViewportSize({ width: 800, height: 450 });
await page.route(url + "qa-host", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: `<iframe title="Toy Arena small host" src="${url}" style="width:640px;height:360px;border:0"></iframe>`,
  }),
);
await page.goto(url + "qa-host");
await page.waitForTimeout(500);
const frame = page.frames().find((f) => f.parentFrame());
await frame.waitForSelector('[data-action="sandbox"]');
await frame.getByRole("button", { name: "Sandbox", exact: true }).click();
await page.screenshot({
  path: new URL("./ui/w2/640-host-iframe.png", import.meta.url).pathname,
});
const report = {
  firstScreen: first,
  totalUncompressed: first.reduce((n, r) => n + r.size, 0),
  audioBeforeGesture: first.some((r) => r.url.includes("audio")),
  cpuThrottle: 4,
  timing,
  clipping,
  iframe: "actual production iframe, 640x360",
  realChromebook: "unavailable; desktop Chrome CPU throttling is only a proxy",
  errors,
};
await fs.writeFile(
  new URL("./w2-performance-results.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await browser.close();
