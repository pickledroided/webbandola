import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DLC_BITS, introducedIn, dlcNames } from "./dlc.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://bindingofisaacrebirth.wiki.gg/api.php";
const DATA_DIR = join(__dirname, "..", "data");
const OUT_JS = join(DATA_DIR, "items.js");
const OUT_TRINKETS_JS = join(DATA_DIR, "trinkets.js");
const OUT_UNLOCKS_JS = join(DATA_DIR, "unlocks.js");
const PAGE = 500;
const DELAY_MS = 400;
const MAX_RETRIES = 8;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cargoQuery(params, retries) {
  retries = retries || 0;
  const url = API + "?" + new URLSearchParams({
    action: "cargoquery",
    format: "json",
    ...params,
  });
  const res = await fetch(url);
  if (res.status === 429 && retries < MAX_RETRIES) {
    const wait = 1500 * (retries + 1);
    console.error("rate limit, retry in", wait + "ms");
    await sleep(wait);
    return cargoQuery(params, retries + 1);
  }
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error) + " " + url);
  return (json.cargoquery || []).map((row) => row.title);
}

async function fetchTable(tables, fields, joinOn) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const params = {
      tables,
      fields,
      limit: String(PAGE),
      offset: String(offset),
    };
    if (joinOn) params.join_on = joinOn;
    const batch = await cargoQuery(params);
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
    await sleep(DELAY_MS);
  }
  return rows;
}

async function resolveImageUrls(files) {
  const uniq = [...new Set(files)].filter(Boolean);
  const map = {};
  const BATCH = 40;
  for (let i = 0; i < uniq.length; i += BATCH) {
    const chunk = uniq.slice(i, i + BATCH);
    let tries = 0;
    let found = 0;
    for (;;) {
      const titles = chunk.map((f) => "File:" + f).join("|");
      const url = API + "?" + new URLSearchParams({
        action: "query",
        format: "json",
        prop: "imageinfo",
        iiprop: "url",
        titles,
      });
      const res = await fetch(url);
      if (res.status === 429 && tries < MAX_RETRIES) {
        tries++;
        await sleep(1500 * tries);
        continue;
      }
      const json = await res.json();
      const pages = json.query && json.query.pages ? json.query.pages : {};
      for (const page of Object.values(pages)) {
        if (page.imageinfo && page.imageinfo[0]) {
          const raw = (page.title || "").replace(/^File:/, "");
          const norm = raw.replace(/ /g, "_").toLowerCase();
          const url = page.imageinfo[0].url;
          map[norm] = url;
          map[raw.toLowerCase()] = url;
          found++;
        }
      }
      if (found === 0 && tries < MAX_RETRIES) {
        tries++;
        console.error("chunk vuoto, retry in", 2000 * tries + "ms");
        await sleep(2000 * tries);
        continue;
      }
      break;
    }
    await sleep(DELAY_MS);
  }
  return map;
}

function cleanWiki(text) {
  if (!text) return "";
  let s = text
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<nowiki>[\s\S]*?<\/nowiki>/gi, "")
    .replace(/\[\[File:[^\]]*\]\]/gi, " ")
    .replace(/\[\[Category:[^\]]*\]\]/gi, "")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/{{[^{}]*}}/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!])(?![?])/g, "$1")
    .trim();
  return s;
}

function pickLatest(rows) {
  const byItem = {};
  for (const r of rows) {
    const key = r.item;
    const cur = byItem[key];
    const dlc = parseInt(r.dlc, 10) || 0;
    if (!cur || cur.dlc < dlc) byItem[key] = Object.assign({}, r, { dlc });
  }
  return byItem;
}

