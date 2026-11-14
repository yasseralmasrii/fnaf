// src/systems/raceTracker.js
// Helper for the Race scene. The race handles movement and collisions;
// this tracker handles power, fuel, science, data, and records everything for the report.
// At the end, finish() returns a raceResult in the exact PROJECT_BRIEF shape.

import partsData from "../../data/parts.json";
import orbitsData from "../../data/orbits.json";
import eventsData from "../../data/events.json";

const SCIENCE_SPEED = 0.1; // science points per second, per point of instrument science
const DATA_SPEED = 0.1;    // data points per second, per point of data rate

export function createRaceTracker(level, design) {
  const orbit = orbitsData.find(o => o.id === design.orbit) || { solarFactor: 1, commsWindow: 0.5, scienceBonus: 1 };
  const flare = eventsData.find(e => e.id === "solar_flare");

  // Every part on the ship, with its data. Lost parts are removed from this list.
  const alive = design.parts.map(p => partsData.find(d => d.id === p.id)).filter(Boolean);

  const storage = alive.reduce((sum, p) => sum + p.storage, 0);
  const maxPower = storage + 10; // a small built-in buffer even without batteries

  const t = {
    time: 0,
    fuelLeft: level.fuel,
    fuelUsed: 0,
    fuelOnFakes: 0,
    power: maxPower,
    maxPower,
    powerZeroAt: null,
    partsLost: [],
    fakeDodged: 0,
    realHit: 0,
    dataStored: 0,
    dataDownlinked: 0,
    scienceCollected: 0,
  };

  function has(id) {
    return alive.some(p => p.id === id);
  }

  return {
    // Call every frame. dt = seconds since last frame.
    // options: { thrusting: true/false, inEclipse: true/false, flareActive: true/false }
    tick(dt, options = {}) {
      t.time += dt;

      let made = 0;
      let used = 0;
      for (const p of alive) {
        if (p.category === "propulsion" && !options.thrusting) continue; // thrusters use power only when firing
        if (p.power > 0) made += p.power;
        else used += p.power; // negative
      }
      let light = (level.sunlight ?? 1) * orbit.solarFactor;
      if (options.inEclipse) light = 0;
      if (options.flareActive && flare) light *= flare.powerCut;

      t.power += (made * light + used) * dt;
      t.power = Math.max(0, Math.min(t.maxPower, t.power));
      if (t.power === 0 && t.powerZeroAt === null) t.powerZeroAt = Math.round(t.time);

      // Instruments and antenna only work with power.
      if (t.power > 0) {
        const science = alive.reduce((s, p) => s + p.science, 0);
        const dataRate = alive.reduce((s, p) => s + p.dataRate, 0);
        const downlink = alive.reduce((s, p) => s + p.downlink, 0);
        t.scienceCollected += science * orbit.scienceBonus * SCIENCE_SPEED * dt;
        t.dataStored += dataRate * DATA_SPEED * dt;
        const sent = Math.min(t.dataStored, downlink * orbit.commsWindow * DATA_SPEED * dt);
        t.dataStored -= sent;
        t.dataDownlinked += sent;
      }
    },

    // Call when the ship burns fuel. Set dodgingFake to true if the player is dodging a fake rock.
    // Returns false if there is no fuel left.
    useFuel(amount, dodgingFake = false) {
      if (t.fuelLeft <= 0) return false;
      const burn = Math.min(amount, t.fuelLeft);
      t.fuelLeft -= burn;
      t.fuelUsed += burn;
      if (dodgingFake) t.fuelOnFakes += burn;
      return true;
    },

    // Use a small amount of extra power (for example, boost). Returns false if not enough power.
    usePower(amount) {
      if (t.power < amount) return false;
      t.power -= amount;
      return true;
    },

    
        // Call when a part breaks off the ship. cause = "rock" or "radiation".
    losePart(id, cause = "rock") {
      const i = alive.findIndex(p => p.id === id);
      if (i >= 0) {
        alive.splice(i, 1);
        t.partsLost.push({ id, t: Math.round(t.time), cause });
      }
    },

    // Call when the ship passes close to a fake rock (Sarab).
    fakeDodged() { t.fakeDodged += 1; },

    // Call when the ship hits a real rock.
    realHit() { t.realHit += 1; },

    // Is the scanner on? (installed, not broken, and there is power)
    scannerOn() { return has("scanner") && t.power > 0; },

    // Does the ship still have this part?
    has,

    // For the HUD: numbers to show on screen.
    hud() {
      return {
        time: Math.round(t.time),
        fuel: Math.round(t.fuelLeft),
        power: Math.round(t.power),
        maxPower: t.maxPower,
        data: Math.round(t.dataDownlinked),
      };
    },

    // Call once when the race ends. Returns raceResult (PROJECT_BRIEF shape).
    finish(finished) {
      return {
        finished: Boolean(finished),
        time: Math.round(t.time),
        fuelUsed: Math.round(t.fuelUsed),
        fuelOnFakes: Math.round(t.fuelOnFakes),
        powerZeroAt: t.powerZeroAt,
        partsLost: t.partsLost,
        fakeDodged: t.fakeDodged,
        realHit: t.realHit,
        dataDownlinked: Math.round(t.dataDownlinked),
        scienceCollected: Math.round(t.scienceCollected),
      };
    },
  };
}
