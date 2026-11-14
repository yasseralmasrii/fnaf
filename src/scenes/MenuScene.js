// src/scenes/MenuScene.js
// Main menu: pick a difficulty, then start the journey.

import Phaser from 'phaser';
import { gameState, setDifficulty, setLevel, resetRun } from '../state.js';
import difficultiesData from '../../data/difficulties.json';
import { textStyle } from '../ui/font.js';

const COLUMNS = [42, 122, 202, 282];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(160, 28, 'LAHAQ', textStyle(24, '#ffd27f')).setOrigin(0.5);
    this.add.text(160, 50, 'Catch the last caravan home', textStyle(8, '#9fe8e0')).setOrigin(0.5);

    this.add.text(160, 72, 'DIFFICULTY', textStyle(8, '#e8e4d0')).setOrigin(0.5);
    this.diffButtons = difficultiesData.map((d, i) => {
      const box = this.add.rectangle(COLUMNS[i], 88, 76, 16, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
        .setInteractive({ useHandCursor: true });
      this.add.text(COLUMNS[i], 88, d.name.toUpperCase(), textStyle(8, '#ffffff')).setOrigin(0.5);
      box.on('pointerdown', () => { setDifficulty(d.id); this.refresh(); });
      return { id: d.id, box };
    });

    this.explainText = this.add.text(160, 116, '', textStyle(8, '#e8e4d0', {
      wordWrap: { width: 300 }, align: 'center', lineSpacing: 2,
    })).setOrigin(0.5);

    this.button(110, 156, 'START >', () => {
      resetRun();
      setLevel(1);
      this.scene.start('Briefing');
    });

    this.refresh();
  }

  refresh() {
    for (const b of this.diffButtons) {
      b.box.setFillStyle(b.id === gameState.difficulty ? 0x7a6a2a : 0x3b3b7a);
    }
    const d = difficultiesData.find(x => x.id === gameState.difficulty);
    this.explainText.setText(d ? d.explain : '');
  }

  button(x, y, label, onClick) {
    const w = label.length * 8 + 12;
    const box = this.add.rectangle(x, y, w, 16, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, textStyle(8, '#ffffff')).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(0x5555aa));
    box.on('pointerout', () => box.setFillStyle(0x3b3b7a));
    box.on('pointerdown', onClick);
    return box;
  }
}
