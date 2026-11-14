// MADAR: screens and game flow.
import { MISSIONS, PARTS, ROCKETS, DIFFICULTIES, PLANETS, ROLES, OPS_COST_PER_ORBIT } from './data.js';
import {
  missionById, partById, difficultyById, designTotals, checkDesign, orbitInfo, formatPeriod,
  rocketCapacity, grade, explain, whatIf, makeChallengeCode, readChallengeCode,
} from './sim.js';
import { render, toast, store, statCard, warningsHtml, modal, $, $$ } from './ui.js';
import { startOps } from './ops.js';

const MAX_PARTS = 12;
const MAJLIS_KEY = 'madar_majlis';

// The whole game state in one place
const G = {
  name: store('madar_name') || 'Pilot',
  players: 1,
  difficultyId: 'normal',
  missionId: null,
  promise: 0,
  partIds: [],
  alt: 0,
  rocketId: null,
  seed: 1,
  challenge: false,
  config: null,
  result: null,
  team: null,
};

function newSeed() { return Math.floor(Math.random() * 1e9); }

// ---------- 1. Home ----------

function home() {
  render(`
    <div class="center mt2">
      <div class="title">MADAR · مدار</div>
      <div class="subtitle">Design it. Launch it. Fly it. Run your own space mission.</div>
    </div>

    <div class="grid g4 mt2">
      ${[['🎯', 'Choose a mission', 'Pick a problem to solve and set your goal.'],
         ['🛠️', 'Build a satellite', 'Every part has a cost. There is no perfect design.'],
         ['🚀', 'Launch into orbit', 'Pick a rocket and drag your orbit higher or lower.'],
         ['🕹️', 'Fly the mission', 'Take pictures, save power, send data home, dodge debris.']]
        .map(([e, t, s], i) => `<div class="card center"><div class="big-emoji">${e}</div><h3 class="mt">${i + 1}. ${t}</h3><div class="small">${s}</div></div>`).join('')}
    </div>

    <div class="grid g3 mt2">
      <div class="card dark">
        <h3>👤 Your name</h3>
        <input id="name" type="text" maxlength="14" value="${G.name}" class="mt" />
      </div>
      <div class="card dark">
        <h3>👥 Players (same keyboard)</h3>
        <div class="row mt">${[1, 2, 3, 4].map(n => `<button class="toggle ${G.players === n ? 'on' : ''}" data-players="${n}">${n}</button>`).join('')}</div>
        <div class="small mt">${G.players === 1 ? 'Solo: you do every job.' : `Team: each player gets a role. Share the power and talk!`}</div>
      </div>
      <div class="card dark">
        <h3>⚙️ Difficulty</h3>
        <div class="row mt">${DIFFICULTIES.map(d => `<button class="toggle ${G.difficultyId === d.id ? 'on' : ''}" data-diff="${d.id}">${d.name}</button>`).join('')}</div>
        <div class="small mt">${{ easy: 'Basic parts only, more money, fewer surprises.', normal: 'The real challenge.', hard: 'Less money and more space debris.', sandbox: 'Unlimited money. Experiment freely!' }[G.difficultyId]}</div>
      </div>
    </div>

    <div class="row mt2" style="justify-content:center">
      <button class="btn" id="play">🚀 New Mission</button>
      <button class="btn secondary" id="code">🎯 Challenge Code</button>
      <button class="btn secondary" id="majlis">🏆 Majlis</button>
    </div>
  `);
  $('#name').addEventListener('input', e => { G.name = e.target.value.trim() || 'Pilot'; store('madar_name', G.name); });
  $$('[data-players]').forEach(b => b.onclick = () => { G.players = +b.dataset.players; home(); });
  $$('[data-diff]').forEach(b => b.onclick = () => { G.difficultyId = b.dataset.diff; home(); });
  $('#play').onclick = () => { G.challenge = false; G.seed = newSeed(); missions(); };
  $('#majlis').onclick = () => majlis(G.missionId || MISSIONS[0].id);
  $('#code').onclick = () => {
    const code = prompt('Paste a challenge code from another team:');
    if (!code) return;
    const c = readChallengeCode(code);
    if (!c) { toast('That code is not valid', 'bad'); return; }
    Object.assign(G, { missionId: c.missionId, seed: c.seed, difficultyId: c.difficultyId, challenge: true });
    toast('Challenge loaded: same mission, same events. Beat their score!', 'good');
    contract();
  };
}

