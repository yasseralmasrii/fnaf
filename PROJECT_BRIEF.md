# Data Contract

Everyone must use these exact names. Do not rename anything.
The numbers below are examples only. Real numbers live in the /data JSON files.

```js
// 1) part (parts.json)
{ "id": "solar_small", "name": "Small Solar Panel", "category": "power",
  "mass": 8, "power": 4, "cost": 30, "dataRate": 0, "science": 0,
  "storage": 0, "hp": 20, "sprite": "part_solar_small", "unlockLevel": 1 }

// 2) vehicle (vehicles.json)
{ "id": "medium", "name": "Medium Lifter", "cost": 150,
  "capacity": { "LEO": 500, "SSO": 420, "GEO": 250 } }

// 3) orbit (orbits.json)
{ "id": "LEO", "name": "Low Route", "solarFactor": 1.0, "commsWindow": 0.3,
  "debrisFactor": 1.5, "explain": "Fast and close, but crowded with rocks." }

// 4) level (levels.json)
{ "id": 3, "planet": "Mars", "briefing": "Reach the Mars relay...",
  "budget": 500, "massLimit": 400, "fuel": 40,
  "realRocks": 25, "fakeRocks": 10, "verse": "...", "background": "bg_mars" }

// 5) shipDesign (Hangar -> Race)
{ "parts": [{ "id": "frame_basic", "gx": 0, "gy": 0 }],
  "vehicle": "medium", "orbit": "LEO",
  "totals": { "mass": 380, "powerBalance": 2, "cost": 460, "dataRate": 3, "science": 5 } }

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
