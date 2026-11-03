import { describe, expect, it } from 'vitest';
import { fitToWindow } from './pixelScale';

describe('fitToWindow', () => {
  it('shows about 270 game pixels on the short side of a 1080p screen, filling it', () => {
    expect(fitToWindow(270, 1920, 1080, 1)).toMatchObject({ devicePixelsPerPixel: 4, gameWidth: 480, gameHeight: 270, marginLeft: 0, marginTop: 0 });
  });

  it('fills a phone held sideways: the wide side shows more world', () => {
    // iPhone-sized: 812 x 375 CSS at devicePixelRatio 3 = 2436 x 1125 device pixels.
    const fit = fitToWindow(270, 812, 375, 3);
    expect(fit.devicePixelsPerPixel).toBe(4);
    expect([fit.gameWidth, fit.gameHeight]).toEqual([609, 281]);
  });

  it('fills a phone held upright: the tall side shows more world', () => {
    const fit = fitToWindow(270, 375, 812, 3);
    expect([fit.gameWidth, fit.gameHeight]).toEqual([281, 609]);
  });

  it('counts whole device pixels on fractional devicePixelRatio screens', () => {
    const fit = fitToWindow(270, 1024, 768, 1.25);
    expect(Number.isInteger(fit.devicePixelsPerPixel)).toBe(true);
    expect(fit.gameWidth * fit.cssZoom * 1.25).toBeCloseTo(fit.gameWidth * fit.devicePixelsPerPixel);
    expect(Number.isInteger(fit.marginLeft * 1.25)).toBe(true);
    expect(Number.isInteger(fit.marginTop * 1.25)).toBe(true);
  });

  it('never goes below 1x, even in a tiny window', () => {
    expect(fitToWindow(270, 200, 150, 1)).toMatchObject({ devicePixelsPerPixel: 1, gameWidth: 200, gameHeight: 150 });
  });
});
