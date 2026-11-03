// Engine and presentation constants. Gameplay tuning (Power, costs, wounds)
// belongs in content/data/tuning.ts, not here.

/**
 * The game fills the window at a whole number of device pixels per game pixel,
 * chosen so the short side of the screen shows about this many game pixels
 * (480 x 270 on a 16:9 screen). Phones in either orientation fill the screen too.
 */
export const VIEW_SHORT_SIDE = 270;

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

// --- People moving about ---
/** People walk a little slower than Signe. */
export const PERSON_WALK_MS_PER_TILE = 340;
/** How long someone stands still between little walks, in ms (min, max). */
export const PERSON_IDLE_MS: readonly [number, number] = [3000, 9000];
/** Time between two people meeting to talk, in ms (min, max). */
export const MEETING_INTERVAL_MS: readonly [number, number] = [14000, 30000];
/** People only walk over to someone whose spot is at most this many tiles from theirs. */
export const MEETING_MAX_DISTANCE = 18;
/** How long each line of a meeting stays in its speech bubble. */
export const BUBBLE_MS_PER_LINE = 3200;
