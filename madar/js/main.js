// MADAR: screens and game flow.
import { MISSIONS, PARTS, ROCKETS, DIFFICULTIES, PLANETS, ROLES, ROLE_PLAYERS, OPS_COST_PER_ORBIT, POEM } from './data.js';
import {
  missionById, partById, difficultyById, designTotals, checkDesign, orbitInfo, formatPeriod,
  rocketCapacity, grade, explain, whatIf, makeChallengeCode, readChallengeCode,
  orbitTypeById, orbitTypesFor, councilDemands,
} from './sim.js';
import { render, toast, store, statCard, warningsHtml, modal, $, $$ } from './ui.js';
import { startOps } from './ops.js';
import { playOud, fadeOud } from './oud.js';

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
  orbitType: 'polar',
  votes: {},
  council: null,
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
         ['🚀', 'Orbit and team vote', 'Pick an orbit type and a rocket. Then every role votes: accept or deny?'],
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
    if (G.missionId !== c.dataset.m) { G.partIds = []; G.rocketId = null; G.orbitType = 'polar'; }
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
          <div class="mt" style="font-size:20px">"Our satellite will deliver <b style="font-size:30px" id="promiseNum">${G.promise}</b> of ${m.targetCount} ${m.targetEmoji} ${m.targetType === 'disaster' ? 'alerts' : 'scans'} to Earth."</div>
          <input type="range" id="promise" min="${min}" max="${m.targetCount}" value="${G.promise}" class="mt" />
          <div class="small mt">A bigger promise gives more points if you make it, but you lose points if you fall short. Choose a goal your team can really reach.</div>
          <div class="mt">Points if met: <b style="color:#16a34a" id="ptsMet">+${G.promise * 50}</b> · if missed: <b style="color:#dc2626" id="ptsMiss">−${G.promise * 25}</b></div>
        </div>
        <div class="card">
          <h3>📋 Mission constraints</h3>
          <div class="grid g2 mt">
            ${statCard('s-money', 'Total budget', `$${budget}M`)}
            ${statCard('s-science', 'Mission lifetime', `${m.orbits} orbits`)}
            ${statCard('s-power', 'Sunlight', `${Math.round(PLANETS[m.planet].sunlight * 100)}%`)}
            ${statCard('s-data', 'Ground stations', `${m.stations}`)}
            ${statCard('s-mass', 'Build deadline', `${m.devLimit} months`)}
            ${statCard('s-fuel', 'Late penalty', m.launchWindow ? 'Miss launch window!' : '$3M / month')}
          </div>
          <div class="small mt">💰 The budget pays for the satellite, the rocket, AND $${OPS_COST_PER_ORBIT}M for every orbit you operate it. Spend it all on building and the mission ends early!</div>
          <div class="small mt">⭐ Most critical here: ${m.critical.map(c => `<span class="chip">${c}</span>`).join('')}</div>
        </div>
      </div>
      <div class="row mt2" style="justify-content:flex-end"><button class="btn" id="next">🛠️ Build the satellite →</button></div>
    `);
    $('#back').onclick = missions;
    $('#promise').oninput = e => {
      G.promise = +e.target.value;
      $('#promiseNum').textContent = G.promise;
      $('#ptsMet').textContent = `+${G.promise * 50}`;
      $('#ptsMiss').textContent = `−${G.promise * 25}`;
    };
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
    const chk = checkDesign({ mission: m, partIds: G.partIds, rocketId: null, alt: G.alt || m.altStart, difficultyId: G.difficultyId, orbitType: G.orbitType });
    const t = chk.totals;
    const sunPower = Math.round((t.solar * planet.sunlight + t.rtg) * 10) / 10;
    const groups = [...new Set(available.map(p => p.group))];
    const n = G.partIds.length;
    const keepList = document.querySelector('.parts-col') ? document.querySelector('.parts-col').scrollTop : 0;
    const keepPage = window.scrollY;
    const counts = {};
    G.partIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
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
              <div><div class="n">${p.name} <span class="chip">$${p.cost}M</span><span class="chip">${p.mass} kg</span><span class="chip">⏱ ${p.dev} mo</span></div>
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
          <div class="card mt">
            <h3>📦 Equipment list</h3>
            <table class="eq">
              <tr><th>Part</th><th>Mass</th><th>Cost</th><th>Build time</th></tr>
              <tr><td>🛰️ Core (frame, computer, small battery)</td><td>30 kg</td><td>$20M</td><td>6 mo</td></tr>
              ${Object.entries(counts).map(([id, c]) => { const p = partById(id); return `<tr><td>${p.emoji} ${p.name}${c > 1 ? ` × ${c}` : ''}</td><td>${p.mass * c} kg</td><td>$${p.cost * c}M</td><td>${p.dev * c} mo</td></tr>`; }).join('')}
              <tr class="total"><td>Total</td><td>${t.mass} kg</td><td>$${t.cost}M</td><td>${t.devMonths} mo</td></tr>
            </table>
          </div>
        </div>

        <div class="side-stack">
          ${statCard('s-money', 'Satellite cost', `$${t.cost}M of $${chk.budget}M`, t.cost / chk.budget)}
          <div class="grid g2">${statCard('s-mass', 'Mass', `${t.mass} kg`)}
          ${statCard(chk.lateMonths ? 's-fuel alarm' : 's-science', 'Build time', `${t.devMonths} / ${m.devLimit} mo`, Math.min(1, t.devMonths / m.devLimit))}</div>
          ${statCard('s-power', `Power in sun (${Math.round(planet.sunlight * 100)}% sunlight)`, `+${sunPower}/s`)}
          ${statCard('s-power', 'Power in shadow', `+${t.rtg}/s ${t.rtg ? '' : '(battery only!)'}`)}
          ${statCard('s-power', 'Battery', `${t.battery}`)}
          ${statCard('s-data', 'Memory · Send speed', `${t.memory} · ${t.downlink}/s`)}
          ${statCard('s-fuel', 'Debris dodges · Shield', `${t.fuel} · ${t.armor ? 'yes' : 'no'}`)}
          <button class="btn green" id="next" ${chk.warnings.some(w => w.level === 'stop') ? 'disabled' : ''}>🚀 Choose orbit →</button>
        </div>
      </div>
    `);
    $('.parts-col').scrollTop = keepList;
    window.scrollTo(0, keepPage);
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
  if (!orbitTypesFor(m.planet).some(o => o.id === G.orbitType)) G.orbitType = 'polar';
  let raf = null;
  const step = m.planet === 'jupiter' ? 1000 : 10;
  const stop = () => cancelAnimationFrame(raf);

  // The right side (numbers, rockets, budget) is redrawn on every change. The slider is never redrawn, so it drags smoothly.
  const sideHtml = () => {
    const chk = checkDesign({ mission: m, partIds: G.partIds, rocketId: G.rocketId, alt: G.alt, difficultyId: G.difficultyId, orbitType: G.orbitType });
    const oi = orbitInfo(m.planet, G.alt, m, G.orbitType);
    return `
      <div class="grid g2">
        ${statCard('s-science', 'One orbit takes (real)', formatPeriod(oi.periodSec))}
        ${statCard('s-power', 'Time in shadow', `${Math.round(oi.eclipse * 100)}%`)}
        ${statCard('s-target', 'Picture sharpness', `${Math.round(oi.quality * 100)}%`)}
        ${statCard('s-data', 'View width', `${oi.swathKm.toLocaleString()} km`)}
        ${statCard(oi.decayOrbits < Infinity ? 's-fuel alarm' : 's-money', 'Orbit lifetime', oi.decayOrbits < Infinity ? `Falls after ${oi.decayOrbits} orbits!` : 'Stable')}
        ${m.planet === 'jupiter' ? statCard(oi.radiation > 0.3 ? 's-fuel alarm' : 's-money', 'Radiation', `${Math.round(oi.radiation * 100)}%`) : statCard('s-mass', 'Satellite mass', `${chk.totals.mass} kg`)}
      </div>
      <div class="grid g3">
        ${ROCKETS.map(r => {
          const cap = rocketCapacity(r, m, G.alt, G.orbitType);
          const fits = chk.totals.mass <= cap;
          return `<div class="card pick ${G.rocketId === r.id ? 'selected' : ''}" data-r="${r.id}" style="padding:12px">
            <div class="big-emoji" style="font-size:34px">${r.emoji}</div><b>${r.name}</b>
            <div class="small">$${r.cost}M</div><div class="small">Carries ${cap} kg</div>
            <div style="font-weight:800;color:${fits ? '#16a34a' : '#dc2626'}">${fits ? '✓ fits' : '✗ too heavy'}</div></div>`;
        }).join('')}
      </div>
      <div class="card">
        <h3>💰 Budget plan</h3>
        <div class="small">Satellite $${chk.totals.cost}M + Rocket $${ROCKETS.find(r => r.id === G.rocketId).cost}M${chk.lateCost ? ` + Late $${chk.lateCost}M` : ''} = <b>$${chk.buildCost}M</b> of $${chk.budget}M</div>
        <div class="small">Left for operations: <b>$${Math.max(0, chk.opsMoney)}M</b> → ${chk.opsOrbits} orbits (mission needs ${m.orbits})</div>
        ${warningsHtml(chk.warnings.filter(w => w.level !== 'tip'))}
      </div>
      <button class="btn green" id="go" ${chk.ok ? '' : 'disabled'}>${G.players === 1 ? '📋 Launch review →' : '👥 Team vote: accept or deny →'}</button>`;
  };
  const refreshSide = () => {
    $('#launchSide').innerHTML = sideHtml();
    $('#altLabel').textContent = `${G.alt.toLocaleString()} km`;
    $$('[data-r]').forEach(el => el.onclick = () => { G.rocketId = el.dataset.r; refreshSide(); });
    $('#go').onclick = () => { stop(); G.votes = {}; council(); };
  };

  render(`
    <div class="row spread"><div><div class="screen-title">🚀 Orbit and launch</div>
      <div class="screen-sub">Drag the slider to move your orbit. Higher sees more, but sharper pictures need lower orbits.</div></div>
      <button class="btn secondary small" id="back">← Build</button></div>

    <div class="grid mt" style="grid-template-columns: 1.2fr 1fr">
      <div class="card dark">
        <canvas id="orbitCanvas" width="640" height="420"></canvas>
        <div class="row spread mt"><b>Altitude: <span style="font-size:24px" id="altLabel">${G.alt.toLocaleString()} km</span></b><span class="small">${m.altMin.toLocaleString()} – ${m.altMax.toLocaleString()} km</span></div>
        <input type="range" id="alt" min="${m.altMin}" max="${m.altMax}" step="${step}" value="${G.alt}" />
        <h3 class="mt">🧭 Orbit type</h3>
        <div class="grid g3 mt">${orbitTypesFor(m.planet).map(o => `
          <div class="card pick ${G.orbitType === o.id ? 'selected' : ''}" data-ot="${o.id}" style="padding:12px">
            <div style="font-size:26px">${o.emoji}</div><b>${o.name}</b>
            <div class="small">${o.short}</div>
            <div class="small mt" style="color:#16a34a">👍 ${o.good}</div>
            <div class="small mt" style="color:#dc2626">👎 ${o.bad}</div>
          </div>`).join('')}</div>
      </div>
      <div class="side-stack" id="launchSide"></div>
    </div>
  `);
  $('#back').onclick = () => { stop(); build(); };
  $('#alt').oninput = e => { G.alt = +e.target.value; refreshSide(); };
  $$('[data-ot]').forEach(el => el.onclick = () => {
    G.orbitType = el.dataset.ot;
    $$('[data-ot]').forEach(x => x.classList.toggle('selected', x.dataset.ot === G.orbitType));
    refreshSide();
  });
  refreshSide();

  // The orbit picture reads the current altitude and orbit type on every frame.
  const cv = $('#orbitCanvas');
  const ctx = cv.getContext('2d');
  const cx = 290, cy = 210, R = 90;
  const t0 = performance.now();
  const frame = (now) => {
    if (!document.body.contains(cv)) return;
    const oi = orbitInfo(m.planet, G.alt, m, G.orbitType);
    const orbitR = R + 20 + 90 * (G.alt - m.altMin) / (m.altMax - m.altMin);
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const g = ctx.createRadialGradient(640, 210, 10, 640, 210, 160);
    g.addColorStop(0, 'rgba(253,224,71,.9)'); g.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = g; ctx.fillRect(480, 0, 160, 420);
    ctx.fillStyle = '#fde047'; ctx.font = '28px sans-serif'; ctx.fillText('☀️', 590, 220);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, cy - R, cx, R * 2);
    ctx.fillStyle = planet.color; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = planet.land; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 1.7) * R * .5, cy + Math.sin(i * 2.1) * R * .5, R * .22, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(cx, cy, orbitR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const a = -t * 0.8;
    const sx = cx + Math.cos(a) * orbitR, sy = cy + Math.sin(a) * orbitR;
    ctx.fillStyle = 'rgba(250,204,21,.35)'; ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(cx + Math.cos(a - oi.viewHalf) * R, cy + Math.sin(a - oi.viewHalf) * R);
    ctx.lineTo(cx + Math.cos(a + oi.viewHalf) * R, cy + Math.sin(a + oi.viewHalf) * R); ctx.closePath(); ctx.fill();
    ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛰️', sx, sy);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${planet.name} · ${orbitTypeById(G.orbitType).name} orbit`, 12, 24);
    ctx.fillText('🌑 shadow side', 12, cy + 4);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

// ---------- 5b. Team council: accept or deny the launch ----------
// Each role checks one part of the design. The team talks, then votes. Real missions do this
// in a "Flight Readiness Review" before every launch.

function currentConfig() {
  return { missionId: G.missionId, partIds: [...G.partIds], alt: G.alt, rocketId: G.rocketId, difficultyId: G.difficultyId, seed: G.seed, orbitType: G.orbitType };
}

function council() {
  const who = ROLE_PLAYERS[G.players] || ROLE_PLAYERS[1];
  const demands = councilDemands(currentConfig());
  const met = demands.filter(d => d.met).length;
  const solo = G.players === 1; // one player: no vote, just the checklist
  const draw = () => {
    const accepts = ROLES.filter(r => G.votes[r.id] === 'go').length;
    const voted = ROLES.filter(r => G.votes[r.id]).length;
    render(`
      <div class="row spread"><div><div class="screen-title">${solo ? '📋 Launch review: is your satellite ready?' : '👥 Team council: accept or deny the launch?'}</div>
        <div class="screen-sub">${solo ? 'Before a real launch, each team leader checks one part of the spacecraft. Here is what each of them thinks.' : 'Before a real launch, every team leader must say if the spacecraft is ready. Now it is your turn.'}</div></div>
        <div class="row"><button class="btn secondary small" id="toBuild">← Change design</button><button class="btn secondary small" id="toLaunch">← Change orbit</button></div></div>

      ${solo ? `<div class="card mt">
        <h3>❓ What is this?</h3>
        <div class="small">Each role checks one thing. 😊 <b>Happy</b> = it is done, and you get <b>+30 points</b>. 😟 <b>Worried</b> = something is missing, and the card tells you the risk. You can go back and fix it, or launch anyway.</div>
      </div>` : `<div class="card mt">
        <h3>❓ How does the vote work?</h3>
        <div class="grid g3 mt">
          <div><b>1. Each role checks one thing.</b><div class="small">Read the card: it says what this role needs and what goes wrong without it.</div></div>
          <div><b>2. ✅ Accept or ✋ Deny.</b><div class="small">Accept = "I am OK to launch like this." Deny = "Something important is missing, let's change the design first."</div></div>
          <div><b>3. 3 Accepts = launch.</b><div class="small">Every 😊 happy role adds <b>+30 points</b> to your score. A 😟 worried role means a risk in the mission.</div></div>
        </div>
      </div>`}

      <div class="grid g4 mt">
        ${demands.map(d => {
          const r = ROLES.find(x => x.id === d.role);
          const v = G.votes[r.id];
          return `<div class="card" style="border:4px solid ${d.met ? '#22c55e' : '#f59e0b'}">
            <div class="row spread"><div class="big-emoji" style="font-size:38px">${r.emoji}</div><span class="badge ${d.met ? 'b-easy' : 'b-hard'}">${d.met ? '😊 happy' : '😟 worried'}</span></div>
            <h3 class="mt">${r.name}${G.players > 1 ? ` · Player ${who[r.id]}` : ''}</h3>
            <div class="mt">${d.wants}</div>
            <div class="small mt">${d.met ? `✅ Done. ${d.why}` : `⚠️ ${d.risk}`}</div>
            ${solo ? '' : `<div class="row mt">
              <button class="toggle vote-go ${v === 'go' ? 'on' : ''}" data-vote="${r.id}:go">✅ Accept</button>
              <button class="toggle vote-nogo ${v === 'nogo' ? 'on' : ''}" data-vote="${r.id}:nogo">✋ Deny</button>
            </div>`}
          </div>`;
        }).join('')}
      </div>

      <div class="grid ${solo ? 'g2' : 'g3'} mt">
        ${statCard('s-science', 'Happy roles', `${met} / 4  (+${met * 30} points)`, met / 4)}
        ${solo ? statCard('s-target', 'Worried roles', `${4 - met}`) : `${statCard('s-money', 'Accept votes', `${accepts} / 4 (need 3)`, accepts / 4)}
        ${statCard('s-target', 'Votes cast', `${voted} / 4`, voted / 4)}`}
      </div>
      <div class="small mt">💡 ${met < 4 ? (solo ? 'Worried roles? Press "Change design" to fix them, or launch and take the risk.' : 'Worried roles? Press "Change design" and try to make them happy without going over budget. Or accept the risk as a team.') : 'Everyone is happy. Great teamwork!'}</div>
      <div class="row mt2" style="justify-content:flex-end"><button class="btn green" id="launch" ${solo || accepts >= 3 ? '' : 'disabled'}>🔥 LAUNCH!</button></div>
    `);
    $('#toBuild').onclick = build;
    $('#toLaunch').onclick = launch;
    $$('[data-vote]').forEach(b => b.onclick = () => { const [role, v] = b.dataset.vote.split(':'); G.votes[role] = v; draw(); });
    $('#launch').onclick = () => {
      G.council = { met, goVotes: accepts, demands: demands.map(d => ({ role: d.role, met: d.met })) };
      briefing();
    };
  };
  draw();
}

// ---------- 5c. Briefing: how to fly and how to win ----------

function briefing() {
  const m = missionById(G.missionId);
  const who = ROLE_PLAYERS[G.players] || ROLE_PLAYERS[1];
  const when = {
    scientist: `When a ${m.targetEmoji} target is under the satellite (the cone turns green).`,
    comms: 'Hold it when the satellite is near a 📡 ground station.',
    engineer: 'When a ☀️ solar flare comes. Press again after it passes.',
    pilot: 'When ☄️ "DEBRIS! PRESS W" appears. You have 3 seconds.',
  };
  render(`
    <div class="center"><div class="screen-title">🎮 Mission briefing</div>
      <div class="screen-sub">${m.emoji} ${m.name} · Goal: deliver at least <b>${G.promise}</b> of ${m.targetCount} targets to Earth</div></div>

    <div class="grid g4 mt">
      ${ROLES.map(r => `<div class="card center">
        <div class="big-emoji">${r.emoji}</div>
        <div class="key">${r.key}</div>
        <h3 class="mt">${r.name}${G.players > 1 ? ` · Player ${who[r.id]}` : ''}</h3>
        <div class="small mt"><b>${r.job}.</b></div>
        <div class="small mt">${when[r.id]}</div>
      </div>`).join('')}
    </div>

    <div class="card mt">
      <h3>🏆 How to succeed</h3>
      <div class="grid g2 mt">
        <div>📸 <b>Picture → 📡 send.</b> A picture only counts when it reaches Earth (📦 becomes ✅).</div>
        <div>🌑 <b>Watch the shadow.</b> Solar panels make no power on the dark side. Don't waste pictures there.</div>
        <div>💾 <b>Watch the memory.</b> Send data often. When memory is full, new pictures are lost.</div>
        <div>⚡ <b>Flashing button = press it now!</b> Talk to your team: "Target! Station! Debris!"</div>
      </div>
      <div class="small mt">☠️ Hackers may send a fake command during the mission. Only an 🔐 Encryption Module can block it. · The mission lasts ${m.orbits} orbits (about ${m.orbits * 20} seconds). Press P to pause.</div>
    </div>

    <div class="row mt2" style="justify-content:center"><button class="btn green" id="start">🚀 Start the mission</button></div>
  `);
  $('#start').onclick = countdown;
}

function countdown() {
  playOud(); // the oud starts with the launch
  const box = document.createElement('div');
  box.className = 'countdown';
  document.body.appendChild(box);
  let n = 3;
  const tick = () => {
    box.textContent = n > 0 ? n : '🚀';
    if (n < 0) { box.remove(); poemPage(fly); return; }
    n--; setTimeout(tick, 600);
  };
  tick();
}

// ---------- 5d. The poem: a quiet moment between the countdown and the mission ----------

function poemPage(next) {
  if (!POEM.lines.length) { next(); return; }
  const step = 1.4;
  const box = document.createElement('div');
  box.className = 'poem';
  box.innerHTML = POEM.lines.map((l, i) => Array.isArray(l)
      ? `<div class="verse pair" style="animation-delay:${0.5 + i * step}s"><span>${l[0]}</span><span>${l[1]}</span></div>`
      : `<div class="verse" style="animation-delay:${0.5 + i * step}s">${l}</div>`).join('')
    + (POEM.translation ? `<div class="trans" style="animation-delay:${0.5 + POEM.lines.length * step}s">${POEM.translation}</div>` : '')
    + (POEM.poet ? `<div class="poet" style="animation-delay:${1.2 + POEM.lines.length * step}s">${POEM.poet}</div>` : '')
    + `<div class="hint" style="animation-delay:${2 + POEM.lines.length * step}s">اضغط أي زر للانطلاق · Press any key to start the mission</div>`;
  document.body.appendChild(box);
  let done = false;
  const onKey = e => { e.preventDefault(); go(); };
  const go = () => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey);
    box.classList.add('out');
    setTimeout(() => { box.remove(); next(); }, 600);
  };
  setTimeout(() => { box.addEventListener('click', go); window.addEventListener('keydown', onKey); }, 900);
  setTimeout(go, Math.max(9000, 3000 + POEM.lines.length * 2800));
}