// ---------- 2. Missions ----------

function missions() {
  render(`
    <div class="row spread"><div><div class="screen-title">🎯 Choose your mission</div>
      <div class="screen-sub">Every mission solves a real problem. Each one makes a different resource critical.</div></div>
      <button class="btn secondary small" id="back">← Back</button></div>
    <div class="grid g2 mt">
      ${MISSIONS.map(m => `
        <div class="card pick" data-m="${m.id}">
          <div class="row spread"><div class="big-emoji">${m.emoji}</div><span class="badge b-${m.difficulty.toLowerCase()}">${m.difficulty}</span></div>
          <h3 class="mt">${m.name}</h3>
          <div>${m.story}</div>
          <div class="mt"><b>Goal:</b> ${m.goalText}</div>
          <div class="mt small">Planet: <b>${PLANETS[m.planet].name}</b> · Sunlight: <b>${Math.round(PLANETS[m.planet].sunlight * 100)}%</b> · Most critical: ${m.critical.map(c => `<span class="chip">${c}</span>`).join('')}</div>
        </div>`).join('')}
    </div>
  `);
  $('#back').onclick = home;
  $$('[data-m]').forEach(c => c.onclick = () => {
    if (G.missionId !== c.dataset.m) { G.partIds = []; G.rocketId = null; }
    G.missionId = c.dataset.m;
    contract();
  });
}

// ---------- 3. Mission requirement (the player defines the objective) ----------

function contract() {
  const m = missionById(G.missionId);
  const min = Math.ceil(m.targetCount / 2);
  if (G.promise < min || G.promise > m.targetCount) G.promise = Math.ceil(m.targetCount * 0.75);
  const budget = Math.round(m.budget * difficultyById(G.difficultyId).budget);
  const draw = () => {
    render(`
      <div class="row spread"><div><div class="screen-title">${m.emoji} ${m.name}: set your requirement</div>
        <div class="screen-sub">Real missions decide their goal BEFORE building anything. What will yours promise?</div></div>
        <button class="btn secondary small" id="back">← Missions</button></div>

      <div class="grid g2 mt">
        <div class="card">
          <h3>📜 Mission requirement</h3>
          <div class="mt" style="font-size:20px">"Our satellite will deliver <b style="font-size:30px">${G.promise}</b> of ${m.targetCount} ${m.targetEmoji} ${m.targetType === 'disaster' ? 'alerts' : 'scans'} to Earth."</div>
          <input type="range" id="promise" min="${min}" max="${m.targetCount}" value="${G.promise}" class="mt" />
          <div class="small mt">A bigger promise gives more points if you make it, but you lose points if you fall short. Choose a goal your team can really reach.</div>
          <div class="mt">Points if met: <b style="color:#16a34a">+${G.promise * 50}</b> · if missed: <b style="color:#dc2626">−${G.promise * 25}</b></div>
        </div>
        <div class="card">
          <h3>📋 Mission constraints</h3>
          <div class="grid g2 mt">
            ${statCard('s-money', 'Total budget', `$${budget}M`)}
            ${statCard('s-science', 'Mission lifetime', `${m.orbits} orbits`)}
            ${statCard('s-power', 'Sunlight', `${Math.round(PLANETS[m.planet].sunlight * 100)}%`)}
            ${statCard('s-data', 'Ground stations', `${m.stations}`)}
          </div>
          <div class="small mt">💰 The budget pays for the satellite, the rocket, AND $${OPS_COST_PER_ORBIT}M for every orbit you operate it. Spend it all on building and the mission ends early!</div>
          <div class="small mt">⭐ Most critical here: ${m.critical.map(c => `<span class="chip">${c}</span>`).join('')}</div>
        </div>
      </div>
      <div class="row mt2" style="justify-content:flex-end"><button class="btn" id="next">🛠️ Build the satellite →</button></div>
    `);
    $('#back').onclick = missions;
    $('#promise').oninput = e => { G.promise = +e.target.value; draw(); };
    $('#next').onclick = build;
  };
  draw();
}