function extractUnlock(req, portraitMap) {
  if (!req) return null;
  const entities = reqEntities(req);
  const bosses = [];
  const seenBoss = new Set();
  const characters = [];
  const seenChar = new Set();
  for (const e of entities) {
    if (CHAR_FILE_RE.test(e.file)) {
      let name = e.name;
      if (/^Character /.test(e.file)) name = e.file.replace(/^Character /, "").replace(/ icon\.(?:png|jpg)$/, "");
      name = name.replace(/ \(Character\)$/i, "");
      if (seenChar.has(name)) continue;
      seenChar.add(name);
      characters.push({ name, icon: "", file: "Character " + name + " icon.png" });
    } else if (BOSS_FILE_RE.test(e.file)) {
      let name = e.name;
      name = name.replace(/#.*$/, "").replace(/ \(Boss\)$/i, "");
      if (!seenBoss.has(name)) seenBoss.add(name);
      const portrait = portraitMap[name];
      bosses.push({
        name: name,
        icon: portrait ? portrait.icon : "",
        ingame: e.file,
      });
    }
  }
  return {
    text: cleanWiki(req),
    bosses,
    characters,
  };
}

const names = await fetchTable(
  "collectible_name",
  "collectible_name.collectible=item,collectible_name.name=name,collectible_name.dlc=dlc"
);
await sleep(DELAY_MS);
const quotes = await fetchTable(
  "collectible_quote",
  "collectible_quote.collectible=item,collectible_quote.quote=quote,collectible_quote.dlc=dlc"
);
await sleep(DELAY_MS);
const qualities = await fetchTable(
  "collectible_quality",
  "collectible_quality.collectible=item,collectible_quality.quality=quality,collectible_quality.dlc=dlc"
);
await sleep(DELAY_MS);
const images = await fetchTable(
  "collectible_image",
  "collectible_image.collectible=item,collectible_image.file=file,collectible_image.dlc=dlc"
);
await sleep(DELAY_MS);
const parents = await fetchTable(
  "collectible",
  "collectible.link=link,collectible.alias=alias,collectible.id=id,collectible.is_activated=is_activated,collectible.dlc=dlc,collectible.description=description"
);

const nameMap = pickLatest(names);
const quoteMap = pickLatest(quotes);
const qualityMap = pickLatest(qualities);
const imageMap = pickLatest(images);

const fileUrls = await resolveImageUrls(
  Object.values(imageMap).map((r) => r.file)
);

await sleep(DELAY_MS);
const portraitRows = await fetchTable(
  "boss_portrait",
  "boss_portrait.entity=entity,boss_portrait.portrait=portrait,boss_portrait.dlc=dlc"
);
const portraitLatest = {};
for (const r of portraitRows) {
  const key = r.entity;
  const cur = portraitLatest[key];
  const dlc = parseInt(r.dlc, 10) || 0;
  if (!cur || cur.dlc < dlc) portraitLatest[key] = Object.assign({}, r, { dlc });
}
const portraitFiles = Object.values(portraitLatest).map((r) => r.portrait);
const portraitUrls = await resolveImageUrls(portraitFiles);
const portraitMap = {};
for (const r of Object.values(portraitLatest)) {
  portraitMap[r.entity] = {
    name: r.entity,
    portrait: r.portrait,
    icon: portraitUrls[r.portrait.toLowerCase()] || "",
  };
}

await sleep(DELAY_MS);
const achs = await fetchTable(
  "achievement",
  "achievement.link=link,achievement.requirements=req"
);
await sleep(DELAY_MS);
const poolRows = await fetchTable(
  "pool_collectible",
  "pool_collectible.collectible=collectible,pool_collectible.pool=pool,pool_collectible.dlc=dlc"
);

await sleep(DELAY_MS);
const trinketParents = await fetchTable(
  "trinket",
  "trinket.link=link,trinket.alias=alias,trinket.id=id,trinket.dlc=dlc,trinket.description=description"
);
await sleep(DELAY_MS);
const trinketNames = await fetchTable(
  "trinket_name",
  "trinket_name.trinket=trinket,trinket_name.name=name,trinket_name.dlc=dlc"
);
await sleep(DELAY_MS);
const trinketQuotes = await fetchTable(
  "trinket_quote",
  "trinket_quote.trinket=trinket,trinket_quote.quote=quote,trinket_quote.dlc=dlc"
);
await sleep(DELAY_MS);
const trinketImages = await fetchTable(
  "trinket_image",
  "trinket_image.trinket=trinket,trinket_image.file=file,trinket_image.dlc=dlc"
);
await sleep(DELAY_MS);
const achFull = await fetchTable(
  "achievement",
  "achievement.link=link,achievement.alias=alias,achievement.name=name,achievement.id=id,achievement.dlc=dlc,achievement.description=description,achievement.requirements=req"
);
await sleep(DELAY_MS);
const achImages = await fetchTable(
  "achievement_image",
  "achievement_image.achievement=achievement,achievement_image.file=file,achievement_image.dlc=dlc"
);
await sleep(DELAY_MS);
const playerRows = await fetchTable(
  "player",
  "player._pageName=page,player.alias=alias,player.name=name,player.unlocked_by=unlockedBy,player.dlc=dlc,player.parent=parent,player.id=pid"
);
await sleep(DELAY_MS);
const challengeRows = await fetchTable(
  "challenge",
  "challenge.alias=alias,challenge.number=number,challenge.goal=goal,challenge.unlocks=unlocks,challenge.unlocked_by=unlockedBy,challenge.dlc=dlc"
);

// --- Entity parser per req (boss + character, con nome visualizzato) ---
function normalizeKey(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeCharKey(s) {
  return normalizeKey(String(s || "").replace(/\band\b/gi, "&").replace(/\s+/g, " "));
}

function reqEntities(req) {
  const files = [];
  const links = [];
  const fre = /\[\[File:([^\]|]+?\.(?:png|jpg|jpeg))[^\]]*?\]\]/g;
  let m;
  while ((m = fre.exec(req || ""))) {
    files.push({ file: m[1].trim(), end: m.index + m[0].length });
  }
  const lre = /\[\[:([^|\]]+)(?:\|([^\]]*))?\]\]/g;
  while ((m = lre.exec(req || ""))) {
    links.push({ target: m[1], disp: m[2] ? m[2] : m[1], index: m.index });
  }
  const out = [];
  for (const f of files) {
    const l = links.find((x) => x.index >= f.end);
    if (!l) continue;
    out.push({ file: f.file, name: (l.disp || l.target).trim() });
  }
  return out;
}

