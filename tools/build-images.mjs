import { readdirSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

const SPECS = [
  { dir: "photos", var: "ISAAC_PHOTOS" },
  { dir: "wallpapers", var: "ISAAC_WALLPAPERS", overrides: { "default-wall.png": "Sheol" } },
];

function nameFromFile(file, overrides) {
  if (overrides && overrides[file]) return overrides[file];
  return file.replace(IMG_EXT, "").replace(/[-_]+/g, " ").trim() || file;
}

const mode = process.argv[2] || "all";

for (const spec of SPECS) {
  if (mode !== "all" && spec.dir !== mode) continue;
  const srcDir = join(__dirname, "..", spec.dir);
  let entries = [];
  try {
    const names = readdirSync(srcDir);
    for (const n of names) {
      const full = join(srcDir, n);
      let isFile = false;
      try { isFile = statSync(full).isFile(); } catch (e) { isFile = false; }
      if (isFile && IMG_EXT.test(n)) {
        entries.push({ file: n, name: nameFromFile(n, spec.overrides) });
      }
    }
  } catch (e) {
    console.error(spec.dir + "/ non trovata, uso lista vuota");
    mkdirSync(srcDir, { recursive: true });
  }

  entries.sort((a, b) => a.file.localeCompare(b.file));
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, spec.dir + ".js"), "window." + spec.var + " = " + JSON.stringify(entries) + ";\n", "utf8");
  console.log("TOTAL " + spec.dir.toUpperCase() + ":", entries.length);
}