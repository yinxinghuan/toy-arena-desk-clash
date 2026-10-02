import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({
    viewport: { width: 800, height: 450 },
    recordVideo: {
      dir: new URL("./video/", import.meta.url).pathname,
      size: { width: 800, height: 450 },
    },
  }),
  page = await context.newPage();
await page.goto("http://127.0.0.1:4186/");
await page
  .getByRole("button", { name: "Learn by driving", exact: true })
  .click();
await page.keyboard.down("d");
await page.waitForTimeout(900);
await page.keyboard.up("d");
await page.mouse.click((420 / 960) * 800, (390 / 540) * 450);
await page.waitForTimeout(550);
await page.getByRole("button", { name: "Skip", exact: true }).click();
await page.keyboard.down("d");
await page.waitForTimeout(1000);
await page.keyboard.up("d");
await page.keyboard.press("p");
await page.waitForTimeout(500);
const video = page.video();
await context.close();
const output = new URL("./video/800x450-input-dash-pause.webm", import.meta.url)
  .pathname;
await video.saveAs(output);
const old = await video.path();
if (old !== output) await fs.unlink(old);
await browser.close();
console.log(output);
