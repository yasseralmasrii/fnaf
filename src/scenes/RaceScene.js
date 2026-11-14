// src/scenes/RaceScene.js
// OWNER: Member 3. The race: fly the ship you built to the finish line.
// Movement and drawing are here. Power, fuel, science and the report data are in raceTracker.js.

import Phaser from 'phaser';
import { gameState, FAKE_SHIP_DESIGN } from '../state.js';
import partsData from '../../data/parts.json';
import eventsData from '../../data/events.json';
import { createRaceTracker } from '../systems/raceTracker.js';
import { textStyle } from '../ui/font.js';

const COURSE_LENGTH = 3000;   // pixels from start to finish
const FINISH_X = 2900;
const CELL = 8;               // each ship part is drawn 8x8 in the race
const MAX_SPEED = 1.4;        // pixels per physics step
const FUEL_PER_SECOND = 1;    // fuel used per second of thrust
const STEER_FUEL = 0.5;       // fuel used per second of steering up/down
const SCAN_RANGE = 120;       // scanner shows fakes this close (pixels)

const CATEGORY_COLORS = {
  structure: 0x8a8a9a, power: 0xffd27f, propulsion: 0xff7a59,
  control: 0x9fe8e0, comms: 0x7fb2ff, science: 0xc58aff, defense: 0x6fcf7f,
};

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    this.design = gameState.shipDesign || structuredClone(FAKE_SHIP_DESIGN);
    this.level = gameState.level;
    this.tracker = createRaceTracker(this.level, this.design);
    this.ended = false;
    this.stillTime = 0;
    this.flareActive = false;

    // World and camera
    this.cameras.main.setBackgroundColor(0x0b0b1e);
    this.matter.world.setBounds(0, 0, COURSE_LENGTH, 180);
    this.cameras.main.setBounds(0, 0, COURSE_LENGTH, 180);
    this.drawBackground();

    this.buildShip();
    this.spawnRocks();
    this.cameras.main.startFollow(this.shipView, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(0, 180); // follow left/right only

    this.cursors = this.input.keyboard.createCursorKeys();
    this.buildHud();
    this.setupEvents();
  }

  // ---------- Setup ----------

  drawBackground() {
    for (let i = 0; i < 300; i++) {
      const x = Phaser.Math.Between(0, COURSE_LENGTH);
      const y = Phaser.Math.Between(0, 180);
      this.add.rectangle(x, y, 1, 1, 0xe8e4d0, Phaser.Math.FloatBetween(0.2, 0.8));
    }
    // Finish line and the caravan lights
    this.add.rectangle(FINISH_X, 90, 2, 180, 0xffd27f, 0.6);
    for (let i = 0; i < 6; i++) {
      const light = this.add.circle(FINISH_X + 30 + i * 12, 80 + Math.sin(i) * 10, 2, 0xffd27f);
      this.tweens.add({ targets: light, alpha: 0.3, duration: 400 + i * 80, yoyo: true, repeat: -1 });
    }
    this.add.text(FINISH_X + 20, 100, 'QAFILA', textStyle(8, '#ffd27f'));
  }

  buildShip() {
    const parts = this.design.parts;
    const minX = Math.min(...parts.map(p => p.gx));
    const maxX = Math.max(...parts.map(p => p.gx));
    const minY = Math.min(...parts.map(p => p.gy));
    const maxY = Math.max(...parts.map(p => p.gy));
    const width = (maxX - minX + 1) * CELL;
    const height = (maxY - minY + 1) * CELL;

    // Invisible physics body (the "hull") that moves and collides.
    this.hull = this.add.rectangle(40, 90, width, height, 0x000000, 0);
    this.matter.add.gameObject(this.hull, { frictionAir: 0.002 });
    this.hull.setFixedRotation();

    // Visible parts drawn on top of the hull.
    this.shipView = this.add.container(40, 90);
    this.partViews = [];
    for (const p of parts) {
      const data = partsData.find(d => d.id === p.id);
      if (!data) continue;
      const ox = (p.gx - minX) * CELL - width / 2 + CELL / 2;
      const oy = (p.gy - minY) * CELL - height / 2 + CELL / 2;
      const color = CATEGORY_COLORS[data.category] || 0xffffff;
      const view = this.add.rectangle(ox, oy, CELL - 1, CELL - 1, color);
      this.shipView.add(view);
      this.partViews.push({ id: p.id, view, hp: data.hp, ox, oy, color });
    }

    // A small flame behind the ship, shown while thrusting.
    this.flame = this.add.triangle(-width / 2 - 4, 0, 0, 0, 6, -3, 6, 3, 0xff7a59).setVisible(false);
    this.shipView.add(this.flame);

    // Heavier ships accelerate and steer slower. A gyro helps steering.
    const mass = this.design.totals.mass || 100;
    this.accel = 1.5 / (1 + mass / 200);
    const gyroBonus = parts.some(p => p.id === 'gyro') ? 1.6 : 1;
    this.steer = 2 * gyroBonus * Phaser.Math.Clamp(150 / mass, 0.5, 1.5);
  }

  spawnRocks() {
    const randomX = () => Phaser.Math.Between(260, FINISH_X - 80);
    const randomY = () => Phaser.Math.Between(20, 170);

    // Real rocks: solid, with a shadow. They damage the ship.
    this.realRocks = [];
    for (let i = 0; i < (this.level.realRocks || 0); i++) {
      const x = randomX();
      const y = randomY();
      const r = Phaser.Math.Between(5, 9);
      this.add.circle(x + 2, y + 2, r, 0x000000, 0.5); // shadow
      const rock = this.add.circle(x, y, r, 0x7a6450).setStrokeStyle(1, 0x2a2018);
      this.matter.add.gameObject(rock, { isStatic: true, shape: { type: 'circle', radius: r } });
      rock.isRealRock = true;
      this.realRocks.push(rock);
    }

    // Fake rocks (Sarab): no body, they shimmer. Less shimmer = harder to spot.
    const shimmer = this.level.fakeShimmer ?? 1;
    this.fakeRocks = [];
    for (let i = 0; i < (this.level.fakeRocks || 0); i++) {
      const x = randomX();
      const y = randomY();
      const r = Phaser.Math.Between(5, 9);
      if (shimmer < 0.5) this.add.circle(x + 2, y + 2, r, 0x000000, 0.5); // good fakes even have a shadow
      const fake = this.add.circle(x, y, r, 0x7a6450);
      this.tweens.add({
        targets: fake,
        alpha: 1 - 0.7 * shimmer,
        x: x + 2 * shimmer,
        duration: Phaser.Math.Between(300, 600),
        yoyo: true,
        repeat: -1,
      });
      fake.counted = false;
      this.fakeRocks.push(fake);
    }

    // When the ship touches a real rock
    this.matter.world.on('collisionstart', (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA.gameObject;
        const b = pair.bodyB.gameObject;
        const rock = a && a.isRealRock ? a : (b && b.isRealRock ? b : null);
        const isShip = a === this.hull || b === this.hull;
        if (rock && isShip) this.hitRealRock(rock);
      }
    });
  }

  buildHud() {
    this.add.rectangle(160, 6, 320, 12, 0x000000, 0.6).setScrollFactor(0);
    this.hudText = this.add.text(4, 2, '', textStyle(8, '#e8e4d0')).setScrollFactor(0);
    this.powerBar = this.add.rectangle(250, 6, 60, 6, 0x6fcf7f).setOrigin(0, 0.5).setScrollFactor(0);
    this.add.rectangle(250, 6, 60, 6).setOrigin(0, 0.5).setStrokeStyle(1, 0xe8e4d0).setScrollFactor(0);
    this.add.text(214, 2, 'PWR', textStyle(8, '#9fe8e0')).setScrollFactor(0);
    this.messageText = this.add.text(160, 90, '', textStyle(16, '#ffd27f')).setOrigin(0.5).setScrollFactor(0);

    // Short help at the start
    const help = this.add.text(160, 160, 'RIGHT = THRUST   UP/DOWN = STEER', textStyle(8, '#9fe8e0'))
      .setOrigin(0.5).setScrollFactor(0);
    this.time.delayedCall(5000, () => help.destroy());
  }

  // ---------- Every frame ----------

  update(time, delta) {
    if (this.ended) return;
    const dt = delta / 1000;

    // Thrust forward (RIGHT arrow): needs a working thruster and fuel.
    const wantsThrust = this.cursors.right.isDown;
    const thrusting = wantsThrust && this.tracker.has('thruster')
      && this.tracker.useFuel(FUEL_PER_SECOND * dt, false);

    this.tracker.tick(dt, { thrusting, flareActive: this.flareActive });
    this.flame.setVisible(thrusting && Math.random() > 0.2);

    const v = this.hull.body.velocity;
    let vx = v.x;
    let vy = v.y;

    // Forward speed
    if (thrusting) vx += this.accel * dt;
    vx = Phaser.Math.Clamp(vx, 0, MAX_SPEED);

    // Steer up and down (UP / DOWN arrows). Uses a little fuel.
    // Heavy ships steer slower, a gyro helps.
    const fakeAhead = this.fakeAhead();
    const wantsSteer = this.cursors.up.isDown || this.cursors.down.isDown;
    const canSteer = wantsSteer && this.tracker.useFuel(STEER_FUEL * dt, Boolean(fakeAhead));
    if (canSteer && this.cursors.up.isDown) vy -= this.steer * dt;
    else if (canSteer && this.cursors.down.isDown) vy += this.steer * dt;
    else vy *= 0.95; // slowly stop moving up/down when no key is pressed
    vy = Phaser.Math.Clamp(vy, -1, 1);

    // Steering away from a fake rock = fooled by Sarab (count each fake once)
    if (canSteer && fakeAhead && !fakeAhead.counted) {
      fakeAhead.counted = true;
      this.tracker.fakeDodged();
    }

    const speed = Math.hypot(vx, vy);
    this.hull.setVelocity(vx, vy);
    this.hull.setRotation(0);

    // Draw the parts where the hull is
    this.shipView.setPosition(this.hull.x, this.hull.y);
    this.shipView.setRotation(vy * 0.3); // small tilt when steering

    this.updateScanner();
    this.updateHud();
    this.checkEnd(thrusting, speed, dt);
  }

  // The closest fake rock just in front of the ship, or null.
  fakeAhead() {
    let best = null;
    for (const f of this.fakeRocks) {
      const dx = f.x - this.hull.x;
      const dy = Math.abs(f.y - this.hull.y);
      if (dx > 0 && dx < 60 && dy < 30 && (!best || dx < best.x - this.hull.x)) best = f;
    }
    return best;
  }

  // If the scanner works, draw a turquoise ring around nearby fakes.
  updateScanner() {
    const on = this.tracker.scannerOn();
    for (const f of this.fakeRocks) {
      const near = Math.abs(f.x - this.hull.x) < SCAN_RANGE;
      if (on && near) f.setStrokeStyle(1, 0x9fe8e0);
      else f.setStrokeStyle();
    }
  }

  hitRealRock(rock) {
    if (rock.hitDone) return;
    rock.hitDone = true;
    this.tracker.realHit();
    this.cameras.main.shake(120, 0.01);

    // A shield takes the hit first. Otherwise the front part is hit.
    const alive = this.partViews.filter(p => p.hp > 0);
    if (alive.length === 0) return;
    const shield = alive.find(p => p.id === 'shield' || p.id === 'shield_light');
    const target = shield || alive.reduce((front, p) => (p.ox > front.ox ? p : front), alive[0]);

    this.damagePart(target, 25, 'rock');
  }

  // Lower a part's hp. Flash it red. Break it off if hp reaches 0.
  damagePart(target, amount, cause) {
    if (target.hp <= 0) return;
    target.hp -= amount;
    target.view.setFillStyle(0xff7a7a);
    this.time.delayedCall(150, () => { if (target.hp > 0) target.view.setFillStyle(target.color); });
    if (target.hp <= 0) this.breakPart(target, cause);
  }

  // The part flies off the ship and floats away.
  breakPart(partView, cause) {
    this.tracker.losePart(partView.id, cause);
    const world = this.shipView.getWorldTransformMatrix().transformPoint(partView.ox, partView.oy);
    partView.view.destroy();
    const debris = this.add.rectangle(world.x, world.y, CELL - 1, CELL - 1, partView.color);
    this.tweens.add({
      targets: debris,
      x: world.x - 60,
      y: world.y + Phaser.Math.Between(-40, 40),
      angle: 360,
      alpha: 0,
      duration: 1500,
      onComplete: () => debris.destroy(),
    });
  }

  // ---------- Random events ----------

  setupEvents() {
    const events = this.level.events || [];
    const flare = eventsData.find(e => e.id === 'solar_flare');
    const radiation = eventsData.find(e => e.id === 'radiation');

    if (flare && events.includes('solar_flare') && Math.random() < flare.chance) {
      this.time.delayedCall(Phaser.Math.Between(15, 40) * 1000, () => this.startFlare(flare));
    }
    if (radiation && events.includes('radiation') && Math.random() < radiation.chance) {
      this.time.delayedCall(Phaser.Math.Between(10, 30) * 1000, () => this.startRadiation(radiation));
    }
  }

  startFlare(flare) {
    if (this.ended) return;
    this.flareActive = true;
    const tint = this.add.rectangle(160, 90, 320, 180, 0xff7a59, 0.15).setScrollFactor(0);
    const text = this.add.text(160, 24, 'SOLAR FLARE!', textStyle(16, '#ff7a7a')).setOrigin(0.5).setScrollFactor(0);
    const sub = this.add.text(160, 40, 'POWER -50%', textStyle(8, '#ff7a7a')).setOrigin(0.5).setScrollFactor(0);
    this.time.delayedCall(flare.duration * 1000, () => {
      this.flareActive = false;
      tint.destroy(); text.destroy(); sub.destroy();
    });
  }

  startRadiation(radiation) {
    if (this.ended) return;
    const tint = this.add.rectangle(160, 90, 320, 180, 0xc58aff, 0.15).setScrollFactor(0);
    const text = this.add.text(160, 24, 'RADIATION!', textStyle(16, '#c58aff')).setOrigin(0.5).setScrollFactor(0);
    const hasComputer = this.partViews.some(p => p.id === 'computer' && p.hp > 0);
    const damage = radiation.damage * (hasComputer ? radiation.computerProtects : 1);
    const sub = this.add.text(160, 40, hasComputer ? 'COMPUTER PROTECTING' : 'ELECTRONICS HIT', textStyle(8, '#c58aff'))
      .setOrigin(0.5).setScrollFactor(0);

    this.time.addEvent({
      delay: 1000,
      repeat: radiation.duration - 1,
      callback: () => {
        if (this.ended) return;
        for (const p of this.partViews) {
          if (radiation.affects.includes(p.id) || p.id === 'camera_science') this.damagePart(p, damage, 'radiation');
        }
      },
    });
    this.time.delayedCall(radiation.duration * 1000, () => { tint.destroy(); text.destroy(); sub.destroy(); });
  }

  updateHud() {
    const h = this.tracker.hud();
    this.hudText.setText(`TIME ${h.time}  FUEL ${h.fuel}`);
    const ratio = h.maxPower > 0 ? h.power / h.maxPower : 0;
    this.powerBar.setSize(60 * ratio, 6);
    this.powerBar.setFillStyle(ratio > 0.3 ? 0x6fcf7f : 0xff7a7a);
  }

  checkEnd(thrusting, speed, dt) {
    if (this.hull.x >= FINISH_X) {
      this.endRace(true);
      return;
    }
    // Stuck: no fuel or no thruster, and almost not moving for 3 seconds.
    const canMove = this.tracker.has('thruster') && this.tracker.hud().fuel > 0;
    if (!canMove && speed < 0.05) {
      this.stillTime += dt;
      if (this.stillTime > 3) this.endRace(false);
    } else {
      this.stillTime = 0;
    }
  }

  endRace(finished) {
    this.ended = true;
    gameState.raceResult = this.tracker.finish(finished);
    this.messageText.setText(finished ? 'QAFILA REACHED!' : 'LOST IN SPACE...');
    this.time.delayedCall(1500, () => this.scene.start('Report'));
  }
}
