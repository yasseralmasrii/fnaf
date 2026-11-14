// MADAR simulation engine. No drawing here: only numbers.
// The same engine runs the live game AND the "what if" autopilot replays.

import {
  PLANETS, MISSIONS, PARTS, CORE, ROCKETS, TRIP_FACTOR, OPS_COST_PER_ORBIT, DIFFICULTIES,
} from './data.js';

export const ORBIT_SECONDS = 20;     // one orbit in the game lasts 20 seconds
const PLANET_TURN = 3;               // the planet turns once every 3 orbits
const DISTANCE_FACTOR = { earth: 1, mars: 0.3, jupiter: 0.15 }; // far away = slow data

// ---------- Small helpers ----------

export function partById(id) { return PARTS.find(p => p.id === id); }
export function missionById(id) { return MISSIONS.find(m => m.id === id); }
export function difficultyById(id) { return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[1]; }

// Random numbers that are the same every time for the same seed (fair replays and challenge codes).
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d < -Math.PI) d += Math.PI * 2;
  if (d > Math.PI) d -= Math.PI * 2;
  return Math.abs(d);
}

// ---------- Orbit facts (real formulas) ----------

export function orbitInfo(planetId, alt, mission) {
  const p = PLANETS[planetId];
  const a = p.radius + alt;                                   // distance from the planet's center (km)
  const periodSec = 2 * Math.PI * Math.sqrt(a ** 3 / p.mu);   // Kepler's third law
  const horizon = Math.acos(p.radius / a);                    // how far the satellite can see (radians)
  const eclipse = Math.asin(p.radius / a) / Math.PI;          // part of each orbit spent in shadow
  const refAlt = mission ? mission.altStart : alt;
  const quality = Math.max(0.3, Math.min(1.5, refAlt / alt)); // lower = sharper pictures
  const viewHalf = Math.max(0.07, horizon * 0.35);            // what the camera can see
  const stationHalf = Math.max(0.12, horizon * 0.8);          // when a ground station can see you
  let decayOrbits = Infinity;                                 // air drag pulls low orbits down
  if (planetId === 'earth' && alt < 400) decayOrbits = Math.max(2, Math.round((alt - 200) / 30));
  if (planetId === 'mars' && alt < 250) decayOrbits = Math.max(2, Math.round((alt - 150) / 20));
  const radiation = planetId === 'jupiter' ? Math.max(0, Math.min(1, (30000 - alt) / 25000)) : 0;
  return { periodSec, horizon, eclipse, quality, viewHalf, stationHalf, decayOrbits, radiation, swathKm: Math.round(alt * 0.7) };
}

export function formatPeriod(sec) {
  if (sec < 3600 * 2) return `${Math.round(sec / 60)} min`;
  if (sec < 3600 * 48) return `${(sec / 3600).toFixed(1)} hours`;
  return `${(sec / 86400).toFixed(1)} days`;
}

// ---------- The design ----------

export function designTotals(partIds) {
  const parts = partIds.map(partById).filter(Boolean);
  const sum = key => parts.reduce((s, p) => s + (p[key] || 0), 0);
  return {
    mass: CORE.mass + sum('mass'),
    cost: CORE.cost + sum('cost'),
    solar: parts.filter(p => p.power && !p.rtg).reduce((s, p) => s + p.power, 0),
    rtg: parts.filter(p => p.rtg).reduce((s, p) => s + p.power, 0),
    battery: CORE.battery + sum('storage'),
    memory: CORE.memory + sum('memory'),
    downlink: sum('downlink'),
    fuel: sum('fuel'),
    armor: sum('armor'),
    hasCamera: parts.some(p => p.id === 'camera' || p.id === 'hdcamera'),
    hasAntenna: parts.some(p => p.downlink),
    count: parts.length,
  };
}

export function rocketCapacity(rocket, mission, alt) {
  const tripFactor = TRIP_FACTOR[mission.planet];
  const altPenalty = 1 - 0.25 * Math.min(1, (alt - mission.altMin) / (mission.altMax - mission.altMin));
  return Math.round(rocket.capacity * tripFactor * altPenalty);
}

