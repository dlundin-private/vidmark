// Tuning values for Power, costs, wounds and Craft. All are starting values to
// tune through play, not final (docs/design.md, "Vertical slice: core mechanics").
// The in-game debug panel can override any of them live; see src/systems/tuning.ts.

export const DEFAULT_TUNING = {
  /** Max Power before any Offering. Not in the design doc; a starting guess so Signe can use Craft at all. */
  basePower: 2,
  /** Max Power each Offering adds (design: 1). */
  powerPerOffering: 1,
  /** One-time Power reserve from hollowing someone (design: "for example 5"; Daniel: a much bigger first taste). */
  hollowingReserve: 10,
  /** Each Echo carried crowds out the Hearth: a rest refills this much less Power per Echo (Daniel: the hunger). */
  restPenaltyPerEcho: 1,

  /** One-time Power reserve from burning each Keepsake. Painful ones pay more (design: "Pain pays best"). */
  burnSwim: 4,
  burnCoat: 3,
  burnStory: 3,
  burnShame: 6,
  burnWhyYouLeft: 5,
  burnName: 6,

  /** At or below this much Power, an Echo points out who is close and full of memories. */
  hungerAtPower: 1,

  /** Signe falls at this many wounds (design: "about three"). */
  maxWounds: 3,
  /** Wounds healed by one rest (design: wounds heal "with time"). */
  woundsHealedByRest: 1,
  /** Wounds from breaking through the ice. */
  woundsFromBreakingThrough: 1,

  // --- Craft (design: "Craft domain (slice abilities)") ---
  /** Power cost of Strengthen, Weaken and Mend (design: 1 each). */
  strengthenCost: 1,
  weakenCost: 1,
  mendCost: 1,
  /** Push costs 1 Power per this many tiles moved (design: "1 per 2 tiles"). */
  pushTilesPerPower: 2,
  /** How far away, in tiles, Signe can reach with Craft. */
  craftRange: 3,
  /** Reach with the Range modifier. */
  craftRangeExtended: 8,
  /** Extra Power for a Weave that targets an area instead of one thing. */
  areaTargetCost: 1,
  /** Extra Power for each Weave modifier. */
  modifierCost: 1,
  /** Weaves using a trained action cost this much less per level above 1 (never below 1). */
  trainedDiscountPerLevel: 1,
  /** Rests a Craft effect lasts: it fades at the next rest. */
  effectRests: 1,
  /** Extra rests the Duration modifier adds. */
  durationExtraRests: 1,
  /** Rests before broken ice freezes over again. */
  iceRefreezeRests: 1,
  /** Tiles around her that Signe takes in, and can sketch when she stops. */
  sightRadius: 8,
  /** Steps she can walk without stopping and still remember to sketch; earlier ones are lost. */
  sketchMemorySteps: 45,
  /** Weaves Signe can carry ready at once; the rest she knows but must refocus at home to use. */
  weaveSlots: 3,
  /** Distinct things a skill must be used on to reach level 2 and level 3. */
  skillLevel2At: 3,
  skillLevel3At: 7,

  // --- Combat (design: "Combat: turn-based on the isometric grid") ---
  /** Actions Signe gets each turn: move, use an ability, or interact (design: two). */
  combatActions: 2,
  /** Tiles one move action takes her. */
  combatMoveTiles: 3,
  /** Starving wolves on the ice road. */
  wolfCount: 3,
  /** Tiles a wolf runs in one turn. */
  wolfMoveTiles: 3,
  /** Hits (a pushed crate, a marker) before a wolf runs off. */
  wolfHitsToFlee: 2,
  /** Wounds from one bite. */
  wolfBiteWounds: 1,
  /** One-time reserve from hollowing a wolf: a smaller life than a person's (decided by Daniel). */
  wolfHollowingReserve: 2,
};

export type Tuning = typeof DEFAULT_TUNING;
export type TuningKey = keyof Tuning;

/** Short explanations shown next to each value in the debug panel. */
export const TUNING_LABELS: Record<TuningKey, string> = {
  basePower: 'Max Power with no Offerings',
  powerPerOffering: 'Max Power per Offering',
  hollowingReserve: 'Reserve from one hollowing',
  restPenaltyPerEcho: 'Power a rest refills less, per Echo',
  burnSwim: 'Burn: the swim',
  burnCoat: 'Burn: the coat',
  burnStory: 'Burn: the story',
  burnShame: 'Burn: the shame',
  burnWhyYouLeft: 'Burn: why you left',
  burnName: 'Burn: your name',
  hungerAtPower: 'Echoes murmur at or below this Power',
  maxWounds: 'Wounds before Signe falls',
  woundsHealedByRest: 'Wounds healed per rest',
  woundsFromBreakingThrough: 'Wounds from breaking through ice',
  strengthenCost: 'Strengthen cost',
  weakenCost: 'Weaken cost',
  mendCost: 'Mend cost',
  pushTilesPerPower: 'Push: tiles per Power',
  craftRange: 'Craft reach (tiles)',
  craftRangeExtended: 'Reach with Range modifier',
  areaTargetCost: 'Weave: extra cost for area',
  modifierCost: 'Weave: cost per modifier',
  trainedDiscountPerLevel: 'Weave discount per trained level',
  effectRests: 'Rests an effect lasts',
  durationExtraRests: 'Extra rests from Duration',
  iceRefreezeRests: 'Rests until broken ice refreezes',
  sightRadius: 'Map: tiles she takes in around her',
  sketchMemorySteps: 'Map: steps remembered between stops',
  weaveSlots: 'Weaves carried at once',
  skillLevel2At: 'Uses to reach skill level 2',
  skillLevel3At: 'Uses to reach skill level 3',
  combatActions: 'Fight: actions per turn',
  combatMoveTiles: 'Fight: tiles per move',
  wolfCount: 'Fight: wolves in the pack',
  wolfMoveTiles: 'Fight: tiles a wolf runs',
  wolfHitsToFlee: 'Fight: hits before a wolf flees',
  wolfBiteWounds: 'Fight: wounds per bite',
  wolfHollowingReserve: 'Reserve from hollowing a wolf',
};
