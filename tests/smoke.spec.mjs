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
  ["widgetsicon", "widgets"],
  ["tetrisicon", "tetris"]
];

// Wait until a window's bounding box stops changing (open/animation settled),
// so drag/resize tests interact with a stable target instead of a moving one.
async function settleWindow(page, selector) {
  let prev = null;
  for (let i = 0; i < 30; i++) {
    const box = await page.locator(selector).boundingBox();
    if (box && prev && Math.abs(box.x - prev.x) < 0.5 && Math.abs(box.y - prev.y) < 0.5 &&
        Math.abs(box.width - prev.width) < 0.5 && Math.abs(box.height - prev.height) < 0.5) {
      return box;
    }
    prev = box;
    await page.waitForTimeout(50);
  }
  return prev;
}

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
  // The boot intro overlay (z-index:100000, inset:0) covers the screen and
  // swallows key/pointer events until dismissed. Dismiss it and wait for it to
  // actually be gone so the first click/keypress in a test never lands on it
  // (this was the source of order-dependent flakiness in the full run).
  await page.evaluate(() => {
    const b = document.getElementById("bootIntro");
    if (b) {
      b.style.display = "none";
      b.classList.add("hidden");
    }
  });
  await page.waitForFunction(() => {
    const b = document.getElementById("bootIntro");
    return !b || getComputedStyle(b).display === "none";
  });
  await page.waitForSelector("#os", { state: "visible" });
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