// Budget, mass and part checks. Each warning explains WHY in simple words.
export function checkDesign({ mission, partIds, rocketId, alt, difficultyId }) {
  const t = designTotals(partIds);
  const diff = difficultyById(difficultyId);
  const budget = Math.round(mission.budget * diff.budget);
  const rocket = ROCKETS.find(r => r.id === rocketId) || null;
  const buildCost = t.cost + (rocket ? rocket.cost : 0);
  const opsMoney = budget - buildCost;
  const opsOrbits = Math.max(0, Math.floor(opsMoney / OPS_COST_PER_ORBIT));
  const warnings = [];

  if (!t.hasCamera) warnings.push({ level: 'stop', text: 'No camera: your satellite cannot see the targets.' });
  if (!t.hasAntenna) warnings.push({ level: 'stop', text: 'No antenna: your data can never reach Earth.' });
  if (t.solar === 0 && t.rtg === 0) warnings.push({ level: 'stop', text: 'No power source: add a solar panel or an RTG.' });
  if (buildCost > budget) warnings.push({ level: 'stop', text: `Over budget by $${buildCost - budget}M. Remove a part or pick a cheaper rocket.` });
  else if (opsOrbits < mission.orbits) warnings.push({ level: 'warn', text: `Money left for operations: $${opsMoney}M, enough for ${opsOrbits} of ${mission.orbits} orbits. The mission will end early!` });

  if (rocket) {
    const cap = rocketCapacity(rocket, mission, alt);
    if (t.mass > cap) warnings.push({ level: 'stop', text: `Too heavy: ${t.mass} kg, but this rocket can carry only ${cap} kg to this orbit. Going farther needs more fuel, so the rocket carries less.` });
  }
  const p = PLANETS[mission.planet];
  if (p.sunlight < 0.2 && t.rtg === 0 && t.solar < 30) warnings.push({ level: 'warn', text: `The Sun is only ${Math.round(p.sunlight * 100)}% as strong here. Small solar panels will not be enough.` });
  const missing = mission.bonusNeeds.filter(id => !partIds.includes(id));
  if (missing.length) warnings.push({ level: 'tip', text: mission.bonusText });

  return { totals: t, budget, buildCost, opsMoney, opsOrbits, warnings, ok: !warnings.some(w => w.level === 'stop') };
}

// ---------- The live mission ----------

export function createMission({ missionId, partIds, alt, rocketId, difficultyId, seed }) {
  const mission = missionById(missionId);
  const diff = difficultyById(difficultyId);
  const rng = makeRng(seed);
  const planet = PLANETS[mission.planet];
  const orbit = orbitInfo(mission.planet, alt, mission);
  const check = checkDesign({ mission, partIds, rocketId, alt, difficultyId });
  const t = check.totals;
  const totalTime = mission.orbits * ORBIT_SECONDS;

  // Targets: places on the planet surface (angle in radians)
  const targets = [];
  for (let i = 0; i < mission.targetCount; i++) {
    const spawn = mission.targetLife ? 4 + rng() * (totalTime - mission.targetLife - 8) : 0;
    targets.push({ id: i, lon: rng() * Math.PI * 2, spawn, life: mission.targetLife || Infinity,
      kind: mission.targetType === 'disaster' ? (rng() < 0.5 ? 'fire' : 'flood') : mission.targetType,
      state: 'waiting' }); // waiting -> visible -> captured | missed
  }
  // Ground stations
  const stations = [];
  for (let i = 0; i < mission.stations; i++) stations.push({ lon: (i / mission.stations) * Math.PI * 2 + 0.6 + rng() * 0.6 });

  // Events: debris and solar flares at fixed times
  const events = [];
  const debrisCount = Math.round((mission.debris ?? 2) * diff.events);
  for (let i = 0; i < debrisCount; i++) events.push({ type: 'debris', time: 10 + rng() * (totalTime - 20), done: false });
  const flareCount = Math.round(1 * diff.events);
  for (let i = 0; i < flareCount; i++) events.push({ type: 'flare', time: 15 + rng() * (totalTime - 30), done: false });
  events.sort((a, b) => a.time - b.time);

  const parts = partIds.map((id, i) => ({ key: i, id, alive: true }));

  return {
    mission, planet, orbit, diff, rng, seed, alt, rocketId, partIds: [...partIds],
    time: 0, totalTime,
    endTime: Math.min(totalTime, orbit.decayOrbits * ORBIT_SECONDS, check.opsOrbits * ORBIT_SECONDS),
    endReason: null, ended: false,
    budgetStart: check.budget, budgetLeft: check.opsMoney,
    battery: t.battery, batteryMax: t.battery,
    memoryMax: t.memory, packets: [], sentScience: 0, sentData: 0,
    fuel: t.fuel, armor: t.armor,
    parts, targets, stations, events,
    powerSave: false, flare: null, debris: null,
    satAngle: 0, planetAngle: 0, inShadow: false, overStation: false, targetInView: null,
    log: { shadowTime: 0, blackoutTime: 0, memoryLost: 0, wastedShots: 0, noPowerShots: 0, missedTargets: 0,
      dodged: 0, debrisHits: 0, flareDamage: 0, radiationHits: 0, partsLost: [], sendAttemptsNoStation: 0, firstBlackout: null },
    lessonsSeen: {},
  };
}

