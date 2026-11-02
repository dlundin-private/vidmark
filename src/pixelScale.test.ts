import { describe, expect, it } from 'vitest';
import { fitToWindow } from './pixelScale';

describe('fitToWindow', () => {
  it('uses the largest whole zoom that fits at devicePixelRatio 1', () => {
    expect(fitToWindow(480, 270, 1920, 1080, 1)).toMatchObject({ devicePixelsPerPixel: 4, cssZoom: 4, marginLeft: 0, marginTop: 0 });
    expect(fitToWindow(480, 270, 1919, 1080, 1).devicePixelsPerPixel).toBe(3);
  });

  it('counts whole device pixels on fractional devicePixelRatio screens', () => {
    // 1024x768 CSS at 1.25 = 1280x960 device pixels: 2 device pixels per game pixel, not 2 CSS pixels (= 2.5).
    const fit = fitToWindow(480, 270, 1024, 768, 1.25);
    expect(fit.devicePixelsPerPixel).toBe(2);
    expect(480 * fit.cssZoom * 1.25).toBe(960);
  });

  it('keeps the centring offset on whole device pixels', () => {
    const fit = fitToWindow(480, 270, 1023, 700, 1.25);
    expect(Number.isInteger(fit.marginLeft * 1.25)).toBe(true);
    expect(Number.isInteger(fit.marginTop * 1.25)).toBe(true);
  });

  it('never goes below 1x, even in a tiny window', () => {
    expect(fitToWindow(480, 270, 300, 200, 1)).toMatchObject({ devicePixelsPerPixel: 1, marginLeft: 0, marginTop: 0 });
  });
});
