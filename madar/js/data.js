// MADAR game data. All numbers live here, so the game is easy to balance.
// Money is in millions of dollars ($M). Mass in kg. Power in units per second.

export const PLANETS = {
  earth:   { name: 'Earth',   radius: 6371,  mu: 398600,    sunlight: 1.00, color: '#3b82f6', land: '#22c55e' },
  mars:    { name: 'Mars',    radius: 3390,  mu: 42828,     sunlight: 0.43, color: '#ef6c3a', land: '#b4532a' },
  jupiter: { name: 'Jupiter', radius: 69911, mu: 126686534, sunlight: 0.04, color: '#e8b27a', land: '#c2410c' },
};

// Each mission: where, why, what counts as success, and what makes it hard.
export const MISSIONS = [
  {
    id: 'gulf', name: 'Gulf Reef Watch', emoji: '🐠', planet: 'earth', difficulty: 'Easy',
    story: 'The Arabian Gulf is getting hotter, and coral reefs near Bahrain are in danger. Build a satellite that watches the reefs and warns scientists early.',
    goalText: 'Scan coral reefs and send the images home.',
    targetType: 'reef', targetEmoji: '🪸', targetCount: 6, targetLife: 0, needs: ['camera'],
    bonusNeeds: ['thermal'], bonusText: 'A thermal sensor measures sea temperature too (double science).',
    stations: 2, orbits: 6, budget: 150, devLimit: 16, debris: 1, altMin: 250, altMax: 1500, altStart: 600,
    critical: ['Data', 'Communications'],
    nasa: 'Real life: NOAA Coral Reef Watch uses satellites that measure sea surface temperature to warn when corals may bleach. Landsat satellites fly at about 705 km in a sun-synchronous orbit.',
  },
  {
    id: 'disaster', name: 'Disaster Alert', emoji: '🔥', planet: 'earth', difficulty: 'Normal',
    story: 'Wildfires and floods start without warning. Catch them from space before they reach cities. Every second counts.',
    goalText: 'Spot fires and floods before they disappear, then send the alerts.',
    targetType: 'disaster', targetEmoji: '🔥', targetCount: 8, targetLife: 30, needs: ['camera'],
    bonusNeeds: ['thermal'], bonusText: 'Fires are hot: a thermal sensor finds them through smoke (double science on fires).',
    stations: 2, orbits: 6, budget: 185, devLimit: 14, debris: 2, altMin: 250, altMax: 1500, altStart: 500,
    critical: ['Power', 'Time'],
    nasa: 'Real life: NASA FIRMS uses the MODIS and VIIRS instruments to find active fires around the world, often within hours.',
  },
  {
    id: 'mars', name: 'Mars Water Hunter', emoji: '🔴', planet: 'mars', difficulty: 'Hard',
    story: 'Is there water ice under the surface of Mars? Find it, but remember: Mars is far, so sending data home is slow.',
    goalText: 'Scan ice deposits and send the data across space to Earth.',
    targetType: 'ice', targetEmoji: '🧊', targetCount: 6, targetLife: 0, needs: ['camera'],
    bonusNeeds: ['radar'], bonusText: 'Radar sees ice under the ground (double science).',
    stations: 2, orbits: 6, budget: 345, devLimit: 22, launchWindow: true, debris: 2, altMin: 200, altMax: 1200, altStart: 300,
    critical: ['Power', 'Communications'],
    nasa: 'Real life: NASA\'s Mars Reconnaissance Orbiter flies about 300 km above Mars and uses a 3 m high-gain antenna to send data to Earth through the Deep Space Network.',
  },
  {
    id: 'jupiter', name: 'Jupiter Storm Chaser', emoji: '🪐', planet: 'jupiter', difficulty: 'Expert',
    story: 'Study the giant storms of Jupiter. The Sun is very weak out there, and the radiation can kill electronics.',
    goalText: 'Scan Jupiter\'s storms and survive the radiation.',
    targetType: 'storm', targetEmoji: '🌀', targetCount: 5, targetLife: 0, needs: ['camera'],
    bonusNeeds: ['thermal'], bonusText: 'A thermal sensor sees deep inside the storms (double science).',
    stations: 1, orbits: 5, budget: 445, devLimit: 26, debris: 0, altMin: 5000, altMax: 80000, altStart: 20000,
    critical: ['Power', 'Radiation'],
    nasa: 'Real life: NASA\'s Juno is solar powered even at Jupiter, with three huge solar arrays. Its electronics sit inside a titanium "radiation vault".',
  },
];

