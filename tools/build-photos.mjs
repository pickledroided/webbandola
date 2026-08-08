import { readdirSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, "..", "photos");
const DATA_DIR = join(__dirname, "..", "data");
const OUT_JSON = join(DATA_DIR, "photos.json");
const OUT_JS = join(DATA_DIR, "photos.js");

const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

function nameFromFile(file) {
  return file.replace(IMG_EXT, "").replace(/[-_]+/g, " ").trim() || file;
}

let entries = [];
try {
  const names = readdirSync(PHOTOS_DIR);
  for (const n of names) {
    const full = join(PHOTOS_DIR, n);
    let isFile = false;
    try { isFile = statSync(full).isFile(); } catch (e) { isFile = false; }
    if (isFile && IMG_EXT.test(n)) {
      entries.push({ file: n, name: nameFromFile(n) });
    }
  }
} catch (e) {
  console.error("photos/ non trovata, uso lista vuota");
  mkdirSync(PHOTOS_DIR, { recursive: true });
}

entries.sort((a, b) => a.file.localeCompare(b.file));

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(entries, null, 2) + "\n", "utf8");
writeFileSync(OUT_JS, "window.ISAAC_PHOTOS = " + JSON.stringify(entries) + ";\n", "utf8");
console.log("TOTALE FOTO:", entries.length);
console.log("scritto:", OUT_JSON);
