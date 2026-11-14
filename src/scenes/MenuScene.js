// src/scenes/MenuScene.js
// Main menu: pick a difficulty, then start the journey.

import Phaser from 'phaser';
import { gameState, setDifficulty, setLevel, resetRun, setPlayerName } from '../state.js';
import difficultiesData from '../../data/difficulties.json';
import { textStyle } from '../ui/font.js';

const COLUMNS = [42, 122, 202, 282];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(160, 22, 'LAHAQ', textStyle(24, '#ffd27f')).setOrigin(0.5);
    this.add.text(160, 42, 'Catch the last caravan home', textStyle(8, '#9fe8e0')).setOrigin(0.5);

    this.add.text(160, 62, 'DIFFICULTY', textStyle(8, '#e8e4d0')).setOrigin(0.5);
    this.diffButtons = difficultiesData.map((d, i) => {
      const box = this.add.rectangle(COLUMNS[i], 76, 76, 16, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
        .setInteractive({ useHandCursor: true });
      this.add.text(COLUMNS[i], 76, d.name.toUpperCase(), textStyle(8, '#ffffff')).setOrigin(0.5);
      box.on('pointerdown', () => { setDifficulty(d.id); this.refresh(); });
      return { id: d.id, box };
    });

    this.explainText = this.add.text(160, 102, '', textStyle(8, '#e8e4d0', {
      wordWrap: { width: 300 }, align: 'center', lineSpacing: 2,
    })).setOrigin(0.5);

    // Player name (shown in the Majlis). Click to change it.
    this.nameText = this.add.text(160, 126, '', textStyle(8, '#9fe8e0')).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.nameText.on('pointerdown', () => {
      const name = window.prompt('Your pilot name (max 12 letters):', gameState.playerName);
      if (name !== null) { setPlayerName(name); this.refresh(); }
    });

    // Number of players (team mode). Click to change: 1, 2, 3, 4.
    this.playersText = this.add.text(160, 140, '', textStyle(8, '#9fe8e0')).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.playersText.on('pointerdown', () => {
      gameState.players = (gameState.players % 4) + 1;
      this.refresh();
    });

    this.button(110, 162, 'START >', () => {
      resetRun();
      setLevel(1);
      this.scene.start('Briefing');
    });
    this.button(214, 162, 'MAJLIS', () => this.scene.start('Majlis'));

    this.refresh();
  }

  refresh() {
    for (const b of this.diffButtons) {
      b.box.setFillStyle(b.id === gameState.difficulty ? 0x7a6a2a : 0x3b3b7a);
    }
    const d = difficultiesData.find(x => x.id === gameState.difficulty);
    this.explainText.setText(d ? d.explain : '');
    this.nameText.setText(`PILOT: ${gameState.playerName.toUpperCase()} (EDIT)`);
    const p = gameState.players;
    this.playersText.setText(`PLAYERS: ${p} ${p === 1 ? '(SOLO)' : '(TEAM)'} (CHANGE)`);
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
