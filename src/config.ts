// Engine and presentation constants. Gameplay tuning (Power, costs, wounds)
// belongs in content/data/tuning.ts, not here.

/** Fixed internal resolution; the canvas is scaled up by whole numbers only. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Isometric tile size in pixels (matches the Tiled maps). */
export const TILE_WIDTH = 32;
export const TILE_HEIGHT = 16;

/** Time to walk from one tile to the next. */
export const WALK_MS_PER_TILE = 220;

/**
 * Visible steps per tile while walking. TILE_HEIGHT / 2 makes every step move
 * exactly 2 px sideways and 1 px vertically on screen, so diagonal movement
 * stays on clean 2:1 pixel lines.
 */
export const WALK_STEPS_PER_TILE = TILE_HEIGHT / 2;

/** Extra world space above the map so tall objects on the back row stay inside the camera bounds. */
export const WORLD_TOP_MARGIN = 64;

export const BACKGROUND_COLOUR = '#0b0d10';
