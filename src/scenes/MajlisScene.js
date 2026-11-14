// src/scenes/MajlisScene.js
// The Majlis (leaderboard): best runs for each mission. Press TRY to load a player's ship.

import Phaser from 'phaser';
import { gameState, setLevel } from '../state.js';
import { getTopRuns } from '../systems/leaderboard.js';
import { decodeDesign } from '../systems/designCode.js';
import { textStyle } from '../ui/font.js';

const LAST_LEVEL = 6;
const ROWS = 7;

function timeText(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default class MajlisScene extends Phaser.Scene {
  constructor() {
    super('Majlis');
  }

  create() {
    this.levelId = gameState.levelId || 1;

    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(160, 10, 'MAJLIS', textStyle(16, '#ffd27f')).setOrigin(0.5);

    this.button(40, 28, '<', () => this.changeLevel(-1));
    this.levelText = this.add.text(160, 28, '', textStyle(8, '#9fe8e0')).setOrigin(0.5);
    this.button(280, 28, '>', () => this.changeLevel(1));

    this.add.text(8, 42, '#', textStyle(8, '#77779a'));
    this.add.text(28, 42, 'NAME', textStyle(8, '#77779a'));
    this.add.text(140, 42, 'STARS', textStyle(8, '#77779a'));
    this.add.text(196, 42, 'TIME', textStyle(8, '#77779a'));

    this.rowsLayer = this.add.container(0, 0);
    this.button(40, 168, '< MENU', () => this.scene.start('Menu'));

    this.refresh();
  }

  changeLevel(step) {
    this.levelId = Math.min(LAST_LEVEL, Math.max(1, this.levelId + step));
    this.refresh();
  }

  refresh() {
    this.levelText.setText(`MISSION ${this.levelId}`);
    this.rowsLayer.removeAll(true);

    const runs = getTopRuns(this.levelId, ROWS);
    if (runs.length === 0) {
      this.rowsLayer.add(this.add.text(160, 90, 'No runs yet. Be the first!', textStyle(8, '#e8e4d0')).setOrigin(0.5));
      return;
    }

    runs.forEach((run, i) => {
      const y = 56 + i * 15;
      const color = i === 0 ? '#ffd27f' : '#e8e4d0';
      this.rowsLayer.add(this.add.text(8, y, `${i + 1}`, textStyle(8, color)));
      this.rowsLayer.add(this.add.text(28, y, String(run.name).slice(0, 12), textStyle(8, color)));
      this.rowsLayer.add(this.add.text(140, y, `${run.stars}/7`, textStyle(8, color)));
      this.rowsLayer.add(this.add.text(196, y, timeText(run.time), textStyle(8, color)));
      if (run.designCode) {
        const tryBox = this.button(282, y + 4, 'TRY', () => this.tryShip(run));
        this.rowsLayer.add(tryBox);
      }
    });
  }

  // Load this player's ship into the hangar so you can study it and fly it.
  tryShip(run) {
    const design = decodeDesign(run.designCode);
    if (!design) return;
    setLevel(run.levelId);
    gameState.shipDesign = design;
    gameState.raceResult = null;
    this.scene.start('Hangar');
  }

  button(x, y, label, onClick) {
    const w = label.length * 8 + 12;
    const box = this.add.rectangle(x, y, w, 14, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, textStyle(8, '#ffffff')).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(0x5555aa));
    box.on('pointerout', () => box.setFillStyle(0x3b3b7a));
    box.on('pointerdown', onClick);
    const group = this.add.container(0, 0, [box, text]);
    return group;
  }
}
