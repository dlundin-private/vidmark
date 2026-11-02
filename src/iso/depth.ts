import type { Footprint } from './types';

/**
 * Depth sorting by tile footprint.
 *
 * A single "x + y" key per sprite breaks for multi-tile objects: walking along
 * the long side of a 3 x 2 boathouse gives the wrong order on one of the sides.
 * Instead we compare footprints pairwise. Two non-overlapping rectangles on the
 * grid are always separated along at least one axis, and the one on the lower
 * side of that axis is further back. That gives a partial order, which we
 * turn into draw order with a topological sort.
 *
 * Sprites must stay inside their footprint's screen column (no overhangs); then
 * two footprints separated along both axes in opposite directions never overlap
 * on screen, and either order draws the same picture.
 */

/** -1 if a is drawn before (behind) b, 1 if after, 0 if their order doesn't matter. */
export function compareFootprints(a: Footprint, b: Footprint): number {
  if (a.x + a.w <= b.x) return -1;
  if (b.x + b.w <= a.x) return 1;
  if (a.y + a.h <= b.y) return -1;
  if (b.y + b.h <= a.y) return 1;
  // Overlapping footprints should not happen on a valid map; fall back to the front corner.
  return a.x + a.w + a.y + a.h - (b.x + b.w + b.y + b.h);
}

/** Bounding footprint of two footprints, e.g. the tile a character leaves and the one it enters. */
export function unionFootprint(a: Footprint, b: Footprint): Footprint {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

/** Back-to-front tie-breaker key, used for unrelated pairs and to keep the sort deterministic. */
function frontKey(f: Footprint): number {
  return f.x + f.w + f.y + f.h;
}

/**
 * Returns the indices of `footprints` in draw order (back to front).
 * O(n^2), which is fine for the few dozen sprites on a screen.
 */
export function depthOrder(footprints: readonly Footprint[]): number[] {
  const n = footprints.length;
  const inDegree = new Array<number>(n).fill(0);
  const after: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const c = compareFootprints(footprints[i]!, footprints[j]!);
      if (c < 0) {
        after[i]!.push(j);
        inDegree[j]!++;
      } else if (c > 0) {
        after[j]!.push(i);
        inDegree[i]!++;
      }
    }
  }

  const byKey = (a: number, b: number) => frontKey(footprints[a]!) - frontKey(footprints[b]!) || a - b;
  const ready: number[] = [];
  for (let i = 0; i < n; i++) if (inDegree[i] === 0) ready.push(i);
  const order: number[] = [];
  const done = new Array<boolean>(n).fill(false);

  while (order.length < n) {
    if (ready.length === 0) {
      // A cycle (only possible with overlapping footprints): release the most-back remaining item.
      const rest: number[] = [];
      for (let i = 0; i < n; i++) if (!done[i]) rest.push(i);
      rest.sort(byKey);
      ready.push(rest[0]!);
    }
    ready.sort(byKey);
    const next = ready.shift()!;
    if (done[next]) continue;
    done[next] = true;
    order.push(next);
    for (const k of after[next]!) {
      if (--inDegree[k]! === 0 && !done[k]) ready.push(k);
    }
  }
  return order;
}
