import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import MenuScene from "./scenes/MenuScene.js";
import BriefingScene from "./scenes/BriefingScene.js";
import HangarScene from "./scenes/HangarScene.js";
import LaunchScene from "./scenes/LaunchScene.js";
import RaceScene from "./scenes/RaceScene.js";
import ReportScene from "./scenes/ReportScene.js";

// Pick the biggest WHOLE-number zoom that fits the window, counted in real screen pixels.
// A whole number keeps every game pixel the same size, so pixel art and text stay sharp.
function pickZoom() {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth * dpr / 320, window.innerHeight * dpr / 180);
  return Math.max(1, Math.floor(fit)) / dpr;
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 320,
  height: 180,
  backgroundColor: "#0b0b1e",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, zoom: pickZoom(), autoCenter: Phaser.Scale.CENTER_BOTH },
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

// Wait for the pixel font to load before starting, so all text uses it.
// If the font fails to load, start the game anyway.
document.fonts.load('8px "Press Start 2P"')
  .catch(() => console.warn("Pixel font did not load"))
  .finally(() => {
    const game = new Phaser.Game(config);
    window.addEventListener('resize', () => game.scale.setZoom(pickZoom()));
  });
