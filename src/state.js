// Shared game state. Shapes follow PROJECT_BRIEF.md exactly. Do not rename fields.
// Everyone imports { gameState } and reads/writes only their own slice.
// Hangar writes shipDesign. Race writes raceResult. Report reads both.

export const SCENE_ORDER = [
  "Menu",
  "Briefing",
  "Hangar",
  "Launch",
  "Race",
  "Report",
];

// Fallback level until Member 4's levels.json lands.
export const STUB_LEVEL = {
  id: 1,
  planet: "Mars",
  briefing: "Stub: reach the caravan.",
  budget: 500,
  massLimit: 400,
  fuel: 40,
  realRocks: 25,
  fakeRocks: 10,
  verse: "...",
  background: "bg_mars",
};

// Fake data so every teammate can test without waiting on others.
export const FAKE_SHIP_DESIGN = {
  parts: [{ id: "frame_basic", gx: 0, gy: 0 }],
  vehicle: "medium",
  orbit: "LEO",
  totals: { mass: 380, powerBalance: 2, cost: 460, dataRate: 3, science: 5 },
};

export const FAKE_RACE_RESULT = {
  finished: true,
  time: 94,
  fuelUsed: 31,
  fuelOnFakes: 6,
  powerZeroAt: null,
  partsLost: [{ id: "solar_small", t: 72 }],
  fakeDodged: 5,
  realHit: 2,
  dataDownlinked: 12,
  scienceCollected: 8,
};

export const gameState = {
  levelId: 1,
  level: STUB_LEVEL,
  shipDesign: null,
  raceResult: null,
  players: 1, // team mode (2-4) comes later
};

// Start a fresh run. Pass { fake: true } during development to prefill data.
export function resetRun({ fake = false } = {}) {
  gameState.shipDesign = fake ? structuredClone(FAKE_SHIP_DESIGN) : null;
  gameState.raceResult = fake ? structuredClone(FAKE_RACE_RESULT) : null;
}

export function nextSceneKey(current) {
  const i = SCENE_ORDER.indexOf(current);
  return SCENE_ORDER[(i + 1) % SCENE_ORDER.length];
}

export function prevSceneKey(current) {
  const i = SCENE_ORDER.indexOf(current);
  return SCENE_ORDER[(i - 1 + SCENE_ORDER.length) % SCENE_ORDER.length];
}
