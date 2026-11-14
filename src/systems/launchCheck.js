// src/systems/launchCheck.js
// Checks if the chosen rocket can carry the ship to the chosen orbit, and if the money is enough.

import vehiclesData from "../../data/vehicles.json";

export function checkLaunch(design, level) {
  const reasons = [];
  const vehicle = vehiclesData.find(v => v.id === design.vehicle);
  const capacity = vehicle.capacity[design.orbit];
  const mass = design.totals.mass;
  const totalCost = design.totals.cost + vehicle.cost;

  if (mass > capacity) {
    const extra = mass - capacity;
    reasons.push(`Too heavy for this rocket by ${extra} kg. The ${vehicle.name} can carry only ${capacity} kg to ${design.orbit}. Farther orbits need more fuel, so the rocket carries less. Pick a bigger rocket, a closer orbit, or remove parts.`);
  }

  if (totalCost > level.budget) {
    const extra = totalCost - level.budget;
    reasons.push(`Over budget by ${extra} stars. Ship (${design.totals.cost}) + rocket (${vehicle.cost}) = ${totalCost}, but your budget is ${level.budget}. Pick a cheaper rocket or remove parts.`);
  }

  return { ok: reasons.length === 0, reasons, capacity, totalCost };
}

// Tests (Mars ship: mass 225, cost 440, budget 650):
// medium + LEO -> ok: true, totalCost 590
// medium + GEO -> ok: false, "Too heavy for this rocket by 65 kg..."
// heavy + GEO  -> ok: false, "Over budget by 50 stars..."
