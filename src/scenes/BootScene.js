import Phaser from 'phaser';
import { resetRun } from '../state.js';

// Preload assets here later (spritesheet, audio, font), then go to Menu.
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    // this.load.spritesheet('parts', 'assets/sprites/parts.png', { frameWidth: 16, frameHeight: 16 });
  }
  create() {
    resetRun();
    this.scene.start('Menu');
  }
}
