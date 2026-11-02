// Tuning values for Power, costs and wounds. All are starting values to tune
// through play, not final (docs/design.md, "Vertical slice: core mechanics").
// The in-game debug panel can override any of them live; see src/systems/tuning.ts.

export const DEFAULT_TUNING = {
  /** Max Power before any Offering. Not in the design doc; a starting guess so Signe can use Craft at all. */
  basePower: 2,
  /** Max Power each Offering adds (design: 1). */
  powerPerOffering: 1,
  /** One-time Power reserve from hollowing someone (design: "for example 5"). */
  hollowingReserve: 5,

  /** One-time Power reserve from burning each Keepsake. Painful ones pay more (design: "Pain pays best"). */
  burnSwim: 4,
  burnCoat: 3,
  burnStory: 3,
  burnShame: 6,
  burnWhyYouLeft: 5,
  burnName: 6,

  /** Signe falls at this many wounds (design: "about three"). */
  maxWounds: 3,
};

export type Tuning = typeof DEFAULT_TUNING;
export type TuningKey = keyof Tuning;

/** Short explanations shown next to each value in the debug panel. */
export const TUNING_LABELS: Record<TuningKey, string> = {
  basePower: 'Max Power with no Offerings',
  powerPerOffering: 'Max Power per Offering',
  hollowingReserve: 'Reserve from one hollowing',
  burnSwim: 'Burn: the swim',
  burnCoat: 'Burn: the coat',
  burnStory: 'Burn: the story',
  burnShame: 'Burn: the shame',
  burnWhyYouLeft: 'Burn: why you left',
  burnName: 'Burn: your name',
  maxWounds: 'Wounds before Signe falls',
};