const BOSS_FILE_RE = /^(?:Boss |.*secondphase ingame\.|Mega Satan Head)/i;
const CHAR_FILE_RE = /^Character .*? icon\.(?:png|jpg)$/i;

const items = [];

// --- Pack per item (chiave: item.nome lowercase; per ogni pool tieni il più alto) ---
const poolByItem = {};
for (const r of poolRows) {
  const itemName = (r.collectible || "").toLowerCase();
  const pool = r.pool;
  const dlc = parseInt(r.dlc, 10) || 0;
  if (!poolByItem[itemName]) poolByItem[itemName] = new Map();
  const m = poolByItem[itemName];
  const cur = m.get(pool);
  if (!cur || cur.dlc < dlc) m.set(pool, { dlc });
}
function poolsForName(name) {
  const m = poolByItem[(name || "").toLowerCase()];
  return m ? [...m.keys()].sort() : [];
}
for (const p of parents) {
  const key = p.alias || p.link;
  const entry = {
    key: p.alias || p.link,
    id: p.id === "" || p.id == null ? null : parseInt(p.id, 10),
    name: (nameMap[key] && nameMap[key].name) || key,
    active: p.is_activated === "1",
    dlc: parseInt(p.dlc, 10) || 0,
    quality: qualityMap[key] ? parseInt(qualityMap[key].quality, 10) : null,
    quote: (quoteMap[key] && quoteMap[key].quote) || "",
    description: cleanWiki(p.description),
    icon: imageMap[key]
      ? (fileUrls[imageMap[key].file.toLowerCase()] || "")
      : "",
    wiki: "https://bindingofisaacrebirth.wiki.gg/wiki/" +
      encodeURIComponent(p.link.replace(/ /g, "_")),
  };
  entry.introduced = introducedIn(entry.dlc);
  entry.dlcList = dlcNames(entry.dlc);
  entry.page = p.link;
  entry.pools = poolsForName(entry.name);
  items.push(entry);
}

