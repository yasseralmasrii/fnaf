// src/scenes/BriefingScene.js
// The mission card: where we are going, why, and the limits for this mission.

import Phaser from 'phaser';
import { gameState } from '../state.js';
import eventsData from '../../data/events.json';
import { textStyle } from '../ui/font.js';

export default class BriefingScene extends Phaser.Scene {
  constructor() {
    super('Briefing');
  }

  create() {
    const level = gameState.level;
    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(4, 6, `MISSION ${level.id}: ${level.planet.toUpperCase()}`, textStyle(8, '#ffd27f'));

    // Verse (only if the writer added one)
    let y = 20;
    if (level.verse && level.verse !== '...') {
      const verse = this.add.text(160, y, level.verse, textStyle(8, '#9fe8e0', {
        wordWrap: { width: 300 }, align: 'center', lineSpacing: 2,
      })).setOrigin(0.5, 0);
      y += verse.height + 6;
    }

    // Briefing (the mission objective)
    const briefing = this.add.text(4, y, level.briefing, textStyle(8, '#e8e4d0', {
      wordWrap: { width: 312 }, lineSpacing: 2,
    }));
    y += briefing.height + 8;

    // Mission limits
    const sun = Math.round((level.sunlight ?? 1) * 100);
    const limits = [
      `BUDGET ${level.budget}`,
      `MASS ${level.massLimit} KG`,
      `FUEL ${level.fuel}`,
      `SUN ${sun}%`,
    ];
    limits.forEach((text, i) => {
      const x = i % 2 === 0 ? 4 : 164;
      const rowY = y + Math.floor(i / 2) * 12;
      this.add.text(x, rowY, text, textStyle(8, '#e8e4d0'));
    });
    y += 28;

    if (level.requiredParts && level.requiredParts.length > 0) {
      this.add.text(4, y, `NEEDS: ${level.requiredParts.join(', ').toUpperCase()}`, textStyle(8, '#ffd27f'));
      y += 12;
    }

    const eventNames = (level.events || [])
      .map(id => eventsData.find(e => e.id === id))
      .filter(Boolean)
      .map(e => e.name.toUpperCase());
    if (eventNames.length > 0) {
      this.add.text(4, y, `WATCH OUT: ${eventNames.join(', ')}`, textStyle(8, '#ff7a7a', { wordWrap: { width: 312 } }));
    }

    this.button(40, 168, '< MENU', () => this.scene.start('Menu'));
    this.button(262, 168, 'BUILD SHIP >', () => this.scene.start('Hangar'));
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
