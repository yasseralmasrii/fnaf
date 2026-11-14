// src/systems/resources.js
// Adds up the numbers of all parts placed on the ship.
// sunlight = how strong the Sun is at this planet (1 = Earth). Solar power is multiplied by it.

import partsData from "../../data/parts.json";

export function computeTotals(placedParts, sunlight = 1) {
  const totals = { mass: 0, powerBalance: 0, cost: 0, dataRate: 0, downlink: 0, science: 0, storage: 0 };

  for (const placed of placedParts) {
    const part = partsData.find(p => p.id === placed.id);
    if (!part) { console.warn("Unknown part id:", placed.id); continue; }

    totals.mass += part.mass;
    totals.powerBalance += part.power > 0 ? part.power * sunlight : part.power;
    totals.cost += part.cost;
    totals.dataRate += part.dataRate;
    totals.downlink += part.downlink;
    totals.science += part.science;
    totals.storage += part.storage;
  }

  totals.powerBalance = Math.round(totals.powerBalance * 10) / 10;
  return totals;
}

// Tests (Mars ship: 2 frames, 2 solar, battery, thruster, scanner, antenna):
// computeTotals(ship)       -> powerBalance 3     (Earth)
// computeTotals(ship, 0.43) -> powerBalance -2.7  (Mars)
// computeTotals(ship, 0.04) -> powerBalance -6.6  (Jupiter)
