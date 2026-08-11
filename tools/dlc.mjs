export const DLC_BITS = [
  [1, "Rebirth"],
  [2, "Afterbirth"],
  [4, "Afterbirth+"],
  [8, "Repentance"],
  [16, "Repentance+"],
];

export function dlcOf(mask) {
  const out = [];
  for (const [bit, name] of DLC_BITS) {
    if ((mask & bit) === bit) out.push(name);
  }
  return out;
}

export function introducedIn(mask) {
  for (const [bit, name] of DLC_BITS) {
    if ((mask & bit) === bit) return name;
  }
  return "Rebirth";
}

export function dlcNames(mask) {
  const list = dlcOf(mask);
  return list.length === DLC_BITS.length ? "All DLC" : list.join(" + ");
}