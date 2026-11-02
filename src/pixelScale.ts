/**
 * Integer scaling in device pixels. A CSS zoom of 2 on a screen with
 * devicePixelRatio 1.25 is 2.5 device pixels per game pixel, which makes pixels
 * uneven; so we pick a whole number of device pixels per game pixel and convert
 * back to CSS units, and keep the canvas offset on the device pixel grid too.
 */
export interface PixelFit {
  /** Device pixels per game pixel (a whole number, at least 1). */
  devicePixelsPerPixel: number;
  /** CSS zoom to hand to Phaser (canvas CSS size = game size * cssZoom). */
  cssZoom: number;
  /** CSS offsets that centre the canvas, snapped to whole device pixels. */
  marginLeft: number;
  marginTop: number;
}

export function fitToWindow(
  gameWidth: number,
  gameHeight: number,
  windowWidth: number,
  windowHeight: number,
  devicePixelRatio: number,
): PixelFit {
  const deviceW = Math.floor(windowWidth * devicePixelRatio);
  const deviceH = Math.floor(windowHeight * devicePixelRatio);
  const scale = Math.max(1, Math.floor(Math.min(deviceW / gameWidth, deviceH / gameHeight)));
  const offsetX = Math.max(0, Math.floor((deviceW - gameWidth * scale) / 2));
  const offsetY = Math.max(0, Math.floor((deviceH - gameHeight * scale) / 2));
  return {
    devicePixelsPerPixel: scale,
    cssZoom: scale / devicePixelRatio,
    marginLeft: offsetX / devicePixelRatio,
    marginTop: offsetY / devicePixelRatio,
  };
}
