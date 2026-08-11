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
  "???": "The Chest, the final floor reached with The Polaroid after Isaac.",
  "Baby Plum": "Floor 1 (Downpour/Dross), optional boss.",
  "Big Horn": "Floor 2 (Caves/Flooded Caves), optional boss.",
  "Blastocyst": "Floor 4 (Womb/Scarred Womb), optional boss.",
  "Boss Rush": "Timed door in Chapter 3: defeat Mom within 20 minutes.",
  "C.H.A.D.": "Floor 2 (Caves/Flooded Caves), optional boss.",
  "Carrion Queen": "Floor 2 (Catacombs), optional boss.",
  "Chimera": "Corpse, optional boss.",
  "Chub": "Floor 2 (Caves), optional boss.",
  "Clog": "Floor 1 (Dross), optional boss.",
  "Colostomia": "Floor 1 (Dross), optional boss.",
  "Conquest": "Floor 4 (Womb/Scarred Womb), appears when fighting Death.",
  "Daddy Long Legs": "Floor 4 (Womb/Utero), optional boss.",
  "Dangle": "Floor 1 (Basement), optional boss.",
  "Dark One": "Floor 2 (Catacombs), optional boss.",
  "Death": "Floor 4 (Womb/Utero), one of the four horsemen.",
  "Delirium": "The Void: reachable through the portal that appears after the final bosses.",
  "Dingle": "Floor 1 (Basement), optional boss.",
  "Dogma": "Home, before Mother.",
  "Famine": "Floor 1 (Basement/Cellar/Burning Basement), one of the four horsemen.",
  "Fistula": "Floor 1 (Cellar), optional boss.",
  "Gemini": "Floor 1 (Basement), optional boss.",
  "Gish": "Floor 3 (Depths/Dank Depths), optional boss.",
  "Great Gideon": "Floor 2 (Ashpit/Mines), optional boss.",
  "Gurdy": "Floor 2 (Caves), optional boss.",
  "Gurdy Jr.": "Floor 2 (Caves/Catacombs), optional boss.",
  "Gurglings": "Floor 1 (Basement), optional boss.",
  "Headless Horseman": "Floor 2 (Caves/Flooded Caves), optional boss.",
  "Hornfel": "Floor 2 (Mines), optional boss.",
  "Hush": "Floor ???: defeat Mom's Heart or It Lives! within 30 minutes.",
  "Isaac": "Cathedral, the final floor reached with The Polaroid.",
  "It Lives!": "Floor 4: defeat Mom's Heart 11 times.",
  "Krampus": "Devil Room, after striking the Devil Beggar in a Devil Room.",
  "Larry Jr.": "Floor 1 (Basement), optional boss.",
  "Lil Blub": "Floor 1 (Downpour/Dross), optional boss.",
  "Little Horn": "Floor 1 (Basement), optional boss.",
  "Loki": "Floor 3 (Necropolis), optional boss.",
  "Lokii": "Floor 4 (Womb/Utero), optional boss.",
  "Mama Gurdy": "Floor 4 (Womb/Utero), optional boss.",
  "Mask of Infamy": "Floor 3 (Necropolis), optional boss.",
  "Mega Fatty": "Floor 2 (Caves), optional boss.",
  "Mega Maw": "Floor 2 (Caves), optional boss.",
  "Mega Satan": "Chest/Dark Room: collect two Key Pieces and open the Golden Gate.",
  "Min-Min": "Floor 1 (Downpour), optional boss.",
  "Mom": "Floor 3 (Depths/Necropolis), Isaac's mother.",
  "Mom's Heart": "Floor 4 (Womb/Utero), after defeating Mom.",
  "Monstro": "Floor 1 (Basement), optional boss.",
  "Monstro II": "Floor 3 (Depths/Dank Depths), optional boss.",
  "Mother": "Corpse: continue past Dogma in Home to reach it.",
  "Mr. Fred": "Floor 4 (Utero), optional boss.",
  "Peep": "Floor 2 (Caves/Catacombs), optional boss.",
  "Pestilence": "Floor 2 (Caves/Catacombs), one of the four horsemen.",
  "Pin": "Floor 1 (Cellar), optional boss.",
  "Polycephalus": "Floor 2 (Catacombs), optional boss.",
  "Rag Man": "Floor 1 (Basement), optional boss.",
  "Rag Mega": "Floor 2 (Catacombs/Flooded Caves), optional boss.",
  "Reap Creep": "Floor 2 (Mines), optional boss.",
  "Rotgut": "Corpse, optional boss.",
  "Satan": "Sheol, the final floor reached with The Negative.",
  "Scolex": "Floor 4 (Womb), optional boss.",
  "Singe": "Floor 2 (Ashpit), optional boss.",
  "Sisters Vis": "Floor 4 (Womb/Utero/Scarred Womb), optional boss.",
  "Steven": "Floor 1 (Basement), optional boss.",
  "Teratoma": "Floor 4 (Womb/Scarred Womb), optional boss.",
  "The Adversary": "Floor 3 (Depths/Necropolis), optional boss.",
  "The Beast": "Home: the final battle after Mother.",
  "The Bloat": "Floor 4 (Womb/Scarred Womb), optional boss.",
  "The Cage": "Floor 3 (Depths), optional boss.",
  "The Duke of Flies": "Floor 1 (Basement/Cellar/Burning Basement), optional boss.",
  "The Fallen": "Floor 1/3, appears in the Devil Room.",
  "The Forsaken": "Floor 2 (Catacombs), optional boss.",
  "The Frail": "Floor 2 (Catacombs), optional boss.",
  "The Gate": "Floor 3 (Depths), optional boss.",
  "The Haunt": "Floor 1 (Cellar/Burning Basement), optional boss.",
  "The Heretic": "Floor 3 (Mausoleum), optional boss.",
  "The Hollow": "Floor 2 (Catacombs), optional boss.",
  "The Horny Boys": "Floor 3 (Gehenna), optional boss.",
  "The Husk": "Floor 2 (Catacombs), optional boss.",
  "The Lamb": "Dark Room, the final floor reached with The Negative.",
  "The Matriarch": "Floor 4 (Scarred Womb), optional boss.",
  "The Pile": "Floor 2 (Ashpit), optional boss.",
  "The Rainmaker": "Floor 1 (Downpour), optional boss.",
  "The Scourge": "Corpse, optional boss.",
  "The Shell": "Floor 2 (Ashpit), optional boss.",
  "The Siren": "Floor 3 (Mausoleum), optional boss.",
  "The Stain": "Floor 2 (Caves/Catacombs), optional boss.",
  "The Visage": "Floor 3 (Mausoleum), optional boss.",
  "The Wretched": "Floor 2 (Catacombs), optional boss.",
  "Triachnid": "Floor 4 (Womb/Utero), optional boss.",
  "Tuff Twins": "Floor 2 (Mines), optional boss.",
  "Turdlet": "Floor 1 (Dross), optional boss.",
  "Turdlings": "Floor 1 (Basement), optional boss.",
  "Ultra Death": "Home: ultra variant of the horseman.",
  "Ultra Famine": "Home: ultra variant of the horseman.",
  "Ultra Greed": "Greed Mode: final boss.",
  "Ultra Greedier": "Greedier Mode: final boss.",
  "Ultra Pestilence": "Home: ultra variant of the horseman.",
  "Ultra War": "Home: ultra variant of the horseman.",
  "War": "Floor 3 (Depths/Necropolis), one of the four horsemen.",
  "Widow": "Floor 1 (Cellar), optional boss.",
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

// --- Collect: boss name -> { icon, ingame, kills: [{char, charIcon, item, itemIcon, dlc}] }
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

// The big photo: uses the ingame photo if available, otherwise the icon
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

console.log("TOTAL BOSSES:", list.length);
console.log("bosses with kills:", list.filter((b) => b.kills.length > 0).length);
console.log("bosses without kills:", list.filter((b) => b.kills.length === 0).length);
console.log("without location:", list.filter((b) => !b.location).length);
console.log("without photo:", list.filter((b) => !b.photo).length);
console.log("without icon:", list.filter((b) => !b.icon).length);
console.log("written: data/bosses.js");