items.sort((a, b) => (a.id === null) - (b.id === null) || a.id - b.id);

const unlockByLink = new Map();
for (const a of achs) {
  if (!unlockByLink.has(a.link)) unlockByLink.set(a.link, a);
}
const charFiles = new Set();
const bossIngameFiles = new Set();
for (const a of achs) {
  const u = extractUnlock(a.req, portraitMap);
  if (!u) continue;
  for (const c of u.characters) charFiles.add(c.file);
  for (const b of u.bosses) if (b.ingame) bossIngameFiles.add(b.ingame);
}
const charUrls = await resolveImageUrls([...charFiles]);
const bossIngameUrls = await resolveImageUrls([...bossIngameFiles]);
for (const item of items) {
  const ach = unlockByLink.get(item.page) || unlockByLink.get(item.name) || unlockByLink.get(item.key);
  if (!ach) continue;
  const u = extractUnlock(ach.req, portraitMap);
  if (!u) continue;
  for (const c of u.characters) {
    c.icon = charUrls[(c.file || "").toLowerCase()] || "";
  }
  for (const b of u.bosses) {
    if (!b.icon) b.icon = bossIngameUrls[(b.ingame || "").toLowerCase()] || "";
  }
  item.unlock = u;
}

const withUnlock = items.filter((i) => i.unlock);
const bossStats = new Map();
const charStats = new Map();
for (const i of withUnlock) {
  for (const b of i.unlock.bosses) bossStats.set(b.name, (bossStats.get(b.name) || 0) + 1);
  for (const c of i.unlock.characters) charStats.set(c.name, (charStats.get(c.name) || 0) + 1);
}

// --- Trinkets ---
const trinketNameMap = pickLatest(trinketNames.map((r) => ({ item: r.trinket, name: r.name, dlc: r.dlc })));
const trinketQuoteMap = pickLatest(trinketQuotes.map((r) => ({ item: r.trinket, quote: r.quote, dlc: r.dlc })));
const trinketImageMap = pickLatest(trinketImages.map((r) => ({ item: r.trinket, file: r.file, dlc: r.dlc })));
const trinketFileUrls = await resolveImageUrls(
  Object.values(trinketImageMap).map((r) => r.file)
);
const trinkets = [];
for (const p of trinketParents) {
  const key = p.alias || p.link;
  const entry = {
    key,
    id: p.id === "" || p.id == null ? null : parseInt(p.id, 10),
    name: (trinketNameMap[key] && trinketNameMap[key].name) || key,
    dlc: parseInt(p.dlc, 10) || 0,
    quote: (trinketQuoteMap[key] && trinketQuoteMap[key].quote) || "",
    description: cleanWiki(p.description),
    icon: trinketImageMap[key]
      ? (trinketFileUrls[trinketImageMap[key].file.toLowerCase()] || "")
      : "",
    wiki: "https://bindingofisaacrebirth.wiki.gg/wiki/" +
      encodeURIComponent((p.link || p.alias || "").replace(/ /g, "_")),
  };
  entry.introduced = introducedIn(entry.dlc);
  entry.dlcList = dlcNames(entry.dlc);
  entry.page = p.link || p.alias;
  trinkets.push(entry);
}
trinkets.sort((a, b) => (a.id === null) - (b.id === null) || a.id - b.id);

