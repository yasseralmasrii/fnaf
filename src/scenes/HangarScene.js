// src/scenes/HangarScene.js
// OWNER: Member 2. The ship builder: pick a part on the left, click the grid to place it.
// Live numbers on the right, and a warning that explains WHY at the bottom.

import Phaser from 'phaser';
import { gameState } from '../state.js';
import partsData from '../../data/parts.json';
import { computeTotals } from '../systems/resources.js';
import { getWarnings } from '../systems/warnings.js';
import { encodeDesign, decodeDesign } from '../systems/designCode.js';
import { textStyle } from '../ui/font.js';

const GRID_X = 112;
const GRID_Y = 18;
const CELL = 16;
const COLS = 8;
const ROWS = 6;
const LIST_ROWS = 8;

// Placeholder colors until the real sprites are loaded.
const CATEGORY_COLORS = {
  structure: 0x8a8a9a, power: 0xffd27f, propulsion: 0xff7a59,
  control: 0x9fe8e0, comms: 0x7fb2ff, science: 0xc58aff, defense: 0x6fcf7f,
};

// Warnings that stop the launch. Power and data warnings are advice only.
const BLOCKING = ['mass', 'cost', 'required'];

export default class HangarScene extends Phaser.Scene {
  constructor() {
    super('Hangar');
  }

  create() {
    this.level = gameState.level;
    this.available = partsData.filter(p =>
      p.unlockLevel <= gameState.levelId &&
      (gameState.difficulty !== 'bedouin' || p.tier === 'basic'));
    this.placed = gameState.shipDesign ? [...gameState.shipDesign.parts] : [];
    this.selectedId = this.available[0] ? this.available[0].id : null;
    this.listPage = 0;

    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(4, 4, `HANGAR - ${this.level.planet.toUpperCase()}`, textStyle(8, '#ffd27f'));

    this.listLayer = this.add.container(0, 0);
    this.gridLayer = this.add.container(0, 0);
    this.statsLayer = this.add.container(0, 0);
    this.drawGridCells();

    this.warningText = this.add.text(4, 122, '', textStyle(8, '#ff7a7a', {
      wordWrap: { width: 312 }, lineSpacing: 2,
    }));
    this.messageText = this.add.text(160, 152, '', textStyle(8, '#9fe8e0')).setOrigin(0.5);

    this.button(30, 168, 'CLEAR', () => { this.placed = []; this.refresh(); });
    this.button(90, 168, 'SHARE', () => this.shareDesign());
    this.button(146, 168, 'LOAD', () => this.loadDesign());
    this.launchButton = this.button(270, 168, 'LAUNCH >', () => this.tryLaunch());

    this.refresh();
  }

  // ---------- Drawing ----------

  refresh() {
    this.totals = computeTotals(this.placed, this.level.sunlight ?? 1);
    this.warnings = getWarnings(this.totals, this.level, this.placed);
    this.drawList();
    this.drawPlacedParts();
    this.drawStats();
    this.drawWarning();
  }

  drawList() {
    this.listLayer.removeAll(true);
    const start = this.listPage * LIST_ROWS;
    const pageParts = this.available.slice(start, start + LIST_ROWS);

    pageParts.forEach((part, i) => {
      const y = 22 + i * 11;
      const selected = part.id === this.selectedId;
      const row = this.add.rectangle(56, y, 104, 10, selected ? 0x3b3b7a : 0x1a1a3a)
        .setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => { this.selectedId = part.id; this.drawList(); });
      const swatch = this.add.rectangle(9, y, 6, 6, CATEGORY_COLORS[part.category] || 0xffffff);
      const label = this.add.text(15, y, part.name.slice(0, 11), textStyle(8, selected ? '#ffd27f' : '#e8e4d0'))
        .setOrigin(0, 0.5);
      this.listLayer.add([row, swatch, label]);
    });

