// Manual verification script for the MockLab landing page's motion work (CLAUDE.md §6 polish
// task). Not a CI test suite — a local/CI-only tool a human runs against a live `next start`
// server to look at the actual rendered page: screenshots at two breakpoints, an LCP reading,
// and a naive layout-shift check. `playwright` is a devDependency used only here (see the
// Dockerfile's `deps` stage, which deliberately strips it before either downstream stage copies
// node_modules) — nothing in the app imports it.
//
// Usage: BASE_URL=http://localhost:3000 OUT_DIR=screenshots/after npx tsx scripts/verify-landing.ts

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = process.env.OUT_DIR ?? "screenshots";
const LOCALE = process.env.LOCALE ?? "en";

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

async function measureLcpMs(page: Page): Promise<number | null> {
  return page.evaluate(
    () =>
      new Promise<number | null>((resolve) => {
        let latest: number | null = null;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) latest = last.startTime;
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
        // LCP finalizes once the user interacts or the page goes idle — give the observer one
        // more tick, then read whatever it last reported.
        setTimeout(() => {
          observer.disconnect();
          resolve(latest);
        }, 500);
      }),
  );
}

async function measureLayoutShiftScore(page: Page, during: () => Promise<void>): Promise<number> {
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) {
          (window as unknown as { __cls: number }).__cls += shift.value;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
  });
  await during();
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls ?? 0);
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      // ---- Motion-enabled pass -------------------------------------------------------------
      const clsScore = await measureLayoutShiftScore(page, async () => {
        await page.goto(`${BASE_URL}/${LOCALE}`, { waitUntil: "networkidle" });
      });
      const lcpMs = await measureLcpMs(page);
      console.log(
        `[${viewport.name}] LCP: ${lcpMs?.toFixed(0) ?? "n/a"} ms · load CLS: ${clsScore.toFixed(4)}`,
      );

      await page.screenshot({
        path: path.join(OUT_DIR, `${viewport.name}-${LOCALE}-hero-idle.png`),
        fullPage: false,
      });

      const runButton = page.getByRole("button", { name: /run this request/i });
      await runButton.click();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(OUT_DIR, `${viewport.name}-${LOCALE}-hero-loading.png`),
        fullPage: false,
      });

      await page.waitForTimeout(900);
      await page.screenshot({
        path: path.join(OUT_DIR, `${viewport.name}-${LOCALE}-hero-done.png`),
        fullPage: false,
      });

      await context.close();

      // ---- Reduced-motion pass (desktop only, to keep the run short) -----------------------
      if (viewport.name === "desktop-1440") {
        const reducedContext = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: "reduce",
        });
        const reducedPage = await reducedContext.newPage();
        await reducedPage.goto(`${BASE_URL}/${LOCALE}`, { waitUntil: "networkidle" });
        await reducedPage.getByRole("button", { name: /run this request/i }).click();
        await reducedPage.waitForResponse((res) => res.url().includes("/m/"));
        await reducedPage.waitForTimeout(50);
        await reducedPage.screenshot({
          path: path.join(OUT_DIR, `${viewport.name}-${LOCALE}-hero-reduced-motion-done.png`),
          fullPage: false,
        });
        await reducedContext.close();
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
