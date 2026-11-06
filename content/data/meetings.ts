import type { NpcId } from './npcs';

/**
 * Pairs of people who sometimes walk over to each other and talk (Ink knot in
 * content/ink/meetings.ink). Only pairs whose spots are near each other meet.
 */
export const MEETINGS: readonly { a: NpcId; b: NpcId; knot: string }[] = [
  { a: 'ebbe', b: 'gerda', knot: 'meet_ebbe_gerda' },
  { a: 'olle', b: 'gerda', knot: 'meet_olle_gerda' },
  { a: 'ebbe', b: 'olle', knot: 'meet_ebbe_olle' },
  { a: 'lilja', b: 'torvald', knot: 'meet_lilja_torvald' },
  { a: 'lilja', b: 'gerda', knot: 'meet_lilja_gerda' },
  { a: 'ebbe', b: 'torvald', knot: 'meet_ebbe_torvald' },
  { a: 'olle', b: 'torvald', knot: 'meet_olle_torvald' },
  // Järnfors.
  { a: 'edda', b: 'brita', knot: 'meet_edda_brita' },
  { a: 'clerk', b: 'arn', knot: 'meet_clerk_arn' },
];