// ---------- 4. Build ----------

function build() {
  const m = missionById(G.missionId);
  const diff = difficultyById(G.difficultyId);
  const available = PARTS.filter(p => !diff.basicOnly || p.tier === 'basic');
  const planet = PLANETS[m.planet];

  const draw = () => {
    const chk = checkDesign({ mission: m, partIds: G.partIds, rocketId: null, alt: G.alt || m.altStart, difficultyId: G.difficultyId });
    const t = chk.totals;
    const sunPower = Math.round((t.solar * planet.sunlight + t.rtg) * 10) / 10;
    const groups = [...new Set(available.map(p => p.group))];
    const n = G.partIds.length;
    render(`
      <div class="row spread"><div><div class="screen-title">🛠️ Build your satellite</div>
        <div class="screen-sub">Click a part to add it. Click it on the satellite to remove it. Watch every number change.</div></div>
        <div class="row"><button class="btn secondary small" id="back">← Requirement</button>
        <button class="btn secondary small" id="share">🔗 Share design</button><button class="btn secondary small" id="load">📥 Load design</button></div></div>

      <div class="grid mt" style="grid-template-columns: 300px 1fr 300px">
        <div class="parts-col">
          ${groups.map(g => `<div class="group-title">${g}</div>${available.filter(p => p.group === g).map(p => `
            <div class="part" data-add="${p.id}" title="${p.info}">
              <div class="e">${p.emoji}</div>
              <div><div class="n">${p.name} <span class="chip">$${p.cost}M</span><span class="chip">${p.mass} kg</span></div>
              <div class="i">${p.info}</div></div>
            </div>`).join('')}`).join('')}
        </div>

        <div>
          <div class="sat-stage" id="stage">
            <div class="sat-core">🛰️</div>
            ${G.partIds.map((id, i) => {
              const a = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
              const r = 140;
              return `<div class="sat-part" data-remove="${i}" title="Remove ${partById(id).name}" style="left:calc(50% + ${Math.round(Math.cos(a) * r)}px); top:calc(50% + ${Math.round(Math.sin(a) * r * 0.85)}px)">${partById(id).emoji}</div>`;
            }).join('')}
            <div class="drop-hint">${n}/${MAX_PARTS} parts</div>
          </div>
          <div class="mt">${warningsHtml(chk.warnings)}</div>
        </div>

        <div class="side-stack">
          ${statCard('s-money', 'Satellite cost', `$${t.cost}M of $${chk.budget}M`, t.cost / chk.budget)}
          ${statCard('s-mass', 'Mass', `${t.mass} kg`)}
          ${statCard('s-power', `Power in sun (${Math.round(planet.sunlight * 100)}% sunlight)`, `+${sunPower}/s`)}
          ${statCard('s-power', 'Power in shadow', `+${t.rtg}/s ${t.rtg ? '' : '(battery only!)'}`)}
          ${statCard('s-power', 'Battery', `${t.battery}`)}
          ${statCard('s-data', 'Memory · Send speed', `${t.memory} · ${t.downlink}/s`)}
          ${statCard('s-fuel', 'Debris dodges · Shield', `${t.fuel} · ${t.armor ? 'yes' : 'no'}`)}
          <button class="btn green" id="next" ${chk.warnings.some(w => w.level === 'stop') ? 'disabled' : ''}>🚀 Choose orbit →</button>
        </div>
      </div>
    `);
    $('#back').onclick = contract;
    $$('[data-add]').forEach(el => el.onclick = () => {
      if (G.partIds.length >= MAX_PARTS) { toast('The satellite is full!', 'bad'); return; }
      G.partIds.push(el.dataset.add); draw();
    });
    $$('[data-remove]').forEach(el => el.onclick = () => { G.partIds.splice(+el.dataset.remove, 1); draw(); });
    $('#next').onclick = launch;
    $('#share').onclick = () => {
      const code = btoa(JSON.stringify([G.missionId, G.partIds]));
      navigator.clipboard && navigator.clipboard.writeText(code).catch(() => {});
      modal(`<h3>🔗 Your design code</h3><div class="small mt">Send it to another team so they can try your satellite.</div><textarea style="width:100%;height:80px;margin-top:10px" readonly>${code}</textarea>`);
    };
    $('#load').onclick = () => {
      const code = prompt('Paste a design code:');
      if (!code) return;
      try {
        const [mid, ids] = JSON.parse(atob(code.trim()));
        if (mid !== G.missionId) toast(`This design was made for another mission (${missionById(mid).name}).`, 'warn');
        G.partIds = ids.filter(id => partById(id)).slice(0, MAX_PARTS); draw(); toast('Design loaded!', 'good');
      } catch (e) { toast('That code is not valid', 'bad'); }
    };
  };
  draw();
}