// --- Unlocks (achievements) ---
const achImageMap = pickLatest(achImages.map((r) => ({ item: r.achievement, file: r.file, dlc: r.dlc })));
const achFileUrls = await resolveImageUrls(
  Object.values(achImageMap).map((r) => r.file)
);
const unlocks = [];
const uniqueAch = new Map();
for (const a of achFull) {
  const key = a.alias || a.name || a.link;
  const id = a.id === "" || a.id == null ? null : parseInt(a.id, 10);
  const cur = uniqueAch.get(key);
  const dlc = parseInt(a.dlc, 10) || 0;
  if (!cur || cur.dlc < dlc) {
    uniqueAch.set(key, {
      key,
      id,
      name: a.name || key,
      dlc,
      req: a.req || "",
      description: cleanWiki(a.description),
      link: a.link,
    });
  }
}
for (const [, a] of uniqueAch) {
  const entry = {
    key: a.key,
    id: a.id,
    name: a.name,
    dlc: a.dlc,
    introduced: introducedIn(a.dlc),
    dlcList: dlcNames(a.dlc),
    description: cleanWiki(a.description),
    requirements: cleanWiki(a.req),
    icon: achImageMap[a.key]
      ? (achFileUrls[achImageMap[a.key].file.toLowerCase()] || "")
      : "",
    wiki: "https://bindingofisaacrebirth.wiki.gg/wiki/" +
      encodeURIComponent((a.link || a.name || "").replace(/ /g, "_")),
  };
  unlocks.push(entry);
}
unlocks.sort((a, b) => (a.id === null) - (b.id === null) || a.id - b.id);

// --- Characters ---
const achByNorm = new Map(); // chiave normalizzata (alias o nome) -> achievement
for (const [, a] of uniqueAch) {
  const keys = [a.key, a.name, a.name !== a.key ? a.alias : ""].filter(Boolean);
  for (const k of keys) {
    const nk = k.toLowerCase();
    const cur = achByNorm.get(nk);
    if (!cur || a.dlc > cur.dlc) achByNorm.set(nk, a);
  }
}
const playerMain = [];
const seenPlayer = new Set();
for (const r of playerRows) {
  if (r.parent) continue;
  if (seenPlayer.has(r.page)) continue;
  seenPlayer.add(r.page);
  playerMain.push(r);
}
const charIconCandidates = [];
for (const r of playerMain) {
  const names = [r.alias, r.name, r.page, r.page && r.page.replace(/&/g, "and")].filter(Boolean);
  for (const n of names) {
    charIconCandidates.push("Character " + n + " icon.png");
  }
}
const charIconUrls = await resolveImageUrls([...new Set(charIconCandidates)]);
const characters = [];
for (const r of playerMain) {
  const rowKey = r.alias || r.page;
  const ach = r.unlockedBy
    ? (achByNorm.get(r.unlockedBy.toLowerCase()) || achByNorm.get(rowKey.toLowerCase()))
    : achByNorm.get(rowKey.toLowerCase());
  const iconCandidates = [r.alias, r.name, r.page, r.page && r.page.replace(/&/g, "and")];
  let icon = "";
  for (const n of iconCandidates) {
    if (!n) continue;
    const u = charIconUrls[("character " + n + " icon.png").toLowerCase()];
    if (u) { icon = u; break; }
  }
  characters.push({
    key: rowKey,
    name: r.name === "Bot" || r.name === r.alias ? r.page : r.name || r.page,
    dlc: parseInt(r.dlc, 10) || 0,
    introduced: introducedIn(parseInt(r.dlc, 10) || 0),
    dlcList: dlcNames(parseInt(r.dlc, 10) || 0),
    icon,
    unlock: ach && ach.req ? cleanWiki(ach.req) : "",
    unlockName: ach ? ach.name : "",
    wiki: "https://bindingofisaacrebirth.wiki.gg/wiki/" + encodeURIComponent(r.page.replace(/ /g, "_")),
  });
}

