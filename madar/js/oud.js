// MADAR: a short oud phrase in maqam Hijaz, played when the launch starts.
// The oud is made with the Web Audio API (a plucked-string model called Karplus-Strong),
// so no sound file is needed. To use a real recording instead, put the file in the madar
// folder and write its name in OUD_FILE (for example 'oud.mp3').
export const OUD_FILE = null;

let ctx = null;
let master = null;
let fileAudio = null;
const cache = new Map();

// One plucked string note, made once and reused.
function pluck(freq, seconds) {
  const key = `${freq}|${seconds}`;
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate;
  const period = Math.round(sr / freq);
  const length = Math.floor(sr * seconds);
  const buffer = ctx.createBuffer(1, length, sr);
  const out = buffer.getChannelData(0);
  const ring = new Float32Array(period);
  let prev = 0;
  for (let i = 0; i < period; i++) { prev = 0.6 * prev + 0.4 * (Math.random() * 2 - 1); ring[i] = prev; } // soft pick
  let idx = 0;
  for (let i = 0; i < length; i++) {
    const a = ring[idx], b = ring[(idx + 1) % period];
    ring[idx] = 0.5 * (a + b) * 0.9965; // the string loses energy a little on every trip
    out[i] = a;
    idx = (idx + 1) % period;
  }
  cache.set(key, buffer);
  return buffer;
}

// Maqam Hijaz on D: D Eb F# G A Bb C D
const N = { D2: 73.42, D3: 146.83, Eb3: 155.56, Fs3: 185.0, G3: 196.0, A3: 220.0, Bb3: 233.08, C4: 261.63, D4: 293.66 };

// [note, start time, length, tremolo]  (tremolo = fast repeated plucks, like the oud's "rish")
const PHRASE = [
  ['D2', 0, 2.5], ['D3', 0, 0.45], ['Eb3', 0.45, 0.3], ['Fs3', 0.75, 0.3], ['G3', 1.05, 0.55],
  ['A3', 1.6, 1.0, true], ['Bb3', 2.7, 0.3], ['A3', 3.0, 0.3], ['G3', 3.3, 0.3], ['Fs3', 3.6, 0.55],
  ['G3', 4.15, 0.28], ['Fs3', 4.43, 0.28], ['Eb3', 4.71, 0.4], ['D3', 5.15, 1.1, true],
  ['D2', 6.3, 3.0], ['D3', 6.3, 2.6], ['A3', 6.32, 2.4],
];

function setup() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.55;
  // A warm "body": cut the harsh highs, lift the low wood tone, and add a little room echo.
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 2600;
  const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 240; body.gain.value = 5; body.Q.value = 1;
  const delay = ctx.createDelay(); delay.delayTime.value = 0.23;
  const echo = ctx.createGain(); echo.gain.value = 0.25;
  master.connect(low).connect(body).connect(ctx.destination);
  body.connect(delay).connect(echo).connect(delay);
  echo.connect(ctx.destination);
}

function note(name, start, length, tremolo) {
  const t0 = ctx.currentTime + 0.05 + start;
  const hits = tremolo ? Math.max(1, Math.floor(length / 0.085)) : 1;
  for (let i = 0; i < hits; i++) {
    const src = ctx.createBufferSource();
    src.buffer = pluck(N[name], tremolo ? 0.6 : Math.max(0.8, length + 0.6));
    const g = ctx.createGain();
    g.gain.value = (name === 'D2' ? 0.5 : 0.8) * (tremolo ? (i % 2 ? 0.55 : 0.8) : 1);
    src.connect(g).connect(master);
    src.start(t0 + i * 0.085);
  }
}

export function playOud() {
  try {
    if (OUD_FILE) {
      fileAudio = new Audio(OUD_FILE);
      fileAudio.volume = 0.8;
      fileAudio.play();
      return;
    }
    setup();
    for (const [name, start, length, tremolo] of PHRASE) note(name, start, length, tremolo);
  } catch (e) { /* no sound on this browser */ }
}

// Fade the oud out gently when the mission starts.
export function fadeOud(seconds = 2) {
  try {
    if (fileAudio) {
      const a = fileAudio; const step = a.volume / (seconds * 20);
      const t = setInterval(() => { a.volume = Math.max(0, a.volume - step); if (a.volume <= 0) { a.pause(); clearInterval(t); } }, 50);
      return;
    }
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, seconds / 3);
  } catch (e) { /* nothing to fade */ }
}