// ---------- 5. Launch: orbit + rocket ----------

function launch() {
  const m = missionById(G.missionId);
  const planet = PLANETS[m.planet];
  if (!G.alt || G.alt < m.altMin || G.alt > m.altMax) G.alt = m.altStart;
  if (!G.rocketId) G.rocketId = 'medium';
  let raf = null;

  const draw = () => {
    const chk = checkDesign({ mission: m, partIds: G.partIds, rocketId: G.rocketId, alt: G.alt, difficultyId: G.difficultyId });
    const oi = orbitInfo(m.planet, G.alt, m);
    const step = m.planet === 'jupiter' ? 1000 : 10;
    render(`
      <div class="row spread"><div><div class="screen-title">🚀 Orbit and launch</div>
        <div class="screen-sub">Drag the slider to move your orbit. Higher sees more but sharper pictures need lower orbits.</div></div>
        <button class="btn secondary small" id="back">← Build</button></div>

      <div class="grid mt" style="grid-template-columns: 1.2fr 1fr">
        <div class="card dark">
          <canvas id="orbitCanvas" width="640" height="420"></canvas>
          <div class="row spread mt"><b>Altitude: <span style="font-size:24px">${G.alt.toLocaleString()} km</span></b><span class="small">${m.altMin.toLocaleString()} – ${m.altMax.toLocaleString()} km</span></div>
          <input type="range" id="alt" min="${m.altMin}" max="${m.altMax}" step="${step}" value="${G.alt}" />
        </div>
        <div class="side-stack">
          <div class="grid g2">
            ${statCard('s-science', 'One orbit takes (real)', formatPeriod(oi.periodSec))}
            ${statCard('s-power', 'Time in shadow', `${Math.round(oi.eclipse * 100)}%`)}
            ${statCard('s-target', 'Picture sharpness', `${Math.round(oi.quality * 100)}%`)}
            ${statCard('s-data', 'View width', `${oi.swathKm.toLocaleString()} km`)}
            ${statCard(oi.decayOrbits < Infinity ? 's-fuel alarm' : 's-money', 'Orbit lifetime', oi.decayOrbits < Infinity ? `Falls after ${oi.decayOrbits} orbits!` : 'Stable')}
            ${m.planet === 'jupiter' ? statCard(oi.radiation > 0.3 ? 's-fuel alarm' : 's-money', 'Radiation', `${Math.round(oi.radiation * 100)}%`) : statCard('s-mass', 'Planet', planet.name)}
          </div>
          <div class="grid g3">
            ${ROCKETS.map(r => {
              const cap = rocketCapacity(r, m, G.alt);
              const fits = chk.totals.mass <= cap;
              return `<div class="card pick ${G.rocketId === r.id ? 'selected' : ''}" data-r="${r.id}" style="padding:12px">
                <div class="big-emoji" style="font-size:34px">${r.emoji}</div><b>${r.name}</b>
                <div class="small">$${r.cost}M</div><div class="small">Carries ${cap} kg</div>
                <div style="font-weight:800;color:${fits ? '#16a34a' : '#dc2626'}">${fits ? '✓ fits' : '✗ too heavy'}</div></div>`;
            }).join('')}
          </div>
          <div class="card">
            <h3>💰 Budget plan</h3>
            <div class="small">Satellite $${chk.totals.cost}M + Rocket $${ROCKETS.find(r => r.id === G.rocketId).cost}M = <b>$${chk.buildCost}M</b> of $${chk.budget}M</div>
            <div class="small">Left for operations: <b>$${Math.max(0, chk.opsMoney)}M</b> → ${chk.opsOrbits} orbits (mission needs ${m.orbits})</div>
            ${warningsHtml(chk.warnings.filter(w => w.level !== 'tip'))}
          </div>
          <button class="btn green" id="go" ${chk.ok ? '' : 'disabled'}>🔥 LAUNCH!</button>
        </div>
      </div>
    `);
    $('#back').onclick = () => { cancelAnimationFrame(raf); build(); };
    $('#alt').oninput = e => { G.alt = +e.target.value; cancelAnimationFrame(raf); draw(); };
    $$('[data-r]').forEach(el => el.onclick = () => { G.rocketId = el.dataset.r; cancelAnimationFrame(raf); draw(); });
    $('#go').onclick = () => { cancelAnimationFrame(raf); countdown(); };
    animateOrbit(oi);
  };

  const animateOrbit = (oi) => {
    const cv = $('#orbitCanvas');
    const ctx = cv.getContext('2d');
    const cx = 290, cy = 210, R = 90;
    const orbitR = R + 20 + 90 * (G.alt - m.altMin) / (m.altMax - m.altMin);
    const t0 = performance.now();
    const frame = (now) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      // Sun
      const g = ctx.createRadialGradient(640, 210, 10, 640, 210, 160);
      g.addColorStop(0, 'rgba(253,224,71,.9)'); g.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = g; ctx.fillRect(480, 0, 160, 420);
      ctx.fillStyle = '#fde047'; ctx.font = '28px sans-serif'; ctx.fillText('☀️', 590, 220);
      // Shadow behind the planet
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, cy - R, cx, R * 2);
      // Planet
      ctx.fillStyle = planet.color; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = planet.land; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 1.7) * R * .5, cy + Math.sin(i * 2.1) * R * .5, R * .22, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5); ctx.fill();
      // Orbit
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(cx, cy, orbitR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // Satellite + view cone
      const a = -t * 0.8;
      const sx = cx + Math.cos(a) * orbitR, sy = cy + Math.sin(a) * orbitR;
      ctx.fillStyle = 'rgba(250,204,21,.35)'; ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(cx + Math.cos(a - oi.viewHalf) * R, cy + Math.sin(a - oi.viewHalf) * R);
      ctx.lineTo(cx + Math.cos(a + oi.viewHalf) * R, cy + Math.sin(a + oi.viewHalf) * R); ctx.closePath(); ctx.fill();
      ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛰️', sx, sy);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${planet.name}`, 12, 24);
      ctx.fillText('🌑 shadow side', 12, cy + 4);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
  draw();
}

