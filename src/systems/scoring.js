// src/systems/scoring.js
// Gives the player 7 scores (0 to 1). Each score of 0.6 or more earns a star.

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

export function computeScore(result, level, design) {
  const parTime = level.parTime ?? 90;
  const scienceGoal = level.scienceGoal ?? 10;

  const values = {
    finished: result.finished ? 1 : 0,
    time: result.finished ? clamp01(parTime / result.time) : 0,
    fuelLeft: clamp01(1 - result.fuelUsed / level.fuel),
    power: result.powerZeroAt === null ? 1 : clamp01(result.powerZeroAt / result.time),
    science: clamp01(result.scienceCollected / scienceGoal),
    shipCondition: clamp01(1 - result.partsLost.length / design.parts.length),
    scanAccuracy: level.fakeRocks === 0 ? 1 : clamp01(1 - result.fakeDodged / level.fakeRocks)
  };

  const STAR_LINE = 0.6;
  let stars = 0;
  for (const key in values) {
    if (values[key] >= STAR_LINE) stars++;
  }

  return { values, stars };
}

// Tests (Mars: fuel 45, fakeRocks 10, ship has 8 parts):
// Good run (finished, time 94, fuelUsed 31, power never 0, lost 1 part, dodged 5 fakes, science 8) -> stars: 5
// Bad run (not finished, fuel all used, power 0 at 40s, lost 4 parts, dodged 9 fakes, science 2) -> stars: 1
