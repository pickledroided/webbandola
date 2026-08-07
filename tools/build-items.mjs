import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://bindingofisaacrebirth.wiki.gg/api.php";
const DATA_DIR = join(__dirname, "..", "data");
const OUT_JSON = join(DATA_DIR, "items.json");
const OUT_JS = join(DATA_DIR, "items.js");
const PAGE = 500;
const DELAY_MS = 400;
const MAX_RETRIES = 8;

const DLC_BITS = [
  [1, "Rebirth"],
  [2, "Afterbirth"],
  [4, "Afterbirth+"],
  [8, "Repentance"],
  [16, "Repentance+"],
];

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
  const BATCH = 50;
  for (let i = 0; i < uniq.length; i += BATCH) {
    const chunk = uniq.slice(i, i + BATCH);
    let tries = 0;
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
        const name = (page.title || "").replace(/^File:/, "");
        if (page.imageinfo && page.imageinfo[0]) {
          map[name.toLowerCase()] = page.imageinfo[0].url;
        }
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

function dlcOf(mask) {
  const out = [];
  for (const [bit, name] of DLC_BITS) {
    if ((mask & bit) === bit) out.push(name);
  }
  return out;
}

function introducedIn(mask) {
  for (const [bit, name] of DLC_BITS) {
    if ((mask & bit) === bit) return name;
  }
  return "Rebirth";
}

function dlcNames(mask) {
  const list = dlcOf(mask);
  return list.length === DLC_BITS.length ? "Tutte le DLC" : list.join(" + ");
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

const BOSS_IMG_RE = /\[\[File:Boss (.*?) ingame\.(?:png|jpg)[^\]]*\]\]/gi;
const CHAR_IMG_RE = /\[\[File:Character (.*?) icon\.(?:png|jpg)[^\]]*\]\]/gi;

function extractUnlock(req, portraitMap) {
  if (!req) return null;
  const bosses = [];
  const seenBoss = new Set();
  let m;
  BOSS_IMG_RE.lastIndex = 0;
  while ((m = BOSS_IMG_RE.exec(req))) {
    let entity = m[1].trim().replace(/ secondphase$/i, "");
    if (seenBoss.has(entity)) continue;
    seenBoss.add(entity);
    const portrait = portraitMap[entity];
    bosses.push({
      name: entity,
      icon: portrait ? portrait.icon : "",
      ingame: m[0].match(/Boss .*? ingame\.(?:png|jpg)/)[0],
    });
  }
  const characters = [];
  const seenChar = new Set();
  CHAR_IMG_RE.lastIndex = 0;
  while ((m = CHAR_IMG_RE.exec(req))) {
    const name = m[1].trim();
    if (seenChar.has(name)) continue;
    seenChar.add(name);
    characters.push({ name, icon: "", file: "Character " + m[1].trim() + " icon.png" });
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

const items = [];

// pool per item (chiave: nome lowercase; per ogni pool tieni il dlc piu' alto)
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

mkdirSync(DATA_DIR, { recursive: true });
const jsonText = JSON.stringify(items, null, 2) + "\n";
writeFileSync(OUT_JSON, jsonText, "utf8");
writeFileSync(OUT_JS, "window.ISAAC_ITEMS = " + JSON.stringify(items) + ";\n", "utf8");

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
console.log("scritto:", OUT_JSON);
console.log("scritto:", OUT_JS);
console.log("con unlock:", withUnlock.length);
console.log("senza pool:", items.filter((i) => i.pools.length === 0).length);
console.log("pool distinti:", new Set(items.flatMap((i) => i.pools)).size);
console.log("unlock senza boss:", withUnlock.filter((i) => i.unlock.bosses.length === 0).length);
console.log("unlock senza personaggio:", withUnlock.filter((i) => i.unlock.characters.length === 0).length);
console.log("boss senza icona:", [...bossStats.keys()].filter((b) => portraitMap[b] && !portraitMap[b].icon).join(", ") || "nessuno");
console.log("personaggi senza icona:", [...charStats.keys()].filter((c) => { const f = "character " + c + " icon.png"; return !charUrls[f] && !charUrls[f.toLowerCase()]; }).join(", ") || "nessuno");