function countdown() {
  const box = document.createElement('div');
  box.className = 'countdown';
  document.body.appendChild(box);
  let n = 3;
  const tick = () => {
    box.textContent = n > 0 ? n : '🚀';
    if (n < 0) { box.remove(); fly(); return; }
    n--; setTimeout(tick, 600);
  };
  tick();
}

// ---------- 6. Fly the mission ----------

function fly() {
  G.config = { missionId: G.missionId, partIds: [...G.partIds], alt: G.alt, rocketId: G.rocketId, difficultyId: G.difficultyId, seed: G.seed };
  startOps(document.getElementById('app'), G.config, G.players, (result, team) => {
    G.result = result; G.team = team;
    report();
  });
}

// ---------- 7. Report ----------

function scoreOf(result, promise) {
  const met = result.sentTargets >= promise;
  const bonus = met ? promise * 50 : -promise * 25;
  return { met, bonus, total: Math.max(0, result.sentTargets * 100 + result.science + result.budgetLeft * 2 + bonus) };
}

function report() {
  const m = missionById(G.missionId);
  const r = G.result;
  const g = grade(r);
  const s = scoreOf(r, G.promise);
  const why = explain(r, G.config);
  const wi = whatIf(G.config);
  const code = makeChallengeCode(G.config);

  // Save to the Majlis
  const all = store(MAJLIS_KEY) || [];
  all.push({ name: G.name, missionId: m.id, difficultyId: G.difficultyId, players: G.players, score: s.total,
    sent: r.sentTargets, count: r.targetCount, science: r.science, code, date: new Date().toISOString().slice(0, 10) });
  store(MAJLIS_KEY, all);

  const team = G.team;
  render(`
    <div class="center">
      <div class="screen-sub">${m.emoji} ${m.name} · mission report</div>
      <div class="grade" style="color:${g.color}">${g.label}</div>
      <div class="stars-big">${'⭐'.repeat(g.stars)}${'☆'.repeat(3 - g.stars)}</div>
      <div style="font-size:22px;font-weight:800">Score: ${s.total}</div>
    </div>

    <div class="grid g4 mt">
      ${statCard('s-target', 'Delivered to Earth', `${r.sentTargets} / ${r.targetCount}`)}
      ${statCard(s.met ? 's-money' : 's-fuel', 'Your requirement', `${s.met ? '✓ met' : '✗ missed'} (${G.promise})`)}
      ${statCard('s-science', 'Science', r.science)}
      ${statCard('s-money', 'Money left', `$${r.budgetLeft}M`)}
    </div>

    <div class="grid g2 mt">
      <div class="card">
        <h3>🧠 Why did this happen?</h3>
        <ul class="why">${why.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>
      <div class="side-stack">
        <div class="card whatif">
          <h3>🔮 What if?</h3>
          ${wi.best ? `<div>We replayed your mission with an autopilot. With <b>${wi.best.label}</b>, the autopilot delivered <b>${wi.best.result.sentTargets}/${r.targetCount}</b> and <b>${wi.best.result.science}</b> science, instead of <b>${wi.base.sentTargets}/${r.targetCount}</b> and <b>${wi.base.science}</b>.</div>`
            : `<div>The autopilot could not find a single change that helps: your design is very strong! Now try a bigger promise or a harder difficulty.</div>`}
        </div>
        <div class="card nasa"><h3>🚀 Real NASA missions</h3><div>${m.nasa}</div></div>
        ${team ? `<div class="card"><h3>👥 Team play</h3><div class="small">${team.map(x => `${x.emoji} <b>${x.name}</b> (Player ${x.player}): ${x.count} ${x.unit}`).join('<br>')}</div></div>` : ''}
      </div>
    </div>

    <div class="card dark mt"><b>🎯 Challenge another team:</b> give them this code. They will fly the same mission with the same events: <code style="font-size:18px">${code}</code></div>

    <div class="row mt2" style="justify-content:center">
      <button class="btn" id="redesign">🛠️ Change design and fly again</button>
      <button class="btn secondary" id="again">🔁 Same design, new mission</button>
      <button class="btn secondary" id="majlis">🏆 Majlis</button>
      <button class="btn secondary" id="home">🏠 Home</button>
    </div>
  `);
  $('#redesign').onclick = build;
  $('#again').onclick = () => { if (!G.challenge) G.seed = newSeed(); countdown(); };
  $('#majlis').onclick = () => majlis(m.id);
  $('#home').onclick = home;
}

