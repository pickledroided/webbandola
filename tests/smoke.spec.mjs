import { test, expect } from "@playwright/test";

// Desktop icon id -> the window id it opens. (Icons are suffixed "icon";
// windows share the bare id but start hidden, so we click the icon.)
const APPS = [
  ["notesicon", "notes"],
  ["contactsicon", "contacts"],
  ["browsericon", "browser"],
  ["calculatoricon", "calculator"],
  ["compendiumicon", "compendium"],
  ["galleryicon", "gallery"],
  ["musicicon", "music"],
  ["themesicon", "themes"],
  ["settingsicon", "settings"],
  ["painticon", "paint"],
  ["widgetsicon", "widgets"]
];

// Single deterministic navigation. A second navigation (reload / 2nd goto) hangs
// in this headless build, so every test does exactly one goto. Each Playwright
// test runs in a fresh context, so localStorage starts empty. We abort off-localhost
// requests (Google Fonts + wiki.gg icons) so the render-blocking stylesheet can't
// stall DOMContentLoaded, and hide the boot overlay so it doesn't intercept clicks.
async function gotoApp(page, { preScript } = {}) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http://localhost:4178") || url.startsWith("data:")) {
      return route.continue();
    }
    return route.abort();
  });
  if (preScript) await page.addInitScript(preScript);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const b = document.getElementById("bootIntro");
    if (b) b.style.display = "none";
  });
}

test("boot intro overlay exists and is skippable", async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http://localhost:4178") || url.startsWith("data:")) return route.continue();
    return route.abort();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const overlay = page.locator("#bootIntro");
  await expect(overlay).toBeVisible();
  const hasReplay = await page.evaluate(() => typeof window.replayBootIntro === "function");
  expect(hasReplay).toBeTruthy();
});

test("welcome window opens on load", async ({ page }) => {
  await gotoApp(page);
  await expect(page.locator("#welcome")).toBeVisible();
});

test("desktop fills the window uniformly (no stretch), topbar flush + full-width, compact icon block, bottom row visible", async ({ page }) => {
  // Regression: the desktop fills the whole window (including the right edge) but uses a
  // SINGLE uniform scale so icons/apps/text are never stretched. The topbar (width:100%)
  // spans the full viewport width, the icon block stays compact top-left, the bottom row
  // (gallery/themes) is visible, and the topbar sits flush at the top.
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoApp(page);
  for (const [w, h] of [[1280, 720], [1512, 800], [1366, 768], [1920, 1080], [1920, 1200], [900, 600]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => {
      const rc = (id) => document.getElementById(id).getBoundingClientRect();
      const os = document.getElementById("os");
      const m = new DOMMatrixReadOnly(getComputedStyle(os).transform);
      const top = rc("top"), notes = rc("notesicon"), themes = rc("themesicon"), gal = rc("galleryicon");
      return {
        sx: m.a, sy: m.d, vw: window.innerWidth, vh: window.innerHeight,
        osW: Math.round(os.getBoundingClientRect().width),
        notesL: Math.round(notes.left), themesR: Math.round(themes.right),
        galB: Math.round(gal.bottom), topT: Math.round(top.top), topR: Math.round(top.right),
      };
    });
    // Fills the window: the stage covers the whole viewport (no blank sides).
    expect(r.osW, `desktop not filling width @ ${w}x${h}`).toBe(r.vw);
    // Uniform (no distortion): X and Y scale factors match.
    expect(Math.abs(r.sx - r.sy), `scaling not uniform @ ${w}x${h}`).toBeLessThan(0.001);
    // Compact top-left block: the two columns sit together on the left (a small fraction
    // of the window width), NOT stretched to opposite edges.
    expect(r.themesR - r.notesL, `icon block not compact @ ${w}x${h}`).toBeLessThan(r.vw * 0.30);
    // Bottom row visible, topbar flush at top and full viewport width (reaches right edge).
    expect(r.galB, `bottom row clipped @ ${w}x${h}`).toBeLessThanOrEqual(r.vh + 1);
    expect(r.topT, `topbar not flush @ ${w}x${h}`).toBeLessThanOrEqual(1);
    expect(r.topR, `topbar not full width @ ${w}x${h}`).toBe(r.vw);
  }
});

