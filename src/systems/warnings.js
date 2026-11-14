// src/systems/warnings.js
// Checks the ship design and explains every problem in simple words.

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
    warnings.push({ type: "power",
      text: `Power is ${totals.powerBalance}. Your parts use more power than you make. Add a solar panel.` });
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

  return warnings;
}

// Tests (Mars level: budget 650, massLimit 350, needs antenna):
// Good ship (mass 225, power +3, cost 440, has antenna) -> [] (no warnings)
// Bad ship (mass 380, power -2, cost 700, no antenna) -> 5 warnings, first one: "Too heavy by 30 kg..."
