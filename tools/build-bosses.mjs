import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { introducedIn, dlcNames } from "./dlc.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

function loadData(file, prefix) {
  const raw = readFileSync(join(DATA_DIR, file), "utf8")
    .trim()
    .replace(prefix, "")
    .replace(/;$/g, "");
  return JSON.parse(raw);
}

const characters = loadData("characters.js", "window.ISAAC_CHARACTERS = ");
const items = loadData("items.js", "window.ISAAC_ITEMS = ");

const LOCATIONS = {
  "???": "The Chest, il piano finale raggiunto con The Polaroid dopo Isaac.",
  "Baby Plum": "Piano 1 (Downpour/Dross), boss optionale.",
  "Big Horn": "Piano 2 (Caves/Flooded Caves), boss optionale.",
  "Blastocyst": "Piano 4 (Womb/Scarred Womb), boss optionale.",
  "Boss Rush": "Porta temporizzata in Chapter 3: sconfiggi Mom entro 20 minuti.",
  "C.H.A.D.": "Piano 2 (Caves/Flooded Caves), boss optionale.",
  "Carrion Queen": "Piano 2 (Catacombs), boss optionale.",
  "Chimera": "Corpse, boss optionale.",
  "Chub": "Piano 2 (Caves), boss optionale.",
  "Clog": "Piano 1 (Dross), boss optionale.",
  "Colostomia": "Piano 1 (Dross), boss optionale.",
  "Conquest": "Piano 4 (Womb/Scarred Womb), compare quando si combatte la morte.",
  "Daddy Long Legs": "Piano 4 (Womb/Utero), boss optionale.",
  "Dangle": "Piano 1 (Basement), boss optionale.",
  "Dark One": "Piano 2 (Catacombs), boss optionale.",
  "Death": "Piano 4 (Womb/Utero), uno dei quattro cavalieri.",
  "Delirium": "The Void: raggiungibile tramite il portale che compare dopo i boss finali.",
  "Dingle": "Piano 1 (Basement), boss optionale.",
  "Dogma": "Home, prima della Mother.",
  "Famine": "Piano 1 (Basement/Cellar/Burning Basement), uno dei quattro cavalieri.",
  "Fistula": "Piano 1 (Cellar), boss optionale.",
  "Gemini": "Piano 1 (Basement), boss optionale.",
  "Gish": "Piano 3 (Depths/Dank Depths), boss optionale.",
  "Great Gideon": "Piano 2 (Ashpit/Mines), boss optionale.",
  "Gurdy": "Piano 2 (Caves), boss optionale.",
  "Gurdy Jr.": "Piano 2 (Caves/Catacombs), boss optionale.",
  "Gurglings": "Piano 1 (Basement), boss optionale.",
  "Headless Horseman": "Piano 2 (Caves/Flooded Caves), boss optionale.",
  "Hornfel": "Piano 2 (Mines), boss optionale.",
  "Hush": "Piano ???: sconfiggi Mom's Heart o It Lives! entro 30 minuti.",
  "Isaac": "Cathedral, il piano finale raggiunto con The Polaroid.",
  "It Lives!": "Piano 4: sconfiggi Mom's Heart 11 volte.",
  "Krampus": "Devil Room, dopo aver colpito il Devil Beggar in Devil Room.",
  "Larry Jr.": "Piano 1 (Basement), boss optionale.",
  "Lil Blub": "Piano 1 (Downpour/Dross), boss optionale.",
  "Little Horn": "Piano 1 (Basement), boss optionale.",
  "Loki": "Piano 3 (Necropolis), boss optionale.",
  "Lokii": "Piano 4 (Womb/Utero), boss optionale.",
  "Mama Gurdy": "Piano 4 (Womb/Utero), boss optionale.",
  "Mask of Infamy": "Piano 3 (Necropolis), boss optionale.",
  "Mega Fatty": "Piano 2 (Caves), boss optionale.",
  "Mega Maw": "Piano 2 (Caves), boss optionale.",
  "Mega Satan": "Chest/Dark Room: raccogli due Key Piece e apri la Golden Gate.",
  "Min-Min": "Piano 1 (Downpour), boss optionale.",
  "Mom": "Piano 3 (Depths/Necropolis), la madre di Isaac.",
  "Mom's Heart": "Piano 4 (Womb/Utero), dopo aver sconfitto Mom.",
  "Monstro": "Piano 1 (Basement), boss optionale.",
  "Monstro II": "Piano 3 (Depths/Dank Depths), boss optionale.",
  "Mother": "Corpse: prosegui dopo Dogma nella Home per raggiungerla.",
  "Mr. Fred": "Piano 4 (Utero), boss optionale.",
  "Peep": "Piano 2 (Caves/Catacombs), boss optionale.",
  "Pestilence": "Piano 2 (Caves/Catacombs), uno dei quattro cavalieri.",
  "Pin": "Piano 1 (Cellar), boss optionale.",
  "Polycephalus": "Piano 2 (Catacombs), boss optionale.",
  "Rag Man": "Piano 1 (Basement), boss optionale.",
  "Rag Mega": "Piano 2 (Catacombs/Flooded Caves), boss optionale.",
  "Reap Creep": "Piano 2 (Mines), boss optionale.",
  "Rotgut": "Corpse, boss optionale.",
  "Satan": "Sheol, il piano finale raggiunto con The Negative.",
  "Scolex": "Piano 4 (Womb), boss optionale.",
  "Singe": "Piano 2 (Ashpit), boss optionale.",
  "Sisters Vis": "Piano 4 (Womb/Utero/Scarred Womb), boss optionale.",
  "Steven": "Piano 1 (Basement), boss optionale.",
  "Teratoma": "Piano 4 (Womb/Scarred Womb), boss optionale.",
  "The Adversary": "Piano 3 (Depths/Necropolis), boss optionale.",
  "The Beast": "Home: la battaglia finale dopo la Mother.",
  "The Bloat": "Piano 4 (Womb/Scarred Womb), boss optionale.",
  "The Cage": "Piano 3 (Depths), boss optionale.",
  "The Duke of Flies": "Piano 1 (Basement/Cellar/Burning Basement), boss optionale.",
  "The Fallen": "Piano 1/3, compare nei Devil Room.",
  "The Forsaken": "Piano 2 (Catacombs), boss optionale.",
  "The Frail": "Piano 2 (Catacombs), boss optionale.",
  "The Gate": "Piano 3 (Depths), boss optionale.",
  "The Haunt": "Piano 1 (Cellar/Burning Basement), boss optionale.",
  "The Heretic": "Piano 3 (Mausoleum), boss optionale.",
  "The Hollow": "Piano 2 (Catacombs), boss optionale.",
  "The Horny Boys": "Piano 3 (Gehenna), boss optionale.",
  "The Husk": "Piano 2 (Catacombs), boss optionale.",
  "The Lamb": "Dark Room, il piano finale raggiunto con The Negative.",
  "The Matriarch": "Piano 4 (Scarred Womb), boss optionale.",
  "The Pile": "Piano 2 (Ashpit), boss optionale.",
  "The Rainmaker": "Piano 1 (Downpour), boss optionale.",
  "The Scourge": "Corpse, boss optionale.",
  "The Shell": "Piano 2 (Ashpit), boss optionale.",
  "The Siren": "Piano 3 (Mausoleum), boss optionale.",
  "The Stain": "Piano 2 (Caves/Catacombs), boss optionale.",
  "The Visage": "Piano 3 (Mausoleum), boss optionale.",
  "The Wretched": "Piano 2 (Catacombs), boss optionale.",
  "Triachnid": "Piano 4 (Womb/Utero), boss optionale.",
  "Tuff Twins": "Piano 2 (Mines), boss optionale.",
  "Turdlet": "Piano 1 (Dross), boss optionale.",
  "Turdlings": "Piano 1 (Basement), boss optionale.",
  "Ultra Death": "Home: ultra variant del cavaliere.",
  "Ultra Famine": "Home: ultra variant del cavaliere.",
  "Ultra Greed": "Greed Mode: boss finale.",
  "Ultra Greedier": "Greedier Mode: boss finale.",
  "Ultra Pestilence": "Home: ultra variant del cavaliere.",
  "Ultra War": "Home: ultra variant del cavaliere.",
  "War": "Piano 3 (Depths/Necropolis), uno dei quattro cavalieri.",
  "Widow": "Piano 1 (Cellar), boss optionale.",
};

