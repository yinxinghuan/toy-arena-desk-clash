import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright"),
  browser = await chromium.launch({ headless: true });
const out = new URL("./ui/w2-recheck/", import.meta.url).pathname,
  video = new URL("./video/w2/", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const context = await browser.newContext({
    viewport: { width: 800, height: 450 },
    recordVideo: { dir: video, size: { width: 800, height: 450 } },
  }),
  page = await context.newPage(),
  errors = [],
  reports = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const url = process.env.TOY_ARENA_URL || "http://127.0.0.1:4192/";
const click = (name) => page.getByRole("button", { name, exact: true }).click(),
  shot = (name) => page.screenshot({ path: out + name + ".png" });
await page.goto(url);
await shot("800-title");
await click("Learn by driving");
await shot("800-tutorial");
await click("Skip");
await page.keyboard.down("d");
await page.waitForTimeout(1200);
await page.keyboard.up("d");
await page.mouse.click(350, 175);
await page.waitForTimeout(250);
await shot("800-race-mid");
await page.keyboard.press("p");
await shot("800-pause");
await click("Arena");
await click("Arenas");
await page.getByRole("button", { name: /02 \/ Stampede Station/ }).click();
await shot("800-capture-initial");
await page.keyboard.down("d");
await page.waitForTimeout(700);
await page.keyboard.up("d");
await page.mouse.click((315 * 800) / 960, (400 * 450) / 540);
await page.waitForTimeout(260);
await shot("800-capture-break");
await page.keyboard.press("p");
await click("Arena");
await click("Garage");
await shot("800-garage-locked");
await click("Sandbox test");
await page.keyboard.press("p");
await click("Test parts");
await page.getByRole("button", { name: /^Hauler / }).click();
await page.getByRole("button", { name: /^Spring / }).click();
await shot("800-test-parts");
await click("Resume");
await page.keyboard.press("e");
await page.waitForTimeout(100);
await shot("800-spring-air");
await page.keyboard.press("p");
await click("Arena");
await click("Settings & credits");
await page.keyboard.press("m");
if (
  !(await page
    .getByRole("button", { name: "Sound off", exact: true })
    .isVisible())
)
  throw Error("M label stale");
await page.keyboard.press("m");
await page.locator("#volume").fill("35");
await click("Sound on");
await click("High contrast: off");
await page.locator('[data-action="menu"]').scrollIntoViewIfNeeded();
await shot("800-credits");
await page.reload();
await click("Settings & credits");
if ((await page.locator("#volume").inputValue()) !== "35")
  throw Error("Volume not saved");
if (
  !(await page
    .getByRole("button", { name: "Sound off", exact: true })
    .isVisible())
)
  throw Error("Mute not saved");
reports.push({
  case: "settings-reload",
  snapshot: await page.evaluate(() => window.toyArena.snapshot()),
});
for (const [width, height] of [
  [640, 360],
  [907, 510],
  [1920, 1080],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.reload();
  await shot(`${width}-title`);
  await click("Arenas");
  await shot(`${width}-arenas`);
  reports.push({
    width,
    height,
    horizontalOverflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  });
  await click("Back");
  await click("Sandbox");
  await shot(`${width}-sandbox`);
  await page.keyboard.press("p");
  await shot(`${width}-pause`);
}
await context.close();
const blocked = await browser.newPage({
  viewport: { width: 800, height: 450 },
});
await blocked.addInitScript(() => {
  Storage.prototype.setItem = function () {
    throw new Error("QA-only denied storage");
  };
});
await blocked.goto(url);
await blocked
  .getByRole("button", { name: "Settings & credits", exact: true })
  .click();
await blocked.getByRole("button", { name: "Sound on", exact: true }).click();
await blocked.screenshot({ path: out + "800-storage-unavailable.png" });
reports.push({
  case: "denied-save",
  warning: await blocked.locator("#save-warning").textContent(),
});
await blocked.close();
await fs.writeFile(
  new URL("./w2-ui-results.json", import.meta.url),
  JSON.stringify(
    { reports, errors, video: "video-only; not sound evidence" },
    null,
    2,
  ),
);
await browser.close();
console.log(JSON.stringify({ reports, errors }, null, 2));