// The satellite parts. "slot" decides which card group the part is in.
export const PARTS = [
  // Power
  { id: 'solar',   name: 'Solar Panel',  emoji: '☀️', group: 'Power', mass: 10, cost: 8,  power: 6,  tier: 'basic', dev: 1,
    info: 'Makes power in sunlight. Makes NOTHING in shadow.' },
  { id: 'bigsolar', name: 'Big Solar Wing', emoji: '🌞', group: 'Power', mass: 25, cost: 20, power: 15, tier: 'advanced', dev: 3,
    info: 'Lots of power in sunlight. Heavy.' },
  { id: 'battery', name: 'Battery',      emoji: '🔋', group: 'Power', mass: 12, cost: 6,  storage: 40, tier: 'basic', dev: 1,
    info: 'Stores power for the shadow side of the planet.' },
  { id: 'rtg',     name: 'Nuclear RTG',  emoji: '☢️', group: 'Power', mass: 45, cost: 45, power: 7,  tier: 'advanced', dev: 6, rtg: true,
    info: 'Steady power from heat, even in shadow and far from the Sun. Very expensive.' },
  // Instruments
  { id: 'camera',  name: 'Camera',       emoji: '📷', group: 'Science', mass: 8,  cost: 12, use: 8,  data: 10, quality: 1, tier: 'basic', dev: 1,
    info: 'Takes pictures of targets. Uses power for each picture.' },
  { id: 'hdcamera', name: 'HD Camera',   emoji: '🎥', group: 'Science', mass: 15, cost: 26, use: 12, data: 18, quality: 2, tier: 'advanced', dev: 3,
    info: 'Sharper pictures (double science), but more power and more data.' },
  { id: 'thermal', name: 'Thermal Sensor', emoji: '🌡️', group: 'Science', mass: 7, cost: 10, use: 4, data: 5, tier: 'basic', dev: 1,
    info: 'Measures heat. Finds fires and hot seas.' },
  { id: 'radar',   name: 'Radar',        emoji: '📡', group: 'Science', mass: 22, cost: 30, use: 14, data: 12, tier: 'advanced', dev: 3,
    info: 'Sees through clouds and under the ground. Uses lots of power.' },
  // Communications and data
  { id: 'antenna', name: 'Antenna',      emoji: '📶', group: 'Comms', mass: 4,  cost: 5,  downlink: 8,  sendUse: 3, tier: 'basic', dev: 1,
    info: 'Sends data to ground stations. Slow.' },
  { id: 'hga',     name: 'High-Gain Dish', emoji: '🛰️', group: 'Comms', mass: 14, cost: 18, downlink: 24, sendUse: 6, tier: 'advanced', dev: 3,
    info: 'Sends data 3 times faster. Needed far from Earth.' },
  { id: 'crypto',  name: 'Encryption Module', emoji: '🔐', group: 'Comms', mass: 3, cost: 7, secure: true, sendUse: 1, tier: 'basic', dev: 1,
    info: 'Checks and encrypts every command and every data packet. Blocks hackers who send fake commands. Uses a little power when sending.' },
  { id: 'memory',  name: 'Memory Bank',  emoji: '💾', group: 'Comms', mass: 3,  cost: 4,  memory: 60, tier: 'basic', dev: 1,
    info: 'Holds more data until you can send it.' },
  // Protection and control
  { id: 'thruster', name: 'Thruster',    emoji: '🚀', group: 'Control', mass: 18, cost: 10, fuel: 3, tier: 'basic', dev: 1,
    info: 'Dodges space debris. Each dodge uses fuel.' },
  { id: 'wheels',  name: 'Reaction Wheels', emoji: '🎡', group: 'Control', mass: 9, cost: 6, attitude: true, tier: 'basic', dev: 1,
    info: 'Attitude control: spins wheels to point the satellite. Without them, pictures come out blurry.' },
  { id: 'shield',  name: 'Shield',       emoji: '🛡️', group: 'Control', mass: 25, cost: 12, armor: 1, tier: 'basic', dev: 1,
    info: 'Protects from debris and radiation. Heavy.' },
  { id: 'computer', name: 'Smart Computer', emoji: '🧠', group: 'Control', mass: 6, cost: 15, auto: true, tier: 'advanced', dev: 3,
    info: 'Sends data automatically when over a station.' },
];

// The core of every satellite (always there).
export const CORE = { mass: 30, cost: 20, battery: 25, memory: 40, idle: 1, dev: 6 };

// Development time: building and testing the satellite before launch.
// Every month past the deadline costs money (engineers still need to be paid).
export const LATE_COST_PER_MONTH = 3;