const WIKI_OVERRIDES = {
  "???": "???_(Boss)",
  "Death": "Death_(Boss)",
  "Isaac": "Isaac_(Boss)",
};

function photoUrl(file) {
  if (!file) return "";
  const slug = String(file).replace(/ /g, "_");
  return "https://bindingofisaacrebirth.wiki.gg/images/" + encodeURIComponent(slug);
}

// --- Raccolta: nome boss -> { icon, ingame, kills: [{char, charIcon, item, itemIcon, dlc}] }
const bosses = new Map();
function ensureBoss(name) {
  if (!bosses.has(name)) bosses.set(name, { name, icon: "", ingame: "", dlc: 0, kills: [] });
  return bosses.get(name);
}

for (const ch of characters) {
  for (const bu of (ch.bossUnlocks || [])) {
    if (!bu.boss || !bu.boss.name) continue;
    const b = ensureBoss(bu.boss.name);
    b.icon = b.icon || bu.boss.icon || "";
    b.dlc = Math.max(b.dlc, bu.dlc || 0);
    b.kills.push({
      char: ch.name,
      charIcon: ch.icon || "",
      item: bu.item,
      itemIcon: bu.itemIcon || "",
      dlc: bu.dlc || 0,
    });
  }
}

for (const it of items) {
  for (const b of (it.unlock && it.unlock.bosses) || []) {
    const name = String(b.name || "").replace(/ \(Boss\)$/i, "").replace(/#.*$/, "");
    if (!name) continue;
    const bb = ensureBoss(name);
    bb.icon = bb.icon || b.icon || "";
    bb.ingame = bb.ingame || (b.ingame || "").replace(/\s+/g, " ").trim();
    bb.dlc = Math.max(bb.dlc, it.dlc || 0);
  }
}

// Krampus: fallback icone/foto note
if (bosses.has("Krampus")) {
  const kb = bosses.get("Krampus");
  kb.icon = kb.icon || "https://bindingofisaacrebirth.wiki.gg/images/Boss_Krampus_portrait.png";
  kb.ingame = kb.ingame || "Boss Krampus ingame.png";
}

// La foto grande: usa l'ingame se disponibile, altrimenti l'icona
for (const b of bosses.values()) {
  b.photo = photoUrl(b.ingame) || b.icon;
  b.introduced = introducedIn(b.dlc);
  b.dlcList = dlcNames(b.dlc);
  b.key = b.name;
  const wikiSlug = WIKI_OVERRIDES[b.name] || b.name.replace(/ /g, "_");
  b.wiki = "https://bindingofisaacrebirth.wiki.gg/wiki/" + encodeURIComponent(wikiSlug);
  b.location = LOCATIONS[b.name] || "";
}

const list = [...bosses.values()];
list.sort((a, b) => {
  if ((a.kills.length === 0) !== (b.kills.length === 0)) return a.kills.length === 0 ? 1 : -1;
  if (a.dlc !== b.dlc) return a.dlc - b.dlc;
  return a.name.localeCompare(b.name);
});

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(join(DATA_DIR, "bosses.js"), "window.ISAAC_BOSSES = " + JSON.stringify(list) + ";\n", "utf8");

console.log("TOTALE BOSS:", list.length);
console.log("boss con kill:", list.filter((b) => b.kills.length > 0).length);
console.log("boss senza kill:", list.filter((b) => b.kills.length === 0).length);
console.log("senza location:", list.filter((b) => !b.location).length);
console.log("senza foto:", list.filter((b) => !b.photo).length);
console.log("senza icona:", list.filter((b) => !b.icon).length);
console.log("scritto: data/bosses.js");