    if (this.available.length > LIST_ROWS) {
      const pages = Math.ceil(this.available.length / LIST_ROWS);
      const more = this.add.text(56, 112, `MORE ${this.listPage + 1}/${pages}`, textStyle(8, '#9fe8e0'))
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      more.on('pointerdown', () => { this.listPage = (this.listPage + 1) % pages; this.drawList(); });
      this.listLayer.add(more);
    }
  }

  drawGridCells() {
    for (let gx = 0; gx < COLS; gx++) {
      for (let gy = 0; gy < ROWS; gy++) {
        const cell = this.add.rectangle(GRID_X + gx * CELL + 8, GRID_Y + gy * CELL + 8, CELL - 1, CELL - 1, 0x26264a)
          .setInteractive({ useHandCursor: true });
        cell.on('pointerdown', () => this.clickCell(gx, gy));
      }
    }
  }

  drawPlacedParts() {
    this.gridLayer.removeAll(true);
    for (const p of this.placed) {
      const part = partsData.find(d => d.id === p.id);
      if (!part) continue;
      const x = GRID_X + p.gx * CELL + 8;
      const y = GRID_Y + p.gy * CELL + 8;
      if (this.textures.exists(part.sprite)) {
        this.gridLayer.add(this.add.image(x, y, part.sprite));
      } else {
        const box = this.add.rectangle(x, y, CELL - 2, CELL - 2, CATEGORY_COLORS[part.category] || 0xffffff);
        const letter = this.add.text(x, y, part.name[0], textStyle(8, '#1a1a3a')).setOrigin(0.5);
        this.gridLayer.add([box, letter]);
      }
    }
  }

  drawStats() {
    this.statsLayer.removeAll(true);
    const t = this.totals;
    const bad = new Set(this.warnings.map(w => w.type));
    const sign = t.powerBalance > 0 ? '+' : '';
    const rows = [
      ['MASS', `${t.mass}/${this.level.massLimit}`, bad.has('mass')],
      ['POWER', `${sign}${t.powerBalance}`, bad.has('power')],
      ['COST', `${t.cost}/${this.level.budget}`, bad.has('cost')],
      ['DATA', `${t.dataRate}/${t.downlink}`, bad.has('data')],
    ];
    rows.forEach(([name, value, isBad], i) => {
      const y = 20 + i * 24;
      this.statsLayer.add(this.add.text(246, y, name, textStyle(8, '#9fe8e0')));
      this.statsLayer.add(this.add.text(246, y + 10, value, textStyle(8, isBad ? '#ff7a7a' : '#e8e4d0')));
    });
  }

  drawWarning() {
    if (this.warnings.length === 0) {
      this.warningText.setColor('#6fcf7f').setText('Ship looks good. Ready to launch!');
      return;
    }
    const extra = this.warnings.length > 1 ? ` (+${this.warnings.length - 1} more)` : '';
    this.warningText.setColor('#ff7a7a').setText(this.warnings[0].text + extra);
  }

  // ---------- Actions ----------

  clickCell(gx, gy) {
    const index = this.placed.findIndex(p => p.gx === gx && p.gy === gy);
    if (index >= 0) {
      this.placed.splice(index, 1);
    } else if (this.selectedId) {
      this.placed.push({ id: this.selectedId, gx, gy });
    }
    this.refresh();
  }

  currentDesign() {
    const old = gameState.shipDesign;
    return {
      parts: [...this.placed],
      vehicle: old ? old.vehicle : 'medium',
      orbit: old ? old.orbit : 'LEO',
      totals: this.totals,
    };
  }

  shareDesign() {
    const code = encodeDesign(this.currentDesign());
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    console.log('Ship code:', code);
    this.flash('Ship code copied!');
  }

  loadDesign() {
    const code = window.prompt('Paste a ship code:');
    if (!code) return;
    const design = decodeDesign(code);
    if (!design) { this.flash('Invalid code'); return; }
    this.placed = design.parts;
    this.refresh();
    this.flash('Ship loaded!');
  }

  tryLaunch() {
    if (this.placed.length === 0) { this.flash('Add some parts first'); return; }
    const blocking = this.warnings.find(w => BLOCKING.includes(w.type));
    if (blocking) { this.flash('Fix the red warning first'); return; }
    gameState.shipDesign = this.currentDesign();
    this.scene.start('Launch');
  }

  flash(message) {
    this.messageText.setText(message);
    this.time.delayedCall(1500, () => this.messageText.setText(''));
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
