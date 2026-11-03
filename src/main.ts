import Phaser from 'phaser';
import { BACKGROUND_COLOUR, VIEW_SHORT_SIDE } from './config';
import { fitToWindow } from './pixelScale';
import { BootScene } from './scenes/BootScene';
import { installDebugPanel } from './scenes/DebugPanel';
import { WorldScene } from './scenes/WorldScene';

function currentFit() {
  return fitToWindow(VIEW_SHORT_SIDE, window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}

const first = currentFit();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: first.gameWidth,
  height: first.gameHeight,
  backgroundColor: BACKGROUND_COLOUR,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    // We size and centre the canvas ourselves so it lands on whole device pixels.
    autoCenter: Phaser.Scale.NO_CENTER,
    zoom: first.cssZoom,
  },
  scene: [BootScene, WorldScene],
});

/** Fills the window again after a resize, rotation or browser zoom. Scenes get Phaser's resize event. */
function applyFit(): void {
  const fit = currentFit();
  if (game.scale.width !== fit.gameWidth || game.scale.height !== fit.gameHeight) game.scale.resize(fit.gameWidth, fit.gameHeight);
  if (game.scale.zoom !== fit.cssZoom) game.scale.setZoom(fit.cssZoom);
  game.canvas.style.marginLeft = `${fit.marginLeft}px`;
  game.canvas.style.marginTop = `${fit.marginTop}px`;
}

game.events.once(Phaser.Core.Events.READY, applyFit);
installDebugPanel();

if (import.meta.env.DEV) {
  // For poking at the game from the browser console during development.
  (window as unknown as { game: Phaser.Game }).game = game;
}
// Browser zoom changes devicePixelRatio and fires resize too; phones also fire orientationchange.
window.addEventListener('resize', applyFit);
window.addEventListener('orientationchange', () => setTimeout(applyFit, 150));
