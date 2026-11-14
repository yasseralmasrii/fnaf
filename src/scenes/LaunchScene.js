// src/scenes/LaunchScene.js
// OWNER: Member 2. Pick a rocket and an orbit. checkLaunch() says if the rocket can carry the ship.

import Phaser from 'phaser';
import { gameState, FAKE_SHIP_DESIGN } from '../state.js';
import vehiclesData from '../../data/vehicles.json';
import orbitsData from '../../data/orbits.json';
import { checkLaunch } from '../systems/launchCheck.js';
import { textStyle } from '../ui/font.js';

const COLUMNS = [55, 160, 265];

export default class LaunchScene extends Phaser.Scene {
  constructor() {
    super('Launch');
  }

  create() {
    if (!gameState.shipDesign) gameState.shipDesign = structuredClone(FAKE_SHIP_DESIGN);
    this.design = gameState.shipDesign;
    this.level = gameState.level;

    this.add.rectangle(160, 90, 320, 180, 0x1a1a3a);
    this.add.text(4, 4, `LAUNCH - ${this.level.planet.toUpperCase()}`, textStyle(8, '#ffd27f'));

    // Rockets
    this.add.text(4, 18, 'ROCKET', textStyle(8, '#9fe8e0'));
    this.vehicleButtons = vehiclesData.map((v, i) => {
      const b = this.choiceButton(COLUMNS[i], 34, v.id.toUpperCase(), () => {
        this.design.vehicle = v.id;
        this.refresh();
      });
      this.add.text(COLUMNS[i], 50, `${v.cost} STARS`, textStyle(8, '#e8e4d0')).setOrigin(0.5);
      return { id: v.id, box: b };
    });

    // Orbits
    this.add.text(4, 58, 'ORBIT', textStyle(8, '#9fe8e0'));
    this.orbitButtons = orbitsData.map((o, i) => {
      const b = this.choiceButton(COLUMNS[i], 74, o.id, () => {
        this.design.orbit = o.id;
        this.refresh();
      });
      return { id: o.id, box: b };
    });

    // Info texts (filled in refresh)
    this.explainText = this.add.text(4, 86, '', textStyle(8, '#e8e4d0', { wordWrap: { width: 312 }, lineSpacing: 2 }));
    this.carryText = this.add.text(4, 120, '', textStyle(8, '#e8e4d0'));
    this.costText = this.add.text(4, 132, '', textStyle(8, '#e8e4d0'));
    this.statusText = this.add.text(4, 146, '', textStyle(8, '#6fcf7f', { wordWrap: { width: 312 } }));

    this.button(50, 168, '< HANGAR', () => this.scene.start('Hangar'));
    this.button(270, 168, 'LAUNCH >', () => this.tryLaunch());

    this.refresh();
  }

  refresh() {
    // Highlight the chosen rocket and orbit
    for (const b of this.vehicleButtons) b.box.setFillStyle(b.id === this.design.vehicle ? 0x7a6a2a : 0x3b3b7a);
    for (const b of this.orbitButtons) b.box.setFillStyle(b.id === this.design.orbit ? 0x7a6a2a : 0x3b3b7a);

    const orbit = orbitsData.find(o => o.id === this.design.orbit);
    this.explainText.setText(orbit ? orbit.explain : '');

    this.result = checkLaunch(this.design, this.level);
    const r = this.result;
    const tooHeavy = this.design.totals.mass > r.capacity;
    const tooExpensive = r.totalCost > this.level.budget;

    this.carryText.setText(`CARRIES ${r.capacity} KG   SHIP ${this.design.totals.mass} KG`)
      .setColor(tooHeavy ? '#ff7a7a' : '#e8e4d0');
    this.costText.setText(`COST ${r.totalCost} / ${this.level.budget} STARS`)
      .setColor(tooExpensive ? '#ff7a7a' : '#e8e4d0');

    if (r.ok) {
      this.statusText.setColor('#6fcf7f').setText('Ready for launch!');
    } else {
      // Show only the first sentence, the numbers above show the rest.
      this.statusText.setColor('#ff7a7a').setText(r.reasons[0].split('. ')[0] + '.');
    }
  }

  tryLaunch() {
    if (!this.result.ok) {
      this.cameras.main.shake(150, 0.005);
      return;
    }
    gameState.shipDesign = this.design;
    this.scene.start('Race');
  }

  choiceButton(x, y, label, onClick) {
    const box = this.add.rectangle(x, y, 90, 16, 0x3b3b7a).setStrokeStyle(1, 0xffd27f)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, textStyle(8, '#ffffff')).setOrigin(0.5);
    box.on('pointerdown', onClick);
    return box;
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
