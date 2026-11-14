import Phaser from 'phaser';
import { nextSceneKey } from '../state.js';
import { textStyle } from '../ui/font.js';

const THRUST = 0.0004;        // force per frame while UP is held
const TURN_SPEED = 0.06;      // radians per frame while LEFT/RIGHT is held
const GAME_W = 320;
const GAME_H = 180;
const WORLD_W = 3200;         // the course is 10 screens wide
const WORLD_H = GAME_H;       // same height as the screen
const STAR_COUNT = 150;
const STAR_COLORS = [0x9fe8e0, 0xffd27f, 0xe8e4d0]; // palette colors

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    // Background covers the whole world, not just one screen.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0b0b1e);

    // Placeholder stars scattered across the world (1 or 2 pixels).
    for (let i = 0; i < STAR_COUNT; i++) {
      const sx = Phaser.Math.Between(0, WORLD_W);
      const sy = Phaser.Math.Between(0, WORLD_H);
      const size = Phaser.Math.Between(1, 2);
      const color = Phaser.Utils.Array.GetRandom(STAR_COLORS);
      this.add.rectangle(sx, sy, size, size, color);
    }

    // Physics walls around the world so the ship cannot leave it.
    this.matter.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // The ship: a 16x16 rectangle that Matter physics controls.
    // frictionAir 0 = no drag, so it keeps drifting in space.
    // restitution 0.5 = it bounces softly off the world edges.
    this.ship = this.add.rectangle(GAME_W / 2, GAME_H / 2, 16, 16, 0x9fe8e0);
    this.matter.add.gameObject(this.ship, { frictionAir: 0, friction: 0, restitution: 0.5 });

    // Small "nose" square so you can see which way the ship is facing.
    this.nose = this.add.rectangle(0, 0, 4, 4, 0xffd27f);

    // Camera: limited to the world, smoothly follows the ship.
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.ship, true, 0.1, 0.1);

    // Keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Help text: scrollFactor 0 pins it to the screen, depth keeps it on top.
    this.add.text(4, 4, 'UP thrust  LEFT/RIGHT turn', textStyle(8, '#9fe8e0'))
      .setScrollFactor(0).setDepth(100);
    this.add.text(4, 168, 'ENTER: next (Report)', textStyle(8, '#e8e4d0'))
      .setScrollFactor(0).setDepth(100);
  }

  update() {
    // Rotate: set spin only while a turn key is held.
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-TURN_SPEED);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(TURN_SPEED);
    } else {
      this.ship.setAngularVelocity(0);
    }

    // Thrust in the direction the ship is facing (angle 0 = facing right).
    if (this.cursors.up.isDown) {
      this.ship.thrust(THRUST);
    }

    // Safety net: if the ship ever slips past the walls, put it back inside.
    const x = Phaser.Math.Clamp(this.ship.x, 0, WORLD_W);
    const y = Phaser.Math.Clamp(this.ship.y, 0, WORLD_H);
    if (x !== this.ship.x || y !== this.ship.y) this.ship.setPosition(x, y);

    // Put the nose on the front edge of the ship.
    const a = this.ship.rotation;
    this.nose.setPosition(this.ship.x + Math.cos(a) * 10, this.ship.y + Math.sin(a) * 10);
    this.nose.setRotation(a);

    // Enter goes to the next scene.
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start(nextSceneKey(this.scene.key));
    }
  }
}