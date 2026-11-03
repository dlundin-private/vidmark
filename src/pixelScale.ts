/**
 * Fills the window at a whole number of device pixels per game pixel.
 *
 * The scale is picked so the window's short side shows about `shortSide`
 * game pixels; the long side shows as much world as fits. So the game fills
 * any screen in either orientation, and pixels stay sharp: a CSS zoom of 2 on
 * a screen with devicePixelRatio 1.25 would be 2.5 device pixels per game
 * pixel, so we count in device pixels and convert back to CSS units.
 */
export interface PixelFit {
  /** Device pixels per game pixel (a whole number, at least 1). */
  devicePixelsPerPixel: number;
  /** Game size in game pixels: what the camera shows. */
  gameWidth: number;
  gameHeight: number;
  /** CSS zoom to hand to Phaser (canvas CSS size = game size * cssZoom). */
  cssZoom: number;
  /** CSS offsets that centre the canvas, snapped to whole device pixels. */
  marginLeft: number;
  marginTop: number;
}

export function fitToWindow(shortSide: number, windowWidth: number, windowHeight: number, devicePixelRatio: number): PixelFit {
  const deviceW = Math.floor(windowWidth * devicePixelRatio);
  const deviceH = Math.floor(windowHeight * devicePixelRatio);
  const scale = Math.max(1, Math.round(Math.min(deviceW, deviceH) / shortSide));
  const gameWidth = Math.max(1, Math.floor(deviceW / scale));
  const gameHeight = Math.max(1, Math.floor(deviceH / scale));
  const offsetX = Math.floor((deviceW - gameWidth * scale) / 2);
  const offsetY = Math.floor((deviceH - gameHeight * scale) / 2);
  return {
    devicePixelsPerPixel: scale,
    gameWidth,
    gameHeight,
    cssZoom: scale / devicePixelRatio,
    marginLeft: offsetX / devicePixelRatio,
    marginTop: offsetY / devicePixelRatio,
  };
}