// --- Boss-kill unlocks per character ---
const bossUnlockByChar = new Map();
const pushBossUnlock = (charNorm, entry) => {
  const arr = bossUnlockByChar.get(charNorm) || [];
  arr.push(entry);
  bossUnlockByChar.set(charNorm, arr);
};
for (const [, a] of uniqueAch) {
  const ents = reqEntities(a.req || "");
  const chars = new Set();
  const bosses = [];
  const seenBoss = new Set();
  for (const e of ents) {
    if (CHAR_FILE_RE.test(e.file)) {
      let n = e.name;
      if (/^Character /.test(e.file)) n = e.file.replace(/^Character /, "").replace(/ icon\.(?:png|jpg)$/, "");
      n = n.replace(/ \(Character\)$/i, "");
      if (n) chars.add(normalizeCharKey(n));
    } else if (BOSS_FILE_RE.test(e.file)) {
      let nm = e.name.replace(/#.*$/, "").replace(/ \(Boss\)$/i, "");
      if (!nm) continue;
      if (seenBoss.has(nm)) continue;
      seenBoss.add(nm);
      const portrait = portraitMap[nm];
      const icon = (portrait && portrait.icon) || bossIngameUrls[e.file.toLowerCase()] || "";
      bosses.push({ name: nm, icon });
    }
  }
  if (chars.size === 0 || bosses.length === 0) continue;
  const itemIcon = achImageMap[a.key] ? (achFileUrls[achImageMap[a.key].file.toLowerCase()] || "") : "";
  const reward = a.name || a.key;
  const dlc = a.dlc || 0;
  for (const c of chars) {
    for (const b of bosses) {
      pushBossUnlock(c, {
        boss: b,
        item: reward,
        itemIcon,
        dlc,
      });
    }
  }
}
const charNormCandidates = (r) => [r.key, r.page, r.name, r.name.replace(/ \(Character\)$/i, "")].filter(Boolean);
for (const c of characters) {
  const norms = charNormCandidates(c).map(normalizeCharKey);
  const out = [];
  const done = new Set();
  for (const n of norms) {
    const arr = bossUnlockByChar.get(n) || [];
    for (const e of arr) {
      const sig = e.boss.name + "|" + e.item;
      if (done.has(sig)) continue;
      done.add(sig);
      out.push(e);
    }
  }
  out.sort((x, y) => (x.dlc - y.dlc) || x.item.localeCompare(y.item));
  c.bossUnlocks = out;
}

// Mom's Heart e It Lives! sbloccano gli stessi item per un personaggio -> tieni solo It Lives!
for (const c of characters) {
  const mh = new Set(c.bossUnlocks.filter((b) => b.boss.name === "Mom's Heart").map((b) => b.item));
  const il = new Set(c.bossUnlocks.filter((b) => b.boss.name === "It Lives!").map((b) => b.item));
  const same = mh.size > 0 && il.size > 0 && mh.size === il.size && [...mh].every((x) => il.has(x));
  if (same) {
    c.bossUnlocks = c.bossUnlocks.filter((b) => b.boss.name !== "Mom's Heart");
  }
}

// --- Challenges ---
function challengeGoal(raw) {
  const clean = cleanWiki(raw);
  if (clean) return clean;
  const m = (raw || "").match(/link=([^|\]]*)/);
  return m ? m[1].trim() : "";
}

const unlockIconByNorm = new Map();
for (const [, a] of uniqueAch) {
  const icon = achImageMap[a.key] ? (achFileUrls[achImageMap[a.key].file.toLowerCase()] || "") : "";
  for (const k of [a.key, a.name]) {
    const nk = normalizeKey(k);
    if (!unlockIconByNorm.has(nk) || icon) unlockIconByNorm.set(nk, icon);
  }
}
const challenges = [];
for (const row of challengeRows) {
  const num = parseInt(row.number, 10);
  const by = row.unlockedBy;
  const unlockAch = by ? achByNorm.get(by.toLowerCase()) : null;
  const iconFile = unlockAch && achImageMap[unlockAch.key]
    ? achFileUrls[achImageMap[unlockAch.key].file.toLowerCase()]
    : "";
  const reward = cleanWiki(row.unlocks);
  const fallbackIcon = !iconFile ? (unlockIconByNorm.get(normalizeKey(reward)) || "") : "";
  challenges.push({
    key: row.alias || num,
    name: row.alias || String(num),
    number: isNaN(num) ? null : num,
    dlc: parseInt(row.dlc, 10) || 0,
    introduced: introducedIn(parseInt(row.dlc, 10) || 0),
    dlcList: dlcNames(parseInt(row.dlc, 10) || 0),
    icon: iconFile || fallbackIcon,
    goal: challengeGoal(row.goal),
    reward,
    requirements: unlockAch && unlockAch.req ? cleanWiki(unlockAch.req) : "",
    unlockName: unlockAch ? unlockAch.name : "",
    wiki: "https://bindingofisaacrebirth.wiki.gg/wiki/Challenges#" +
      encodeURIComponent(String(row.alias || num).replace(/ /g, "_")),
  });
}

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(OUT_JS, "window.ISAAC_ITEMS = " + JSON.stringify(items) + ";\n", "utf8");
writeFileSync(OUT_TRINKETS_JS, "window.ISAAC_TRINKETS = " + JSON.stringify(trinkets) + ";\n", "utf8");
writeFileSync(OUT_UNLOCKS_JS, "window.ISAAC_UNLOCKS = " + JSON.stringify(unlocks) + ";\n", "utf8");

