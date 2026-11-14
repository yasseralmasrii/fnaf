// src/systems/warnings.js
// Checks the ship design and explains every problem in simple words.
import vehiclesData from "../../data/vehicles.json";
export function getWarnings(totals, level, placedParts) {
  const warnings = [];

  if (totals.mass > level.massLimit) {
    const extra = totals.mass - level.massLimit;
    warnings.push({ type: "mass",
      text: `Too heavy by ${extra} kg. Remove a heavy part like the shield or thruster.` });
  }

  if (totals.cost > level.budget) {
    const extra = totals.cost - level.budget;
    warnings.push({ type: "cost",
      text: `Over budget by ${extra} stars. Remove an expensive part like the scanner or camera.` });
  }

  if (totals.powerBalance < 0) {
    if (level.sunlight < 0.5) {
      warnings.push({ type: "power",
        text: `Power is ${totals.powerBalance}. Sunlight here is only ${Math.round(level.sunlight * 100)}% of Earth's, so solar panels make little power. Add batteries.` });
    } else {
      warnings.push({ type: "power",
        text: `Power is ${totals.powerBalance}. Your parts use more power than you make. Add a solar panel.` });
    }
  }

  if (totals.dataRate > totals.downlink) {
    warnings.push({ type: "data",
      text: `Your instruments make more data (${totals.dataRate}) than your antenna can send (${totals.downlink}). Add an antenna.` });
  }

  for (const required of level.requiredParts) {
    const hasIt = placedParts.some(p => p.id === required);
    if (!hasIt) {
      warnings.push({ type: "required",
        text: `This mission needs: ${required}. You must send a signal to win.` });
    }
  }

    const cheapestRocket = Math.min(...vehiclesData.map(v => v.cost));
  if (totals.cost <= level.budget && totals.cost + cheapestRocket > level.budget) {
    warnings.push({ type: "cost",
      text: `Leave at least ${cheapestRocket} stars for a rocket. Ship (${totals.cost}) + cheapest rocket (${cheapestRocket}) is more than your budget (${level.budget}).` });
  }
  
  const hasThruster = placedParts.some(p => p.id === "thruster");
  if (!hasThruster) {
    warnings.unshift({ type: "required",
      text: "Your ship has no thruster, so it cannot move. Add a thruster." });
  }

  return warnings;
}

// Tests:
// Jupiter ship with power -6.6 -> "Power is -6.6. Sunlight here is only 4% of Earth's... Add batteries."