// ---------- 8. Majlis (leaderboard) ----------

function majlis(missionId) {
  const all = (store(MAJLIS_KEY) || []).filter(e => e.missionId === missionId).sort((a, b) => b.score - a.score).slice(0, 10);
  render(`
    <div class="row spread"><div><div class="screen-title">🏆 Majlis</div><div class="screen-sub">The best mission teams</div></div>
      <button class="btn secondary small" id="back">← Home</button></div>
    <div class="row mt">${MISSIONS.map(m => `<button class="toggle ${m.id === missionId ? 'on' : ''}" data-m="${m.id}">${m.emoji} ${m.name}</button>`).join('')}</div>
    <div class="card mt">
      ${all.length ? `<table><tr><th>#</th><th>Name</th><th>Score</th><th>Delivered</th><th>Science</th><th>Players</th><th>Level</th><th>Challenge code</th></tr>
        ${all.map((e, i) => `<tr><td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td><td><b>${e.name}</b></td><td>${e.score}</td><td>${e.sent}/${e.count}</td><td>${e.science}</td><td>${e.players}</td><td>${e.difficultyId}</td><td><code>${e.code}</code></td></tr>`).join('')}</table>`
        : '<div class="center small">No missions yet. Be the first!</div>'}
    </div>
  `);
  $('#back').onclick = home;
  $$('[data-m]').forEach(b => b.onclick = () => majlis(b.dataset.m));
}

home();
