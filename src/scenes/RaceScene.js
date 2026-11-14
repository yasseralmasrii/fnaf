// src/scenes/RaceScene.js
// OWNER: Member 3. The race: fly the ship you built to the finish line.
// Movement and drawing are here. Power, fuel, science and the report data are in raceTracker.js.

import Phaser from 'phaser';
import { gameState, FAKE_SHIP_DESIGN } from '../state.js';
import partsData from '../../data/parts.json';
import { createRaceTracker } from '../systems/raceTracker.js';
import { textStyle } from '../ui/font.js';

const COURSE_LENGTH = 3000;   // pixels from start to finish
const FINISH_X = 2900;
const CELL = 8;               // each ship part is drawn 8x8 in the race
const MAX_SPEED = 1.4;        // pixels per physics step
const FUEL_PER_SECOND = 1;    // fuel used per second of thrust

const ROCK_COLOR = 0x7a6450;    // brown rock body
const ROCK_OUTLINE = 0x2a2018;  // dark outline around rocks

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

    // World and camera
    this.cameras.main.setBackgroundColor(0x0b0b1e);
    this.matter.world.setBounds(0, 0, COURSE_LENGTH, 180);
    this.cameras.main.setBounds(0, 0, COURSE_LENGTH, 180);
    this.drawBackground();

    // Rocks are created BEFORE the ship so the ship is drawn on top of them.
    this.spawnRealRocks();

    this.buildShip();
    this.cameras.main.startFollow(this.shipView, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(0, 180); // follow left/right only

    this.cursors = this.input.keyboard.createCursorKeys();
    this.buildHud();
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
      this.add.circle(FINISH_X + 30 + i * 12, 80 + Math.sin(i) * 10, 2, 0xffd27f);
    }
    this.add.text(FINISH_X + 20, 100, 'QAFILA', textStyle(8, '#ffd27f'));
  }

  // Step B1: real rocks. Static circles the ship can bump into.
  spawnRealRocks() {
    this.realRocks = [];                       // keep them in a list for the next steps
    const count = this.level.realRocks || 0;   // how many rocks this level wants

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(260, FINISH_X - 80);  // not too close to the start or the finish
      const y = Phaser.Math.Between(20, 170);
      const radius = Phaser.Math.Between(5, 9);

      // Shadow first, so it is drawn BEHIND the rock (offset by 2 pixels)
      const shadow = this.add.circle(x + 2, y + 2, radius, 0x000000, 0.5);

      // The rock itself: brown circle with a dark outline
      const rock = this.add.circle(x, y, radius, ROCK_COLOR);
      rock.setStrokeStyle(1, ROCK_OUTLINE);

      // Static physics body: the ship bumps into it, but the rock never moves
      this.matter.add.gameObject(rock, {
        shape: { type: 'circle', radius },
        isStatic: true,
      });

      rock.isRealRock = true;   // mark it, so step B2 knows this rock is dangerous
      rock.shadow = shadow;
      this.realRocks.push(rock);
    }
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
      const view = this.add.rectangle(ox, oy, CELL - 1, CELL - 1, CATEGORY_COLORS[data.category] || 0xffffff);
      this.shipView.add(view);
      this.partViews.push({ id: p.id, view, hp: data.hp, ox, oy });
    }

    // Heavier ships accelerate and steer slower. A gyro helps steering.
    const mass = this.design.totals.mass || 100;
    this.accel = 1.5 / (1 + mass / 200);
    const gyroBonus = parts.some(p => p.id === 'gyro') ? 1.6 : 1;
    this.steer = 2 * gyroBonus * Phaser.Math.Clamp(150 / mass, 0.5, 1.5);
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

    this.tracker.tick(dt, { thrusting });

    const v = this.hull.body.velocity;
    let vx = v.x;
    let vy = v.y;

    // Forward speed
    if (thrusting) vx += this.accel * dt;
    vx = Phaser.Math.Clamp(vx, 0, MAX_SPEED);

    // Steer up and down (UP / DOWN arrows). Heavy ships steer slower, a gyro helps.
    if (this.cursors.up.isDown) vy -= this.steer * dt;
    else if (this.cursors.down.isDown) vy += this.steer * dt;
    else vy *= 0.95; // slowly stop moving up/down when no key is pressed
    vy = Phaser.Math.Clamp(vy, -1, 1);

    const speed = Math.hypot(vx, vy);
    this.hull.setVelocity(vx, vy);
    this.hull.setRotation(0);

    // Draw the parts where the hull is
    this.shipView.setPosition(this.hull.x, this.hull.y);
    this.shipView.setRotation(vy * 0.3); // small tilt when steering

    this.updateHud();
    this.checkEnd(thrusting, speed, dt);
  }

  updateHud() {
    const h = this.tracker.hud();
    this.hudText.setText(`TIME ${h.time}  FUEL ${h.fuel}`);
    const ratio = h.maxPower > 0 ? h.power / h.maxPower : 0;
    this.powerBar.width = 60 * ratio;
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
