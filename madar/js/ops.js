// MADAR: the live mission. The satellite circles the planet and the team runs it.
import { ROLES, LESSONS, PLANETS } from './data.js';
import { createMission, step, hud, summarize, partById, ORBIT_SECONDS } from './sim.js';
import { statCard, toast, $ } from './ui.js';

// Which player does which job, for 1 to 4 players
const ROLE_PLAYERS = {
  1: { scientist: 1, comms: 1, engineer: 1, pilot: 1 },
  2: { scientist: 1, pilot: 1, comms: 2, engineer: 2 },
  3: { scientist: 1, comms: 2, engineer: 3, pilot: 3 },
  4: { scientist: 1, comms: 2, engineer: 3, pilot: 4 },
};

export function startOps(root, config, players, onEnd) {
  const s = createMission(config);
  const m = s.mission;
  const planet = PLANETS[m.planet];
  const who = ROLE_PLAYERS[players] || ROLE_PLAYERS[1];
  const teamCount = { scientist: 0, comms: 0, engineer: 0, pilot: 0 };
  const keys = { capture: false, send: false, togglePower: false, dodge: false };
  let paused = false;
  let lastLesson = 'Fly the mission! Take pictures of targets 🎯 and send them home over a ground station 📡.';

  root.innerHTML = `
    <div class="row spread">
      <div><div class="screen-title">${m.emoji} ${m.name}</div><div class="screen-sub" id="orbitText"></div></div>
      <div class="row"><button class="btn secondary small" id="pause">⏸ Pause (P)</button></div>
    </div>
    <div class="grid mt" id="hud" style="grid-template-columns: repeat(6, 1fr)"></div>
    <div class="ops-wrap mt">
      <div class="card dark" style="padding:8px"><canvas id="ops" width="1660" height="1000"></canvas></div>
      <div class="side-stack">
        <div class="lesson" id="lesson"></div>
        <div class="card dark"><h3>👥 ${players === 1 ? 'Your jobs' : 'Team roles'}</h3>
          <div class="small">${ROLES.map(r => `${r.emoji} <b>${r.name}</b> ${players > 1 ? `· Player ${who[r.id]}` : ''}<br><span style="opacity:.8">[${r.key}] ${r.job}</span>`).join('<br>')}</div>
          ${players > 1 ? '<div class="small mt">⚡ The power is shared! Talk before you use it.</div>' : ''}
        </div>
        <div class="card dark small" id="parts"></div>
      </div>
    </div>
    <div class="controls mt">
      <button class="ctrl c-cap" id="b-cap">📸 Picture<span class="k">SPACE</span>${players > 1 ? `<span class="who">Player ${who.scientist}</span>` : ''}</button>
      <button class="ctrl c-send" id="b-send">📡 Send data (hold)<span class="k">D</span>${players > 1 ? `<span class="who">Player ${who.comms}</span>` : ''}</button>
      <button class="ctrl c-pow" id="b-pow">🔋 Power save<span class="k">E</span>${players > 1 ? `<span class="who">Player ${who.engineer}</span>` : ''}</button>
      <button class="ctrl c-dodge" id="b-dodge">🧭 Dodge<span class="k">W</span>${players > 1 ? `<span class="who">Player ${who.pilot}</span>` : ''}</button>
    </div>
  `;

  // ----- Input -----
  const onDown = e => {
    if (e.repeat && e.code !== 'KeyD') return;
    if (e.code === 'Space') { keys.capture = true; e.preventDefault(); }
    if (e.code === 'KeyD') keys.send = true;
    if (e.code === 'KeyE') keys.togglePower = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.dodge = true;
    if (e.code === 'KeyP') togglePause();
  };
  const onUp = e => { if (e.code === 'KeyD') keys.send = false; };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  const hold = (el, down, up) => {
    el.addEventListener('mousedown', down); el.addEventListener('touchstart', e => { e.preventDefault(); down(); });
    if (up) { el.addEventListener('mouseup', up); el.addEventListener('mouseleave', up); el.addEventListener('touchend', up); }
  };
  hold($('#b-cap'), () => { keys.capture = true; });
  hold($('#b-send'), () => { keys.send = true; }, () => { keys.send = false; });
  hold($('#b-pow'), () => { keys.togglePower = true; });
  hold($('#b-dodge'), () => { keys.dodge = true; });
  const togglePause = () => { paused = !paused; $('#pause').textContent = paused ? '▶ Resume (P)' : '⏸ Pause (P)'; };
  $('#pause').onclick = togglePause;

  // ----- Drawing -----
  const cv = $('#ops');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const cx = W * 0.42, cy = H * 0.5, R = 250;
  const orbitR = R + 70 + 130 * (s.alt - m.altMin) / (m.altMax - m.altMin);
  const pos = (angle, r) => [cx + Math.cos(angle) * r, cy - Math.sin(angle) * r]; // angle 0 = right, counter-clockwise
  const emoji = (txt, x, y, size) => { ctx.font = `${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); };

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Sun on the right
    const sun = ctx.createRadialGradient(W, cy, 20, W, cy, 420);
    sun.addColorStop(0, `rgba(253,224,71,${s.flare ? 1 : .85})`); sun.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = sun; ctx.fillRect(W - 420, 0, 420, H);
    emoji('☀️', W - 70, cy, 80);
    // Shadow band on the left
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, cy - R, cx, R * 2);
    // Planet (turning)
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = planet.color; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
    ctx.rotate(-s.planetAngle);
    ctx.fillStyle = planet.land;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(Math.cos(i * 2.3) * R * .6, Math.sin(i * 1.9) * R * .6, R * .28, R * .16, i, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.restore();

    // Ground stations
    for (const st of s.stations) {
      const a = st.lon + s.planetAngle;
      const [x, y] = pos(a, R + 4);
      emoji('📡', x, y, 40);
    }
    // Targets
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 150);
    for (const tg of s.targets) {
      if (tg.state === 'waiting') continue;
      const a = tg.lon + s.planetAngle;
      const [x, y] = pos(a, R - 10);
      const icon = tg.kind === 'fire' ? '🔥' : tg.kind === 'flood' ? '🌊' : m.targetEmoji;
      if (tg.state === 'visible') { emoji(icon, x, y, 46 * pulse); }
      if (tg.state === 'captured') { emoji(icon, x, y, 36); emoji('📦', x + 26, y - 26, 26); }
      if (tg.state === 'sent') { ctx.globalAlpha = .55; emoji(icon, x, y, 32); ctx.globalAlpha = 1; emoji('✅', x + 24, y - 24, 26); }
      if (tg.state === 'missed') { ctx.globalAlpha = .35; emoji(icon, x, y, 30); ctx.globalAlpha = 1; emoji('❌', x + 22, y - 22, 22); }
    }
    // Orbit ring
    ctx.setLineDash([12, 12]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(cx, cy, orbitR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    // View cone
    const [sx, sy] = pos(s.satAngle, orbitR);
    const [ax, ay] = pos(s.satAngle - s.orbit.viewHalf, R);
    const [bx, by] = pos(s.satAngle + s.orbit.viewHalf, R);
    ctx.fillStyle = s.targetInView ? 'rgba(74,222,128,.45)' : 'rgba(250,204,21,.25)';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
    // Data beam to a station
    if (s.sending) {
      const st = s.stations.find(x => Math.abs(Math.atan2(Math.sin(s.satAngle - (x.lon + s.planetAngle)), Math.cos(s.satAngle - (x.lon + s.planetAngle)))) < s.orbit.stationHalf);
      if (st) { const [tx, ty] = pos(st.lon + s.planetAngle, R); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 6; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -performance.now() / 20; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
    }
    // Debris
    if (s.debris) {
      const left = s.debris.until - s.time;
      const [dx, dy] = pos(s.satAngle + 0.1 + left * 0.15, orbitR);
      emoji('☄️', dx, dy, 60);
      ctx.fillStyle = '#fb923c'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
      if (Math.floor(performance.now() / 200) % 2) ctx.fillText('DEBRIS! PRESS W', cx, 70);
    }
    // Satellite
    ctx.globalAlpha = s.inShadow ? .6 : 1;
    emoji('🛰️', sx, sy, 70);
    ctx.globalAlpha = 1;
    if (s.inShadow) emoji('🌑', sx + 46, sy - 40, 30);
    if (s.powerSave) emoji('💤', sx - 46, sy - 40, 30);
    // Flare
    if (s.flare) {
      ctx.fillStyle = 'rgba(251,146,60,.18)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fde047'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`☀️ SOLAR FLARE! Safe mode (E)? ${Math.ceil(s.flare.until - s.time)}s`, cx, H - 50);
    }
    // Labels
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${planet.name} · ${s.alt.toLocaleString()} km`, 24, 44);
    if (s.overStation) { ctx.fillStyle = '#38bdf8'; ctx.fillText('📡 STATION IN RANGE: SEND!', 24, 88); }
    if (s.targetInView) { ctx.fillStyle = '#4ade80'; ctx.fillText('🎯 TARGET UNDER YOU: PICTURE!', 24, s.overStation ? 132 : 88); }
    if (paused) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 90px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', cx, cy); }
  }

  function drawHud() {
    const h = hud(s);
    $('#orbitText').textContent = `Orbit ${h.orbit} of ${h.orbits} · ${Math.ceil(h.timeLeft)} s left · Goal: deliver targets home`;
    $('#hud').innerHTML =
      statCard(`s-power ${h.power < 0.2 ? 'alarm' : ''}`, s.inShadow ? '⚡ Power (shadow!)' : '⚡ Power', `${Math.round(h.power * 100)}%`, h.power) +
      statCard(`s-data ${h.memory > 0.85 ? 'alarm' : ''}`, '💾 Memory', `${Math.round(h.memory * 100)}%`, h.memory) +
      statCard('s-target', '🎯 Delivered', `${h.sentTargets}/${h.targetCount}`, h.sentTargets / h.targetCount) +
      statCard('s-science', '🔬 Science', h.science) +
      statCard('s-fuel', '⛽ Dodges', h.fuel) +
      statCard(`s-money ${h.budget < 15 ? 'alarm' : ''}`, '💰 Budget', `$${h.budget}M`);
    $('#lesson').textContent = lastLesson;
    $('#parts').innerHTML = '<b>🛰️ Satellite parts</b><br>' + s.parts.map(p => `${partById(p.id).emoji} ${p.alive ? partById(p.id).name : `<s>${partById(p.id).name}</s> 💥`}`).join('<br>');
    $('#b-send').classList.toggle('flash', s.overStation && s.packets.length > 0);
    $('#b-cap').classList.toggle('flash', Boolean(s.targetInView));
    $('#b-dodge').classList.toggle('flash', Boolean(s.debris));
    $('#b-pow').classList.toggle('flash', Boolean(s.flare) && !s.powerSave);
    $('#b-pow').innerHTML = `🔋 Power save: ${s.powerSave ? 'ON' : 'OFF'}<span class="k">E</span>${players > 1 ? `<span class="who">Player ${who.engineer}</span>` : ''}`;
  }

  // ----- Main loop -----
  const SPEED = Number(new URLSearchParams(location.search).get('speed')) || 1; // ?speed=5 for quick tests
  let last = performance.now();
  let hudTimer = 0;
  let finished = false;
  function frame(now) {
    if (finished) return;
    const dt = Math.min(0.05, (now - last) / 1000) * SPEED;
    last = now;
    if (!paused) {
      if (keys.capture) teamCount.scientist++;
      if (keys.togglePower) teamCount.engineer++;
      if (keys.dodge && s.debris) teamCount.pilot++;
      if (keys.send && s.overStation) teamCount.comms += dt;
      const msgs = step(s, dt, { ...keys });
      keys.capture = false; keys.togglePower = false; keys.dodge = false;
      for (const msg of msgs) {
        if (msg.kind === 'lesson') { lastLesson = LESSONS[msg.key]; toast(LESSONS[msg.key].split('.')[0], 'warn'); }
        else toast(msg.text, msg.kind);
      }
    }
    draw();
    hudTimer += dt;
    if (hudTimer > 0.15) { drawHud(); hudTimer = 0; }
    if (s.ended && !finished) {
      finished = true;
      drawHud();
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      const reasonText = { complete: 'MISSION COMPLETE', decay: 'ORBIT DECAYED', money: 'OUT OF MONEY' }[s.endReason];
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 90px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(reasonText, W / 2, H / 2);
      const team = players > 1 ? ROLES.map(r => ({ ...r, player: who[r.id],
        count: r.id === 'comms' ? Math.round(teamCount.comms) : teamCount[r.id],
        unit: { scientist: 'pictures', comms: 'seconds sending', engineer: 'power switches', pilot: 'dodges' }[r.id] })) : null;
      setTimeout(() => onEnd(summarize(s), team), 1800);
      return;
    }
    requestAnimationFrame(frame);
  }
  drawHud();
  requestAnimationFrame(frame);
}
