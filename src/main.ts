import Phaser from 'phaser';
import { BACKGROUND_COLOUR, GAME_HEIGHT, GAME_WIDTH } from './config';
import { fitToWindow } from './pixelScale';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';

function currentFit() {
  return fitToWindow(GAME_WIDTH, GAME_HEIGHT, window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOUR,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    // We centre the canvas ourselves so it lands on whole device pixels.
    autoCenter: Phaser.Scale.NO_CENTER,
    zoom: currentFit().cssZoom,
  },
  scene: [BootScene, WorldScene],
});

function applyFit(): void {
  const fit = currentFit();
  if (game.scale.zoom !== fit.cssZoom) game.scale.setZoom(fit.cssZoom);
  game.canvas.style.marginLeft = `${fit.marginLeft}px`;
  game.canvas.style.marginTop = `${fit.marginTop}px`;
}

game.events.once(Phaser.Core.Events.READY, applyFit);

if (import.meta.env.DEV) {
  // For poking at the game from the browser console during development.
  (window as unknown as { game: Phaser.Game }).game = game;
}
// Browser zoom changes devicePixelRatio and fires resize too.
window.addEventListener('resize', applyFit);
