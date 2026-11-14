# Data Contract

Everyone must use these exact names. Do not rename anything.
The numbers below are examples only. Real numbers live in the /data JSON files.

```js
// 1) part (parts.json)
{ "id": "solar_small", "name": "Solar Panel", "category": "power",
  "mass": 15, "power": 5, "cost": 40, "dataRate": 0, "downlink": 0, "science": 0,
  "storage": 0, "hp": 15, "sprite": "part_solar", "unlockLevel": 1 }
// dataRate = data the part makes (instruments). downlink = data the part can send (antenna).

// 2) vehicle (vehicles.json)
{ "id": "medium", "name": "Medium Lifter", "cost": 150,
  "capacity": { "LEO": 450, "SSO": 380, "GEO": 160 } }

// 3) orbit (orbits.json)
{ "id": "LEO", "name": "Low Route", "solarFactor": 0.65, "commsWindow": 0.3,
  "lifetime": 0.4, "scienceBonus": 1.3, "debrisFactor": 1.5,
  "explain": "Close to Earth: great for science, but crowded with rocks." }

// 4) level (levels.json)
{ "id": 3, "planet": "Mars", "briefing": "Reach the Mars relay...",
  "budget": 650, "massLimit": 350, "fuel": 45,
  "realRocks": 20, "fakeRocks": 10, "fakeShimmer": 0.8, "sunlight": 0.43,
  "events": ["solar_flare"], "requiredParts": ["antenna"],
  "verse": "...", "background": "bg_mars" }

// 5) shipDesign (Hangar -> Race)
{ "parts": [{ "id": "frame_basic", "gx": 0, "gy": 0 }],
  "vehicle": "medium", "orbit": "LEO",
  "totals": { "mass": 225, "powerBalance": 3, "cost": 440, "dataRate": 1, "downlink": 5, "science": 2, "storage": 60 } }

// 6) raceResult (Race -> Report)
{ "finished": true, "time": 94, "fuelUsed": 31, "fuelOnFakes": 6,
  "powerZeroAt": null, "partsLost": [{ "id": "solar_small", "t": 72 }],
  "fakeDodged": 5, "realHit": 2, "dataDownlinked": 12, "scienceCollected": 8 }
```

## Seven Stars (score)
1. Finished
2. Time
3. Fuel left
4. Power efficiency
5. Science
6. Ship condition
7. Scan accuracy

## Systems functions (src/systems)
- computeTotals(placedParts) -> totals   (resources.js)
- getWarnings(totals, level, placedParts) -> [{ type, text }]   (warnings.js)
- checkLaunch(design, level) -> { ok, reasons, capacity, totalCost }   (launchCheck.js)