function aliveHas(state, id) { return state.parts.some(p => p.alive && p.id === id); }
function aliveParts(state) { return state.parts.filter(p => p.alive).map(p => partById(p.id)); }

// Which part breaks first. Parts that stick out (solar panels, antennas) get hit by debris first.
const HIT_ORDER = {
  debris: ['solar', 'bigsolar', 'antenna', 'hga', 'radar', 'thermal', 'battery', 'camera', 'hdcamera', 'memory', 'thruster', 'computer', 'rtg'],
  electronics: ['computer', 'thermal', 'radar', 'camera', 'hdcamera', 'antenna', 'hga'],
};

function damagePart(state, cause, order) {
  for (const id of HIT_ORDER[order]) {
    const victim = state.parts.find(p => p.alive && p.id === id);
    if (victim) {
      victim.alive = false;
      state.log.partsLost.push({ id: victim.id, cause, time: Math.round(state.time) });
      return victim.id;
    }
  }
  return null;
}

// Move the mission forward by dt seconds.
// input: { capture, send, togglePower, dodge }  (capture/togglePower/dodge = pressed this frame, send = held)
// Returns a list of messages for the screen: { kind, text }
export function step(state, dt, input = {}) {
  const out = [];
  if (state.ended) return out;
  const lesson = (key, text) => { if (!state.lessonsSeen[key]) { state.lessonsSeen[key] = true; out.push({ kind: 'lesson', key, text }); } };

  state.time += dt;
  state.satAngle = (state.time / ORBIT_SECONDS) * Math.PI * 2;
  state.planetAngle = (state.time / (ORBIT_SECONDS * PLANET_TURN)) * Math.PI * 2;
  const parts = aliveParts(state);
  const sum = key => parts.reduce((s, p) => s + (p[key] || 0), 0);

  // Shadow: the Sun shines from the right (angle 0), so shadow is on the left (angle PI)
  state.inShadow = angleDiff(state.satAngle, Math.PI) < state.orbit.eclipse * Math.PI;
  if (state.inShadow) { state.log.shadowTime += dt; lesson('shadow', null); }

  // Power
  if (input.togglePower) state.powerSave = !state.powerSave;
  const solar = parts.filter(p => p.power && !p.rtg).reduce((s, p) => s + p.power, 0);
  const rtg = parts.filter(p => p.rtg).reduce((s, p) => s + p.power, 0);
  let gen = rtg + (state.inShadow ? 0 : solar * state.planet.sunlight);
  if (state.flare) gen *= 0.5;
  const standby = state.powerSave ? 0 : parts.filter(p => p.use).length * 0.5;
  state.battery += (gen - CORE.idle - standby) * dt;
  state.battery = Math.max(0, Math.min(state.batteryMax, state.battery));
  const blackout = state.battery <= 0.01;
  if (blackout) {
    state.log.blackoutTime += dt;
    if (state.log.firstBlackout === null) state.log.firstBlackout = Math.round(state.time);
    lesson('noPower', null);
  }

  // Targets appear and disappear
  state.targetInView = null;
  for (const tg of state.targets) {
    if (tg.state === 'waiting' && state.time >= tg.spawn) tg.state = 'visible';
    if (tg.state === 'visible' && state.time > tg.spawn + tg.life) { tg.state = 'missed'; state.log.missedTargets++; }
    if (tg.state === 'visible' && angleDiff(state.satAngle, tg.lon + state.planetAngle) < state.orbit.viewHalf) {
      state.targetInView = tg;
      lesson('target', null);
    }
  }

  // Ground stations
  state.overStation = state.stations.some(s => angleDiff(state.satAngle, s.lon + state.planetAngle) < state.orbit.stationHalf);
  if (state.overStation) lesson('station', null);

  // Take a picture
  if (input.capture) {
    const cam = parts.find(p => p.id === 'hdcamera') || parts.find(p => p.id === 'camera');
    const extras = parts.filter(p => p.id === 'thermal' || p.id === 'radar');
    const cost = cam ? cam.use + extras.reduce((s, p) => s + p.use, 0) : 0;
    if (!cam) out.push({ kind: 'bad', text: 'No working camera!' });
    else if (state.powerSave) out.push({ kind: 'bad', text: 'Power save is ON: instruments are off.' });
    else if (state.battery < cost) { state.log.noPowerShots++; out.push({ kind: 'bad', text: 'Not enough power for a picture!' }); lesson('noPower', null); }
    else {
      state.battery -= cost;
      const tg = state.targetInView;
      if (!tg) { state.log.wastedShots++; out.push({ kind: 'bad', text: 'Missed: no target under the satellite.' }); }
      else {
        const bonus = state.mission.bonusNeeds.some(id => extras.some(e => e.id === id)) ? 2 : 1;
        const science = Math.round(10 * state.orbit.quality * (cam.quality || 1) * bonus);
        const size = cam.data + extras.reduce((s, p) => s + p.data, 0);
        const used = state.packets.reduce((s, p) => s + p.left, 0);
        if (used + size > state.memoryMax) {
          state.log.memoryLost += size;
          out.push({ kind: 'bad', text: 'Memory full! The picture was lost.' });
          lesson('memoryFull', null);
        } else {
          tg.state = 'captured';
          state.packets.push({ target: tg.id, science, size, left: size });
          out.push({ kind: 'good', text: `${state.mission.targetEmoji} Captured! +${science} science (send it home to count)` });
        }
      }
    }
  }

  // Send data (held key, or automatic with the smart computer)
  const auto = parts.some(p => p.auto);
  const wantsSend = input.send || auto;
  if (input.send && !state.overStation) state.log.sendAttemptsNoStation += dt;
  const downlink = sum('downlink') * DISTANCE_FACTOR[state.mission.planet];
  const sendUse = parts.reduce((s, p) => s + (p.sendUse || 0), 0);
  state.sending = false;
  if (wantsSend && state.overStation && downlink > 0 && !blackout && state.packets.length) {
    state.sending = true;
    state.battery = Math.max(0, state.battery - sendUse * dt);
    let budget = downlink * dt;
    while (budget > 0 && state.packets.length) {
      const pk = state.packets[0];
      const amount = Math.min(budget, pk.left);
      pk.left -= amount; budget -= amount; state.sentData += amount;
      if (pk.left <= 0.0001) {
        state.packets.shift();
        state.sentScience += pk.science;
        const tg = state.targets.find(x => x.id === pk.target);
        if (tg) tg.state = 'sent';
        out.push({ kind: 'good', text: `📡 Data reached home! +${pk.science} science` });
      }
    }
  }

  // Events
  for (const ev of state.events) {
    if (ev.done) continue;
    if (ev.type === 'debris' && !state.debris && state.time >= ev.time) {
      state.debris = { ev, until: state.time + 3 };
      lesson('debris', null);
    }
    if (ev.type === 'flare' && !state.flare && state.time >= ev.time) {
      state.flare = { ev, until: state.time + 6 };
      lesson('flare', null);
    }
  }
  if (state.debris) {
    if (input.dodge && state.fuel > 0) {
      state.fuel--; state.log.dodged++; state.debris.ev.done = true; state.debris = null;
      out.push({ kind: 'good', text: '🚀 Dodged the debris!' });
    } else if (state.time >= state.debris.until) {
      state.debris.ev.done = true; state.debris = null; state.log.debrisHits++;
      if (state.armor > 0) { state.armor--; out.push({ kind: 'warn', text: '🛡️ The shield took the hit!' }); }
      else { const lost = damagePart(state, 'debris', 'debris'); out.push({ kind: 'bad', text: lost ? `☄️ Debris hit! Lost: ${partById(lost).name}` : '☄️ Debris hit!' }); }
    }
  }
  if (state.flare && state.time >= state.flare.until) {
    state.flare.ev.done = true;
    if (!state.powerSave && state.rng() < 0.6) {
      state.log.flareDamage++;
      const lost = damagePart(state, 'solar flare', 'electronics');
      out.push({ kind: 'bad', text: lost ? `☀️ The flare broke: ${partById(lost).name}. Safe mode would have protected it.` : '☀️ Flare passed.' });
    } else out.push({ kind: 'good', text: '☀️ The flare passed safely.' });
    state.flare = null;
  }

  // Radiation (Jupiter)
  if (state.orbit.radiation > 0) {
    if (state.orbit.radiation > 0.3) lesson('radiation', null);
    const chance = state.orbit.radiation * 0.025 * (state.armor > 0 ? 0.3 : 1) * dt;
    if (state.rng() < chance) {
      state.log.radiationHits++;
      const lost = damagePart(state, 'radiation', 'electronics');
      if (lost) out.push({ kind: 'bad', text: `☢️ Radiation broke: ${partById(lost).name}` });
    }
  }

  // Operating costs
  state.budgetLeft -= (OPS_COST_PER_ORBIT / ORBIT_SECONDS) * dt;

  // End of mission
  if (state.time >= state.endTime) {
    state.ended = true;
    if (state.endTime >= state.totalTime) state.endReason = 'complete';
    else if (state.endTime === state.orbit.decayOrbits * ORBIT_SECONDS) state.endReason = 'decay';
    else state.endReason = 'money';
    for (const tg of state.targets) if (tg.state === 'visible' || tg.state === 'waiting') tg.state = 'missed';
  }
  return out;
}