test("display-mode toggle: fill/uniform/fit persist and reflow the desktop", async ({ page }) => {
  // Regression: the Settings 'Screen fit' control switches between fill (full-window,
  // uniform, no blank), uniform (fixed canvas, centered, wallpaper edges) and fit (capped
  // at native size). The choice is persisted and re-applied on reload.
  await page.setViewportSize({ width: 1512, height: 800 }); // non-16:9 on purpose
  await gotoApp(page);

  async function setMode(mode) {
    await page.locator("#settingsicon").click();
    await page.locator("#settingsDisplayMode").selectOption(mode);
    await page.waitForTimeout(120);
  }

  // fill: stage exactly fills the window, uniform scale (sx == sy), topbar reaches right edge.
  await setMode("fill");
  let r = await page.evaluate(() => {
    const os = document.getElementById("os");
    const m = new DOMMatrixReadOnly(getComputedStyle(os).transform);
    const top = document.getElementById("top").getBoundingClientRect();
    return { sx: m.a, sy: m.d, osW: Math.round(os.getBoundingClientRect().width), vw: innerWidth, topR: Math.round(top.right) };
  });
  expect(Math.abs(r.sx - r.sy)).toBeLessThan(0.001);
  expect(r.osW).toBe(r.vw);
  expect(r.topR).toBe(r.vw);

  // uniform: fixed 1280x720 canvas scaled uniformly, centered -> narrower than window.
  await setMode("uniform");
  r = await page.evaluate(() => {
    const os = document.getElementById("os");
    const m = new DOMMatrixReadOnly(getComputedStyle(os).transform);
    return { sx: m.a, sy: m.d, osW: Math.round(os.getBoundingClientRect().width), vw: innerWidth };
  });
  expect(Math.abs(r.sx - r.sy)).toBeLessThan(0.001);
  expect(r.osW).toBeLessThan(r.vw); // letterboxed, wallpaper edges visible

  // fit: never upscaled past native 1280 -> scale <= 1.
  await setMode("fit");
  r = await page.evaluate(() => {
    const os = document.getElementById("os");
    const m = new DOMMatrixReadOnly(getComputedStyle(os).transform);
    return { sx: m.a, sy: m.d };
  });
  expect(Math.abs(r.sx - r.sy)).toBeLessThan(0.001);
  expect(r.sx).toBeLessThanOrEqual(1.0001);

  // persisted to localStorage (re-applied on next load by getDisplayMode()/fitOsToScreen)
  const persisted = await page.evaluate(() => localStorage.getItem("isaacos_display_mode"));
  expect(persisted).toBe("fit");
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
  // Let the window's open animation settle so the drag targets a stable position.
  await settleWindow(page, "#notes");
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
  // Let the window's open animation settle before grabbing the resize handle.
  await settleWindow(page, "#calculator");
  const before = await win.boundingBox();
  // Grab the resize handle (bottom-right corner) by its own bounding box so we
  // always hit it, regardless of where the window landed on the stage.
  const handle = win.locator(".resize-handle");
  const hb = await handle.boundingBox();
  const hx = hb.x + hb.width / 2;
  const hy = hb.y + hb.height / 2;
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

test("clicking a window raises it (focus/z-index) and dragging to an edge snaps it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoApp(page);
  await page.locator("#calculatoricon").click();
  await page.locator("#notesicon").click();
  await page.waitForTimeout(150);

  // Notes opened after calculator => notes has the higher z-index (focused on top).
  const z = await page.evaluate(() => {
    const c = document.getElementById("calculator").style.zIndex;
    const n = document.getElementById("notes").style.zIndex;
    return { c: parseInt(c, 10) || 0, n: parseInt(n, 10) || 0 };
  });
  expect(z.n).toBeGreaterThan(z.c);

  // Drag notes aside so it no longer covers the calculator, then click the calculator
  // header -> it should come to front again.
  const nHead = page.locator("#notesheader");
  const nb = await nHead.boundingBox();
  await page.mouse.move(nb.x + 30, nb.y + 10);
  await page.mouse.down();
  await page.mouse.move(900, 420, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(80);
  const calcHead = page.locator("#calculatorheader");
  const cb = await calcHead.boundingBox();
  await page.mouse.click(cb.x + 20, cb.y + 8);
  await page.waitForTimeout(80);
  const z2 = await page.evaluate(() => {
    const c = document.getElementById("calculator").style.zIndex;
    const n = document.getElementById("notes").style.zIndex;
    return { c: parseInt(c, 10) || 0, n: parseInt(n, 10) || 0 };
  });
  expect(z2.c).toBeGreaterThan(z2.n);

  // Drag notes to the right edge -> should snap to right half (left ~= 50% of stage width).
  const header = page.locator("#notesheader");
  const box = await header.boundingBox();
  await page.mouse.move(box.x + 30, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(1260, 40, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const snap = await page.evaluate(() => {
    const n = document.getElementById("notes");
    return { left: Math.round(n.offsetLeft), width: Math.round(n.offsetWidth), stageW: 1280 };
  });
  expect(snap.left).toBeGreaterThan(snap.stageW * 0.4);
  expect(snap.width).toBeGreaterThan(snap.stageW * 0.4);
});

test("app launcher opens with Ctrl/Cmd+Space, filters, and launches an app", async ({ page }) => {
  await gotoApp(page);
  // Open with Ctrl+Space
  await page.keyboard.press("Control+Space");
  await expect(page.locator("#appLauncher")).toBeVisible();
  // It lists all apps initially
  expect(await page.locator(".app-launcher-item").count()).toBeGreaterThan(5);
  // Type to filter
  await page.locator("#appLauncherInput").fill("calc");
  await page.waitForTimeout(80);
  const items = page.locator(".app-launcher-item");
  expect(await items.count()).toBe(1);
  expect(await items.first().innerText()).toContain("Calculator");
  // Enter launches it and closes the launcher
  await page.keyboard.press("Enter");
  await expect(page.locator("#appLauncher")).toBeHidden();
  await expect(page.locator("#calculator")).toBeVisible();
  // Reopen and Esc closes without launching
  await page.keyboard.press("Control+Space");
  await expect(page.locator("#appLauncher")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#appLauncher")).toBeHidden();
});

test("right-click desktop shows context menu; wallpaper/refresh/toggle-icons work", async ({ page }) => {
  await gotoApp(page);
  // Right-click on empty desktop (top-left area away from icons/windows) opens the menu.
  await page.mouse.click(8, 120, { button: "right" });
  await expect(page.locator("#desktopContextMenu")).toBeVisible();
  // "Change wallpaper" opens Themes and switches to the wallpaper tab.
  await page.locator('.context-menu-item[data-action="wallpaper"]').click();
  await expect(page.locator("#themes")).toBeVisible();
  const wpActive = await page.evaluate(() =>
    document.getElementById("themesWallpaper").classList.contains("visible"));
  expect(wpActive).toBe(true);

  // Re-open menu and toggle icons off.
  await page.mouse.click(8, 120, { button: "right" });
  await expect(page.locator("#desktopContextMenu")).toBeVisible();
  await page.locator('.context-menu-item[data-action="toggle-icons"]').click();
  await expect(page.locator("#desktopApps")).toBeHidden();
  const hidden = await page.evaluate(() => localStorage.getItem("isaacos_desktop_icons"));
  expect(hidden).toBe("0");

  // Refresh is harmless (just re-layouts); clicking it should not throw.
  await page.mouse.click(8, 120, { button: "right" });
  await page.locator('.context-menu-item[data-action="refresh"]').click();
  await expect(page.locator("#desktopContextMenu")).toBeHidden();
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

test("Ctrl/Cmd+Tab app switcher cycles open windows; Esc closes focused window", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoApp(page);
  await page.locator("#calculatoricon").click();
  await page.locator("#notesicon").click();
  await page.waitForTimeout(150);

  // Open the switcher with Ctrl+Tab; it should list the open apps.
  await page.keyboard.down("Control");
  await page.keyboard.press("Tab");
  await expect(page.locator("#appSwitcher")).toBeVisible();
  const items = page.locator(".app-switcher-item");
  expect(await items.count()).toBeGreaterThanOrEqual(2);

  // Release Ctrl -> commits to the highlighted window (notes was front-most, so it stays).
  await page.keyboard.up("Control");
  await expect(page.locator("#appSwitcher")).toBeHidden();

  // Esc closes the focused (top) window.
  const topBefore = await page.evaluate(() => {
    let top = null, z = -1;
    document.querySelectorAll(".window").forEach((w) => {
      if (w.style.display === "none" || w.classList.contains("closing")) return;
      const zz = parseInt(w.style.zIndex, 10) || 0;
      if (zz > z) { z = zz; top = w.id; }
    });
    return top;
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const closed = await page.evaluate((id) => {
    const w = document.getElementById(id);
    return !w || w.style.display === "none" || w.classList.contains("closing");
  }, topBefore);
  expect(closed).toBe(true);
});

test("notifications: toasts stack, bell badge counts, center lists and clears", async ({ page }) => {
  await gotoApp(page);
  // Two toasts -> both appear in the live tray, bell badge shows 2, history recorded.
  await page.evaluate(() => { showToast("first"); showToast("second"); });
  await page.waitForTimeout(120);
  expect(await page.locator("#toastStack .toast").count()).toBe(2);
  const badge = await page.evaluate(() => document.getElementById("notifBadge").textContent);
  expect(badge).toBe("2");
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("isaacos_notifications") || "[]").length);
  expect(hist).toBe(2);

  // Open the center via the bell; it lists both and clears the unread badge.
  await page.locator("#notifBell").click();
  await expect(page.locator("#notifCenter")).toHaveClass(/open/);
  expect(await page.locator(".notif-row").count()).toBe(2);
  const badgeAfter = await page.evaluate(() => document.getElementById("notifBadge").style.display);
  expect(badgeAfter).toBe("none");

  // Clear all empties the center.
  await page.locator(".notif-clear").click();
  await expect(page.locator(".notif-empty")).toBeVisible();
});

test("overlays animate in: launcher/context-menu/notif-center get .open, bell bumps on new toast", async ({ page }) => {
  await gotoApp(page);
  // Launcher gets .open when shown via Ctrl+Space.
  await page.keyboard.press("Control+Space");
  await expect(page.locator(".app-launcher")).toHaveClass(/open/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".app-launcher")).not.toHaveClass(/open/);

  // Context menu gets .open on right-click desktop.
  await page.mouse.click(1150, 650, { button: "right" });
  await expect(page.locator("#desktopContextMenu")).toHaveClass(/open/);
  await page.keyboard.press("Escape");

  // Notification center gets .open when opened; bell bumps on a new toast.
  await page.evaluate(() => { document.getElementById("notifCenter").classList.remove("open"); document.getElementById("notifBell").classList.remove("bump"); });
  await page.evaluate(() => showToast("animated toast"));
  await page.waitForTimeout(30); // let updateNotifBadge add the bump class
  await expect(page.locator("#notifBell")).toHaveClass(/bump/);
  await page.locator("#notifBell").click();
  await expect(page.locator("#notifCenter")).toHaveClass(/open/);
});

test("layout lab: toggle Classic vs Dock re-skins the desktop, persists, no desktop icons in Dock", async ({ page }) => {
  await gotoApp(page);
  await page.locator("#layoutLabBtn").click();
  await expect(page.locator("#layoutlab")).toBeVisible();

  // Force Classic first (the comparison starts from a known state).
  await page.locator("#layoutClassic").click();
  expect(await page.evaluate(() => document.body.classList.contains("layout-classic"))).toBe(true);
  await expect(page.locator("#notesicon")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("isaacos_layout_mode"))).toBe("classic");

  // Switch to Dock: icons hidden, dock shows ALL apps (12, welcome excluded), redesign class present.
  await page.locator("#layoutDock").click();
  await expect(page.locator("#notesicon")).toBeHidden();
  expect(await page.evaluate(() => document.getElementById("dock").classList.contains("dock-redesign"))).toBe(true);
  expect(await page.locator("#dock .dock-item").count()).toBe(12);
  expect(await page.evaluate(() => localStorage.getItem("isaacos_layout_mode"))).toBe("dock");

  // Back to Classic restores icons and removes the redesign.
  await page.locator("#layoutClassic").click();
  await expect(page.locator("#notesicon")).toBeVisible();
  expect(await page.evaluate(() => document.getElementById("dock").classList.contains("dock-redesign"))).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem("isaacos_layout_mode"))).toBe("classic");
});


