import Phaser from 'phaser';
import { gameState, nextSceneKey, prevSceneKey, resetRun } from '../state.js';

// Base class for the placeholder screens. Owners REPLACE their scene file
// with a real implementation; they should not edit this file.
export default class PlaceholderScene extends Phaser.Scene {
  constructor(key, title) {
    super(key);
    this.sceneTitle = title;
  }

  create() {
    const key = this.scene.key;
    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(160, 20, this.sceneTitle, { fontSize: '14px', color: '#ffd27f' }).setOrigin(0.5);
    this.add.text(160, 45, `Scene: ${key}`, { fontSize: '8px', color: '#9fe8e0' }).setOrigin(0.5);

    // Debug readout so you can see data moving between scenes.
    const ship = gameState.shipDesign ? 'shipDesign: set' : 'shipDesign: null';
    const res = gameState.raceResult ? 'raceResult: set' : 'raceResult: null';
    this.add.text(160, 70, `level ${gameState.levelId} | ${ship} | ${res}`,
      { fontSize: '8px', color: '#e8e4d0' }).setOrigin(0.5);

    this.button(160, 120, 'NEXT >', () => this.scene.start(nextSceneKey(key)));
    if (key !== 'Menu') this.button(60, 160, '< BACK', () => this.scene.start(prevSceneKey(key)));
    this.button(260, 160, 'FAKE DATA', () => { resetRun({ fake: true }); this.scene.restart(); });
  }

  button(x, y, label, onClick) {
    const w = label.length * 7 + 14;
    const box = this.add.rectangle(x, y, w, 18, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '8px', color: '#ffffff' }).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(0x5555aa));
    box.on('pointerout', () => box.setFillStyle(0x3b3b7a));
    box.on('pointerdown', onClick);
  }
}
