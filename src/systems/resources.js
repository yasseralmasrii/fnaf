// src/systems/resources.js
// Adds up the numbers of all parts placed on the ship.

import partsData from "../../data/parts.json";

export function computeTotals(placedParts) {
  const totals = { mass: 0, powerBalance: 0, cost: 0, dataRate: 0, downlink: 0, science: 0, storage: 0 };

  for (const placed of placedParts) {
    const part = partsData.find(p => p.id === placed.id);
    if (!part) { console.warn("Unknown part id:", placed.id); continue; }

    totals.mass += part.mass;
    totals.powerBalance += part.power;
    totals.cost += part.cost;
    totals.dataRate += part.dataRate;
    totals.downlink += part.downlink;
    totals.science += part.science;
    totals.storage += part.storage;
  }

  return totals;
}

// Tests:
// computeTotals([{ id: "solar_small" }])  -> mass 15, powerBalance 5, cost 40
// Mars ship (2 frames, 2 solar, battery, thruster, scanner, antenna) -> mass 225, powerBalance 3, cost 440
