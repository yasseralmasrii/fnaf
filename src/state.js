// Shared game state. Shapes follow PROJECT_BRIEF.md exactly. Do not rename fields.
// Everyone imports { gameState } and reads/writes only their own slice.
// Hangar writes shipDesign. Race writes raceResult. Report reads both.

import levelsData from "../data/levels.json";
import difficultiesData from "../data/difficulties.json";

export const SCENE_ORDER = [
  "Menu",
  "Briefing",
  "Hangar",
  "Launch",
  "Race",
  "Report",
];

// Old fallback level. Kept so nothing that imports it breaks. Real levels come from levels.json.
export const STUB_LEVEL = levelsData[0];

// Fake data so every teammate can test without waiting on others.
// This is the Mars test ship: mass 225, power +3, cost 440.
export const FAKE_SHIP_DESIGN = {
  parts: [
    { id: "frame_basic", gx: 0, gy: 0 },
    { id: "frame_basic", gx: 1, gy: 0 },
    { id: "solar_small", gx: 0, gy: 1 },
    { id: "solar_small", gx: 1, gy: 1 },
    { id: "battery", gx: 2, gy: 0 },
    { id: "thruster", gx: 3, gy: 0 },
    { id: "scanner", gx: 2, gy: 1 },
    { id: "antenna", gx: 3, gy: 1 },
  ],
  vehicle: "medium",
  orbit: "LEO",
  totals: { mass: 225, powerBalance: 3, cost: 440, dataRate: 1, downlink: 5, science: 2, storage: 60 },
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

// The player's name for the Majlis, remembered in this browser.
function loadName() {
  try { return localStorage.getItem("lahaq_name") || "Pilot"; } catch (e) { return "Pilot"; }
}

export function setPlayerName(name) {
  const clean = String(name || "").trim().slice(0, 12) || "Pilot";
  gameState.playerName = clean;
  try { localStorage.setItem("lahaq_name", clean); } catch (e) {}
}

export const gameState = {
  playerName: loadName(),
  levelId: 1,
  level: levelsData[0],
  difficulty: "dalil", // bedouin, dalil, rawi, or sandbox
  shipDesign: null,
  raceResult: null,
  players: 1, // team mode (2-4) comes later
};

// The chosen difficulty's settings (from difficulties.json).
export function getDifficulty() {
  return difficultiesData.find(d => d.id === gameState.difficulty) || difficultiesData[1];
}

// Copy a level and change its numbers to match the difficulty.
function applyDifficulty(baseLevel) {
  const d = getDifficulty();
  const shimmer = Math.max(0, Math.min(1, baseLevel.fakeShimmer + d.fakeShimmerBonus));
  return {
    ...baseLevel,
    budget: Math.round(baseLevel.budget * d.budgetFactor),
    massLimit: Math.round(baseLevel.massLimit * d.massFactor),
    fakeShimmer: shimmer,
  };
}

// Move to a level by its id (1 to 6).
export function setLevel(id) {
  const found = levelsData.find(l => l.id === id);
  if (found) {
    gameState.levelId = id;
    gameState.level = applyDifficulty(found);
  }
}

// Change the difficulty and update the current level's numbers.
export function setDifficulty(id) {
  gameState.difficulty = id;
  setLevel(gameState.levelId);
}

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