writeFileSync(join(DATA_DIR, "characters.js"), "window.ISAAC_CHARACTERS = " + JSON.stringify(characters) + ";\n", "utf8");

writeFileSync(join(DATA_DIR, "challenges.js"), "window.ISAAC_CHALLENGES = " + JSON.stringify(challenges) + ";\n", "utf8");

console.log("TOTALE ITEM:", items.length);
console.log("con id:", items.filter((i) => i.id !== null).length);
console.log("senza id:", items.filter((i) => i.id === null).length);
console.log("attivi:", items.filter((i) => i.active).length);
console.log("passivi:", items.filter((i) => !i.active).length);
console.log("senza descrizione:", items.filter((i) => !i.description).length);
console.log("senza icona:", items.filter((i) => !i.icon).length);
console.log("senza quote:", items.filter((i) => !i.quote).length);
console.log("qualità null:", items.filter((i) => i.quality === null).length);
console.log("per DLC d'introduzione:");
for (const [, name] of DLC_BITS) {
  console.log("  ", name, items.filter((i) => i.introduced === name).length);
}
console.log("scritto:", OUT_JS);
console.log("TOTALE TRINKET:", trinkets.length);
console.log("trinket senza icona:", trinkets.filter((t) => !t.icon).length);
console.log("scritto:", OUT_TRINKETS_JS);
console.log("TOTALE UNLOCK:", unlocks.length);
console.log("unlock senza icona:", unlocks.filter((u) => !u.icon).length);
console.log("unlock senza descrizione:", unlocks.filter((u) => !u.description).length);
console.log("scritto:", OUT_UNLOCKS_JS);
console.log("TOTALE CHARACTER:", characters.length);
console.log("character senza icona:", characters.filter((c) => !c.icon).length);
console.log("character senza requirements:", characters.filter((c) => !c.unlock).length);
console.log("TOTALE CHALLENGE:", challenges.length);
console.log("challenge senza icona:", challenges.filter((c) => !c.icon).length);
console.log("challenge senza requirements:", challenges.filter((c) => !c.requirements).length);
console.log("con unlock:", withUnlock.length);
console.log("senza pool:", items.filter((i) => i.pools.length === 0).length);
console.log("pool distinti:", new Set(items.flatMap((i) => i.pools)).size);
console.log("unlock senza boss:", withUnlock.filter((i) => i.unlock.bosses.length === 0).length);
console.log("unlock senza personaggio:", withUnlock.filter((i) => i.unlock.characters.length === 0).length);
console.log("boss senza icona:", [...bossStats.keys()].filter((b) => portraitMap[b] && !portraitMap[b].icon).join(", ") || "nessuno");
console.log("personaggi senza icona:", [...charStats.keys()].filter((c) => { const f = "character " + c + " icon.png"; return !charUrls[f] && !charUrls[f.toLowerCase()]; }).join(", ") || "nessuno");
