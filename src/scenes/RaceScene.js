import Phaser from 'phaser';
import { nextSceneKey } from '../state.js';
import { textStyle } from '../ui/font.js';

const THRUST = 0.0004;        // force per frame while UP is held
const TURN_SPEED = 0.06;      // radians per frame while LEFT/RIGHT is held
const GAME_W = 320;
const GAME_H = 180;

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    // Background
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0b0b1e);

    // The ship: a 16x16 rectangle that Matter physics controls.
    // frictionAir 0 = no drag, so it keeps drifting in space.
    this.ship = this.add.rectangle(GAME_W / 2, GAME_H / 2, 16, 16, 0x9fe8e0);
    this.matter.add.gameObject(this.ship, { frictionAir: 0, friction: 0 });

    // Small "nose" square so you can see which way the ship is facing.
    this.nose = this.add.rectangle(0, 0, 4, 4, 0xffd27f);

    // Keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Help text
    this.add.text(4, 4, 'UP thrust  LEFT/RIGHT turn', textStyle(8, '#9fe8e0'));
    this.add.text(4, 168, 'ENTER: next (Report)', textStyle(8, '#e8e4d0'));
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

    // Keep the ship on screen by wrapping around the edges.
    const x = Phaser.Math.Wrap(this.ship.x, 0, GAME_W);
    const y = Phaser.Math.Wrap(this.ship.y, 0, GAME_H);
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