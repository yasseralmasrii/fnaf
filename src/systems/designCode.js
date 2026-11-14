// src/systems/designCode.js
// Turns a ship design into a short code to share, turns a code back into a design,
// and compares two designs.

import { computeTotals } from "./resources.js";

export function encodeDesign(design) {
  const small = { p: design.parts.map(p => [p.id, p.gx, p.gy]), v: design.vehicle, o: design.orbit };
  return "LHQ-" + btoa(JSON.stringify(small));
}

export function decodeDesign(code) {
  try {
    const small = JSON.parse(atob(code.trim().replace("LHQ-", "")));
    const parts = small.p.map(([id, gx, gy]) => ({ id, gx, gy }));
    return { parts, vehicle: small.v, orbit: small.o, totals: computeTotals(parts) };
  } catch (e) {
    return null;
  }
}

export function compareDesigns(a, b) {
  const lines = [];
  const labels = { mass: "Mass", powerBalance: "Power", cost: "Cost", science: "Science", downlink: "Downlink" };
  for (const key in labels) {
    const diff = b.totals[key] - a.totals[key];
    if (diff !== 0) {
      const sign = diff > 0 ? "+" : "";
      lines.push(`${labels[key]}: ${a.totals[key]} -> ${b.totals[key]} (${sign}${diff})`);
    }
  }
  if (lines.length === 0) lines.push("Both designs have the same numbers.");
  return lines;
}

// Tests:
// decodeDesign(encodeDesign(ship)) -> same ship back
// decodeDesign("garbage") -> null
// compareDesigns(ship, shipWithBattery) -> ["Mass: 115 -> 140 (+25)", "Cost: 160 -> 200 (+40)"]
