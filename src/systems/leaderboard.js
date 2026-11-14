// src/systems/leaderboard.js
// The Majlis: saves finished runs in the browser and returns the best ones.

const KEY = "lahaq_majlis";

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function saveRun(entry) {
  const all = loadAll();
  all.push({ ...entry, date: new Date().toISOString().slice(0, 10) });
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("Could not save to the Majlis:", e);
  }
}

export function getTopRuns(levelId, howMany = 10) {
  return loadAll()
    .filter(run => run.levelId === levelId)
    .sort((a, b) => b.stars - a.stars || a.time - b.time)
    .slice(0, howMany);
}

export function clearMajlis() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

// Entry shape: { name, levelId, stars, time, designCode }
// Tests (level 3): Yasser 6 stars 110s, Eman 5 stars 80s, Nawraa 5 stars 94s
// getTopRuns(3) -> Yasser, Eman, Nawraa
