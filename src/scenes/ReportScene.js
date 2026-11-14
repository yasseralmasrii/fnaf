// src/scenes/ReportScene.js
// OWNER: Member 4. Shows the Seven Stars, the "why" report, and one "what if" tip.

import Phaser from 'phaser';
import { gameState, FAKE_SHIP_DESIGN, FAKE_RACE_RESULT } from '../state.js';
import { computeScore } from '../systems/scoring.js';
import { generateReport } from '../systems/report.js';
import { saveRun } from '../systems/leaderboard.js';
import { encodeDesign } from '../systems/designCode.js';

const STAR_LABELS = ['FIN', 'TIME', 'FUEL', 'PWR', 'SCI', 'SHIP', 'SCAN'];
const LINES_PER_PAGE = 3;

export default class ReportScene extends Phaser.Scene {
  constructor() {
    super('Report');
  }

  create() {
    // Use fake data if the race has not sent real data yet (for testing).
    const design = gameState.shipDesign || FAKE_SHIP_DESIGN;
    const result = gameState.raceResult || FAKE_RACE_RESULT;
    const level = gameState.level;

    const score = computeScore(result, level, design);
    const report = generateReport(design, result, level);

    // Save the run to the Majlis once, only if the mission was finished.
    if (result.finished && gameState.raceResult && !gameState.savedToMajlis) {
      saveRun({ name: 'Pilot', levelId: gameState.levelId, stars: score.stars,
        time: result.time, designCode: encodeDesign(design) });
      gameState.savedToMajlis = true;
    }

    // Background and title
    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(160, 10, 'MISSION REPORT', { fontSize: '10px', color: '#ffd27f' }).setOrigin(0.5);

    // Seven Stars
    const values = Object.values(score.values);
    values.forEach((value, i) => {
      const x = 40 + i * 40;
      const earned = value >= 0.6;
      this.add.star(x, 30, 5, 3, 7, earned ? 0xffd27f : 0x3b3b5a);
      this.add.text(x, 42, STAR_LABELS[i], { fontSize: '6px', color: earned ? '#ffd27f' : '#77779a' })
        .setOrigin(0.5);
    });
    this.add.text(160, 52, `${score.stars} / 7 stars`, { fontSize: '8px', color: '#e8e4d0' }).setOrigin(0.5);

    // Report lines, shown a few at a time
    this.lines = report.lines;
    this.page = 0;
    this.reportText = this.add.text(12, 62, '', {
      fontSize: '7px', color: '#e8e4d0', wordWrap: { width: 296 }, lineSpacing: 2,
    });
    this.showPage();

    // What if tip
    this.add.text(160, 140, report.whatIf, {
      fontSize: '7px', color: '#9fe8e0', wordWrap: { width: 296 }, align: 'center',
    }).setOrigin(0.5);

    // Buttons
    if (this.lines.length > LINES_PER_PAGE) {
      this.button(280, 120, 'MORE', () => this.nextPage());
    }
    this.button(70, 166, 'RETRY WITH CHANGES', () => {
      gameState.raceResult = null;
      gameState.savedToMajlis = false;
      this.scene.start('Hangar');
    });
    this.button(250, 166, 'MENU', () => {
      gameState.savedToMajlis = false;
      this.scene.start('Menu');
    });
  }

  showPage() {
    const start = this.page * LINES_PER_PAGE;
    const pageLines = this.lines.slice(start, start + LINES_PER_PAGE);
    this.reportText.setText(pageLines.map(line => '- ' + line).join('\n'));
  }

  nextPage() {
    const pages = Math.ceil(this.lines.length / LINES_PER_PAGE);
    this.page = (this.page + 1) % pages;
    this.showPage();
  }

  button(x, y, label, onClick) {
    const w = label.length * 6 + 12;
    const box = this.add.rectangle(x, y, w, 16, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
    box.on('pointerover', () => box.setFillStyle(0x5555aa));
    box.on('pointerout', () => box.setFillStyle(0x3b3b7a));
    box.on('pointerdown', onClick);
  }
}