test("dragging a window tracks the pointer on non-16:9 windows", async ({ page }) => {
  // Regression: with the desktop stretched to fill non-16:9 windows, drag math must use
  // per-axis scale so windows follow the cursor instead of drifting.
  await page.setViewportSize({ width: 1512, height: 800 });
  await gotoApp(page);
  await page.locator("#calculatoricon").click();
  await page.waitForSelector("#calculator", { state: "visible" });
  const before = await page.evaluate(() => {
    const e = document.getElementById("calculator");
    return { left: e.offsetLeft, top: e.offsetTop };
  });
  const header = page.locator("#calculatorheader");
  const box = await header.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 100, { steps: 10 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const e = document.getElementById("calculator");
    return { left: e.offsetLeft, top: e.offsetTop };
  });
  // The window should have moved in the same direction as the cursor by a sensible amount
  // (not zero, not hugely distorted).
  expect(after.left - before.left).toBeGreaterThan(40);
  expect(after.top - before.top).toBeGreaterThan(20);
});

test("every app window opens from its desktop icon and closes", async ({ page }) => {
  await gotoApp(page);
  for (const [iconId, winId] of APPS) {
    const icon = page.locator("#" + iconId);
    await expect(icon).toBeVisible();
    await icon.click();

    const win = page.locator("#" + winId);
    await expect(win).toBeVisible();
    await expect(win).toHaveCSS("display", "flex");

    await page.locator("#" + winId + "close").click();
    await expect(win).toBeHidden({ timeout: 5000 });
  }
});

test("window is draggable via pointer events", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#notesicon").click();
  const win = page.locator("#notes");
  const before = await win.boundingBox();
  const hb = await page.locator("#notesheader").boundingBox();
  await page.mouse.move(hb.x + 40, hb.y + 8);
  await page.mouse.down();
  await page.mouse.move(hb.x + 140, hb.y + 80, { steps: 8 });
  await page.mouse.up();
  const after = await win.boundingBox();
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(20);
});

test("window is resizable via pointer events", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#calculatoricon").click();
  const win = page.locator("#calculator");
  const before = await win.boundingBox();
  const hx = before.x + before.width - 4;
  const hy = before.y + before.height - 4;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 60, hy + 50, { steps: 8 });
  await page.mouse.up();
  const after = await win.boundingBox();
  expect(after.width).toBeGreaterThan(before.width + 20);
});

test("calculator computes", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#calculatoricon").click();
  await page.locator('.calc-btn[data-value="6"]').click();
  await page.locator('.calc-btn[data-value="*"]').click();
  await page.locator('.calc-btn[data-value="7"]').click();
  await page.locator('.calc-btn[data-action="equals"]').click();
  await expect(page.locator("#calcDisplay")).toHaveValue("6 × 7 = 42");
});

test("calculator divide-by-zero shows ERR", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#calculatoricon").click();
  await page.locator('.calc-btn[data-action="clear"]').click();
  await page.locator('.calc-btn[data-value="5"]').click();
  await page.locator('.calc-btn[data-value="/"]').click();
  await page.locator('.calc-btn[data-value="0"]').click();
  await page.locator('.calc-btn[data-action="equals"]').click();
  await expect(page.locator("#calcDisplay")).toHaveValue("5 ÷ 0 = ERR");
});

test("compendium searches and lists items", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#compendiumicon").click();
  await expect(page.locator("#compendiumList .compendium-card").first()).toBeVisible();
  await page.fill("#compendiumSearch", "Brimstone");
  await expect(page.locator("#compendiumList .compendium-card").first()).toContainText("Brimstone");
});

test("themes applies a preset without throwing", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#themesicon").click();
  await page.locator("#themesPresetChips .theme-card").first().click();
  const blood = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--blood").trim()
  );
  expect(blood.length).toBeGreaterThan(0);
});

test("settings reset-all clears isaacos_ keys", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#settingsicon").click();
  await page.locator('.settings-cat[data-target="settingsPanelData"]').click();
  // The reset handler clears all isaacos_* keys synchronously, THEN calls
  // location.reload(). Do set + click + read in ONE synchronous evaluate so we
  // observe the cleared storage before the (remote-font-stalled) reload navigates
  // away — avoids the navigation race that makes this flaky under Playwright.
  const notesAfter = await page.evaluate(() => {
    localStorage.setItem("isaacos_notes", "x");
    document.getElementById("settingsResetAll").click();
    return localStorage.getItem("isaacos_notes");
  });
  expect(notesAfter).toBe(null);
});

test("weather widget fails offline gracefully (no unhandled rejection)", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Pre-seed a weather city; off-localhost requests are aborted, so the fetch fails.
  await gotoApp(page, {
    preScript: () =>
      localStorage.setItem("isaacos_weather", JSON.stringify({ name: "X", lat: 1, lon: 1 }))
  });
  // give the widget a tick to attempt the fetch
  await page.waitForTimeout(800);
  expect(errors.filter((m) => /fetch|network|open-meteo/i.test(m))).toEqual([]);
});