// Orbit types. Each one changes the mission in a different way (real trade-offs).
export const ORBIT_TYPES = [
  { id: 'equatorial', name: 'Equatorial', emoji: '🟰', planets: ['earth', 'mars', 'jupiter'],
    short: 'Flies around the middle of the planet.',
    good: 'Cheapest to reach: the planet\'s spin helps the rocket (+10% capacity). Passes ground stations often.',
    bad: 'Only sees the middle of the planet, so it sees fewer targets.',
    coverage: 0.75, stations: 1.25, eclipse: 1, rocket: 1.1, radiation: 1 },
  { id: 'polar', name: 'Polar', emoji: '🧭', planets: ['earth', 'mars', 'jupiter'],
    short: 'Flies over the North and South poles.',
    good: 'The planet turns under you, so you can see EVERY place. At Jupiter it skips the worst radiation belts (like Juno!).',
    bad: 'Harder to reach: the rocket carries 15% less. Passes ground stations less often.',
    coverage: 1.2, stations: 0.85, eclipse: 1, rocket: 0.85, radiation: 0.45 },
  { id: 'sso', name: 'Sun-synchronous', emoji: '🌅', planets: ['earth', 'mars'],
    short: 'A special polar orbit that follows the line between day and night.',
    good: 'Almost always in sunlight (much less shadow), and the same light for every picture. Landsat uses it.',
    bad: 'The rocket carries 15% less, and it is a bit harder to see targets than a pure polar orbit.',
    coverage: 1.1, stations: 0.85, eclipse: 0.35, rocket: 0.85, radiation: 1 },
];

export const ROCKETS = [
  { id: 'small',  name: 'Small Rocket',  emoji: '🧨', cost: 25, capacity: 300 },
  { id: 'medium', name: 'Medium Rocket', emoji: '🚀', cost: 55, capacity: 700 },
  { id: 'heavy',  name: 'Heavy Rocket',  emoji: '🛸', cost: 110, capacity: 1600 },
];

// How much of the rocket's capacity is left after the trip (going far needs more fuel).
export const TRIP_FACTOR = { earth: 1, mars: 0.35, jupiter: 0.2 };

// Operating cost per orbit ($M): ground stations, engineers, scientists.
export const OPS_COST_PER_ORBIT = 6;

export const DIFFICULTIES = [
  { id: 'easy',    name: 'Easy',    budget: 1.25, events: 0.5, basicOnly: true },
  { id: 'normal',  name: 'Normal',  budget: 1,    events: 1,   basicOnly: false },
  { id: 'hard',    name: 'Hard',    budget: 0.85, events: 1.6, basicOnly: false },
  { id: 'sandbox', name: 'Sandbox', budget: 50,   events: 1,   basicOnly: false },
];

// Which player does which job, for 1 to 4 players
export const ROLE_PLAYERS = {
  1: { scientist: 1, comms: 1, engineer: 1, pilot: 1 },
  2: { scientist: 1, pilot: 1, comms: 2, engineer: 2 },
  3: { scientist: 1, comms: 2, engineer: 3, pilot: 3 },
  4: { scientist: 1, comms: 2, engineer: 3, pilot: 4 },
};

// Team roles (keys) for 1 to 4 players.
export const ROLES = [
  { id: 'scientist', name: 'Scientist', emoji: '🔬', key: 'SPACE', job: 'Take pictures of targets' },
  { id: 'comms',     name: 'Comms',     emoji: '📡', key: 'D',     job: 'Send data over stations' },
  { id: 'engineer',  name: 'Engineer',  emoji: '🔋', key: 'E',     job: 'Power save mode on/off' },
  { id: 'pilot',     name: 'Pilot',     emoji: '🧭', key: 'W',     job: 'Dodge space debris' },
];

// The poem shown after the countdown, before the mission starts.
// Each line is a string, or a pair [first half, second half] for a classic two-part verse.
// Leave lines empty ([]) to skip the poem page.
export const POEM = {
  lines: [
    ['وَبَلدَةٍ يَرهَبُ الجَوّابُ دُلجَتَها', 'حَتّى تَراهُ عَلَيها يَبتَغي النُجُما'],
  ],
  poet: 'الأعشى',
};

// Short lessons, shown the first time something happens.
export const LESSONS = {
  blurry: '🎡 No reaction wheels! The satellite cannot point steadily, so pictures come out blurry (less science).',
  outOfReach: '🚫 This target is too far north or south. Your equatorial orbit never flies over it! A polar orbit can see the whole planet.',
  cyber: '☠️ Cyber attack! A hacker sent a FAKE command to your satellite. This is called spoofing. An Encryption Module checks every command and blocks fake ones, like NASA does with its real satellites.',
  shadow: '🌑 You entered the planet\'s shadow. Solar panels make no power here, so the battery keeps the satellite alive.',
  station: '📡 You are over a ground station! You can only send data when a station can "see" you.',
  memoryFull: '💾 Memory is full! New pictures are lost until you send data home.',
  noPower: '⚡ Out of power! Instruments stopped. More solar panels or batteries would help.',
  debris: '☄️ Space debris ahead! Dodge it with a thruster, or a shield can protect you.',
  target: '🎯 A target is under you! Take a picture now.',
  radiation: '☢️ Radiation zone! Low orbits around Jupiter are full of radiation. A shield helps.',
  flare: '☀️ Solar flare! The Sun sent a burst of energy. Safe mode protects the satellite but stops science.',
};