// Numbers for the dashboard
export function hud(state) {
  const used = state.packets.reduce((s, p) => s + p.left, 0);
  return {
    orbit: Math.min(state.mission.orbits, Math.floor(state.time / ORBIT_SECONDS) + 1),
    orbits: state.mission.orbits,
    power: state.battery / state.batteryMax,
    memory: used / state.memoryMax,
    fuel: state.fuel,
    budget: Math.max(0, Math.round(state.budgetLeft)),
    science: state.sentScience,
    sentTargets: state.targets.filter(t => t.state === 'sent').length,
    capturedTargets: state.targets.filter(t => t.state === 'captured' || t.state === 'sent').length,
    targetCount: state.targets.length,
    timeLeft: Math.max(0, state.endTime - state.time),
  };
}

// ---------- Autopilot (for "what if") ----------

function botInput(state) {
  return {
    capture: Boolean(state.targetInView) && state.battery > 15,
    send: state.overStation,
    dodge: Boolean(state.debris),
    togglePower: Boolean(state.flare) !== state.powerSave,
  };
}

export function runAutopilot(config) {
  const s = createMission(config);
  while (!s.ended) step(s, 0.1, botInput(s));
  return summarize(s);
}

// ---------- Results ----------

export function summarize(state) {
  const h = hud(state);
  const objective = h.sentTargets / h.targetCount;
  const onBoard = state.packets.length;
  return {
    missionId: state.mission.id, objective, sentTargets: h.sentTargets, capturedTargets: h.capturedTargets,
    targetCount: h.targetCount, science: state.sentScience, budgetLeft: h.budget, budgetStart: state.budgetStart,
    partsLost: state.log.partsLost, endReason: state.endReason, onBoard, log: state.log,
    shadowPct: Math.round(state.orbit.eclipse * 100), alt: state.alt, seed: state.seed,
  };
}

