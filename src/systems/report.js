// src/systems/report.js
// Writes the post-mission report: what happened, WHY, and one "what if" tip.

import partsData from "../../data/parts.json";

function timeText(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function partName(id) {
  const part = partsData.find(p => p.id === id);
  return part ? part.name : id;
}
function hasPart(design, ...ids) {
  return design.parts.some(p => ids.includes(p.id));
}

export function generateReport(design, result, level) {
  const lines = [];
  const tips = [];

  if (result.finished) {
    lines.push(`Mission complete! You reached the ${level.planet} relay in ${timeText(result.time)}.`);
  } else {
    lines.push(`Mission failed. You did not reach the ${level.planet} relay.`);
  }

  if (result.fakeDodged > 0) {
    const pct = result.fuelUsed > 0 ? Math.round(result.fuelOnFakes / result.fuelUsed * 100) : 0;
    lines.push(`You dodged ${result.fakeDodged} fake rocks (Sarab) and spent ${pct}% of your fuel avoiding things that were not there.`);
    if (!hasPart(design, "scanner")) {
      tips.push("Add a scanner. It shows which rocks are fake, so you save fuel.");
    } else {
      tips.push("Your scanner needs power to work. Keep your power above zero so it stays on.");
    }
  } else if (level.fakeRocks > 0) {
    lines.push("You were not fooled by Sarab. Great scanning!");
  }

  if (result.powerZeroAt !== null) {
    lines.push(`Your power ran out at ${timeText(result.powerZeroAt)}. After that, your instruments and scanner stopped.`);
    if (level.sunlight < 0.5) {
      lines.push(`Sunlight at ${level.planet} is only ${Math.round(level.sunlight * 100)}% of what it is at Earth, so solar panels make much less power here.`);
      tips.push("Far from the Sun, batteries matter more than solar panels. Add a battery.");
    } else {
      tips.push("Add a solar panel or a battery so your power lasts the whole race.");
    }
  } else {
    lines.push("Your power never ran out. Good energy planning!");
  }

  for (const lost of result.partsLost) {
    const why = lost.cause === "radiation" ? "to radiation" : "after hitting a real rock";
    lines.push(`You lost your ${partName(lost.id)} at ${timeText(lost.t)} ${why}.`);
  }
  const lostToRocks = result.partsLost.some(p => p.cause !== "radiation");
  const lostToRadiation = result.partsLost.some(p => p.cause === "radiation");
  if (lostToRocks && !hasPart(design, "shield", "shield_light")) {
    tips.push("A shield protects your ship from real rocks, but it is heavy. Try it if you have mass to spare.");
  }
  if (lostToRadiation && !hasPart(design, "computer")) {
    tips.push("A computer cuts radiation damage in half. Real Jupiter missions protect their electronics too.");
  }

  if (result.dataDownlinked > 0) {
    lines.push(`You sent ${result.dataDownlinked} data to Earth. Scientists on Earth can use it!`);
  } else if (hasPart(design, "camera", "camera_science", "scanner") && !hasPart(design, "antenna")) {
    lines.push("Your instruments made data, but nothing reached Earth.");
    tips.push("Add an antenna. Without it, your science data never reaches Earth.");
  }

  if (result.scienceCollected === 0 && !hasPart(design, "camera", "camera_science")) {
    lines.push("You collected no science. Instruments like the camera collect science.");
    tips.push("Add a camera to collect science, but remember it uses power and makes data your antenna must send.");
  }

  const whatIf = tips.length > 0 ? `What if: ${tips[0]}` : "What if: try a lighter ship to finish even faster.";
  return { lines, whatIf };
}
