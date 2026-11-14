// src/scenes/RaceScene.js
// OWNER: Member 3. The race: fly the ship you built to the finish line.
// Movement and drawing are here. Power, fuel, science and the report data are in raceTracker.js.

import Phaser from 'phaser';
import { gameState, FAKE_SHIP_DESIGN } from '../state.js';
import partsData from '../../data/parts.json';
import eventsData from '../../data/events.json';
import { createRaceTracker } from '../systems/raceTracker.js';
import { textStyle } from '../ui/font.js';

const COURSE_LENGTH = 3000;   // pixels from start to finish
const FINISH_X = 2900;
const CELL = 8;               // each ship part is drawn 8x8 in the race
const MAX_SPEED = 1.4;        // pixels per physics step
const FUEL_PER_SECOND = 1;    // fuel used per second of thrust
const STEER_FUEL = 0.5;       // fuel used per second of steering up/down
const SCAN_RANGE = 120;       // scanner shows fakes this close (pixels)
const RELAYS = [900, 1700, 2500]; // x positions of data relays (for the Comms role)
const RELAY_RANGE = 60;       // how close the ship must be to send data

const CATEGORY_COLORS = {
  structure: 0x8a8a9a, power: 0xffd27f, propulsion: 0xff7a59,
  control: 0x9fe8e0, comms: 0x7fb2ff, science: 0xc58aff, defense: 0x6fcf7f,
};

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super('Race');
  }

  create() {
    this.design = gameState.shipDesign || structuredClone(FAKE_SHIP_DESIGN);
    this.level = gameState.level;
    this.tracker = createRaceTracker(this.level, this.design);
    this.ended = false;
    this.stillTime = 0;
    this.flareActive = false;

    // Team roles. Roles without a player are done automatically.
    const players = gameState.players || 1;
    this.roles = {
      scanner: players >= 2,   // player 2 holds S to scan
      engineer: players >= 3,  // player 3 presses E to switch instruments on/off
      comms: players >= 4,     // player 4 presses C at relays to send data
    };
    this.instrumentsOn = true;
    this.relaysUsed = new Set();

    // World and camera
    this.cameras.main.setBackgroundColor(0x0b0b1e);
    this.matter.world.setBounds(0, 0, COURSE_LENGTH, 180);
    this.cameras.main.setBounds(0, 0, COURSE_LENGTH, 180);
    this.drawBackground();

    this.buildShip();
