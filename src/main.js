import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import MenuScene from "./scenes/MenuScene.js";
import BriefingScene from "./scenes/BriefingScene.js";
import HangarScene from "./scenes/HangarScene.js";
import LaunchScene from "./scenes/LaunchScene.js";
import RaceScene from "./scenes/RaceScene.js";
import ReportScene from "./scenes/ReportScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 320,
  height: 180,
  backgroundColor: "#0b0b1e",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "matter", matter: { gravity: { y: 0 }, debug: false } },
  scene: [
    BootScene,
    MenuScene,
    BriefingScene,
    HangarScene,
    LaunchScene,
    RaceScene,
    ReportScene,
  ],
};

new Phaser.Game(config);