// ---------- 6. Fly the mission ----------

function fly() {
  setTimeout(() => fadeOud(2.5), 4000); // let the phrase end, then fade it out
  G.config = currentConfig();
  startOps(document.getElementById('app'), G.config, G.players, (result, team) => {
    G.result = result; G.team = team;
    report();
  });
}

// ---------- 7. Report ----------

function scoreOf(result, promise, council) {
  const met = result.sentTargets >= promise;
  const bonus = met ? promise * 50 : -promise * 25;
  const teamBonus = council ? council.met * 30 : 0;
  return { met, bonus, teamBonus, total: Math.max(0, result.sentTargets * 100 + result.science + result.budgetLeft * 2 + bonus + teamBonus) };
}

function report() {
  const m = missionById(G.missionId);
  const r = G.result;
  const g = grade(r);
  const s = scoreOf(r, G.promise, G.council);
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
    <div class="card dark mt small">🧮 <b>Score:</b> ${r.sentTargets} delivered × 100 + ${r.science} science + $${r.budgetLeft}M left × 2 ${s.bonus >= 0 ? '+' : '−'} ${Math.abs(s.bonus)} requirement + ${s.teamBonus} team council (${G.council ? G.council.met : 0}/4 roles happy) = <b>${s.total}</b></div>

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