export function grade(result) {
  const o = result.objective;
  if (o >= 0.8) return { label: 'MISSION SUCCESS', color: '#22c55e', stars: 3 };
  if (o >= 0.5) return { label: 'PARTIAL SUCCESS', color: '#f59e0b', stars: 2 };
  if (o > 0) return { label: 'WEAK MISSION', color: '#fb923c', stars: 1 };
  return { label: 'MISSION FAILED', color: '#ef4444', stars: 0 };
}

// Plain-language reasons. Each one explains WHY, not just what.
export function explain(result, config) {
  const lines = [];
  const l = result.log;
  const m = missionById(result.missionId);
  lines.push(`You sent ${result.sentTargets} of ${result.targetCount} ${m.targetType === 'disaster' ? 'alerts' : 'targets'} home and earned ${result.science} science.`);
  if (result.endReason === 'decay') lines.push(`Your orbit at ${result.alt} km was too low: air drag pulled the satellite down early. Higher orbits last longer.`);
  if (result.endReason === 'money') lines.push('The money for operations ran out, so the mission ended early. Every orbit costs money for ground stations and people.');
  if (result.onBoard > 0) lines.push(`${result.onBoard} picture(s) were still on board when the mission ended. Data only counts when it reaches Earth!`);
  if (l.blackoutTime > 1) lines.push(`The battery was empty for ${Math.round(l.blackoutTime)} seconds. You spend ${result.shadowPct}% of each orbit in shadow, where solar panels make no power.`);
  if (l.memoryLost > 0) lines.push(`You lost ${Math.round(l.memoryLost)} data units because the memory was full. Send data more often, or add a Memory Bank.`);
  if (l.missedTargets > 0) lines.push(`${l.missedTargets} target(s) were missed. ${m.targetType === 'disaster' ? 'Disasters do not wait: react fast!' : 'Watch for targets passing under your orbit.'}`);
  if (l.wastedShots > 2) lines.push(`${l.wastedShots} pictures were taken with no target under the satellite. Each wasted picture costs power.`);
  for (const p of l.partsLost) lines.push(`Your ${partById(p.id).name} was destroyed by ${p.cause} at ${p.time}s.`);
  if (l.dodged > 0) lines.push(`Great piloting: you dodged ${l.dodged} piece(s) of debris.`);
  return lines;
}

// Try small changes with the autopilot and report the best one, with real numbers.
export function whatIf(config) {
  const base = runAutopilot(config);
  const tries = [
    { label: 'one more Battery', partIds: [...config.partIds, 'battery'] },
    { label: 'one more Solar Panel', partIds: [...config.partIds, 'solar'] },
    { label: 'a Memory Bank', partIds: [...config.partIds, 'memory'] },
    { label: 'a High-Gain Dish', partIds: [...config.partIds.filter(id => id !== 'antenna'), 'hga'] },
    { label: 'a Shield', partIds: [...config.partIds, 'shield'] },
    { label: 'a Thermal Sensor', partIds: [...config.partIds, 'thermal'] },
    { label: 'a higher orbit (+200 km)', alt: Math.min(config.alt + 200 * (config.missionId === 'jupiter' ? 50 : 1), missionById(config.missionId).altMax) },
  ];
  let best = null;
  for (const t of tries) {
    const cfg = { ...config, partIds: t.partIds || config.partIds, alt: t.alt || config.alt };
    const chk = checkDesign({ mission: missionById(cfg.missionId), partIds: cfg.partIds, rocketId: cfg.rocketId, alt: cfg.alt, difficultyId: cfg.difficultyId });
    if (!chk.ok) continue;
    const r = runAutopilot(cfg);
    const gain = (r.sentTargets - base.sentTargets) * 100 + (r.science - base.science);
    if (gain > 0 && (!best || gain > best.gain)) best = { ...t, gain, result: r };
  }
  return { base, best };
}

export function makeChallengeCode(config) {
  return btoa(JSON.stringify([config.missionId, config.seed, config.difficultyId])).replace(/=+$/, '');
}
export function readChallengeCode(code) {
  try {
    const [missionId, seed, difficultyId] = JSON.parse(atob(code.trim()));
    if (!missionById(missionId)) return null;
    return { missionId, seed, difficultyId };
  } catch (e) { return null; }
}
