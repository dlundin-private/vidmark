// The game's chapters (docs/design.md, "Chapters"). Only chapter 1 is built;
// the rest are named so saves can already say where a player is, and what
// each finished chapter decided (src/systems/chapters.ts).

export interface ChapterDef {
  number: number;
  id: string;
  title: string;
  region: string;
  /** Built and playable. Chapter 2 is drafted in docs/chapter-2-jarnfors.md and being built. */
  playable: boolean;
  /** The map the chapter is played on (src/systems/maps.ts). */
  map: string;
  /** One line for the card that opens it. */
  card: string;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { number: 1, id: 'kallsjo', title: 'Kallsjö', region: 'Kallsjö', playable: true, map: 'kallsjo', card: 'A frozen lake, a hungry village, and the Tithe.' },
  { number: 2, id: 'jarnfors', title: 'Järnfors', region: 'Järnfors', playable: true, map: 'jarnfors', card: 'The road north goes to Järnfors, and the great dam.' },
  { number: 3, id: 'runhem', title: 'Runhem', region: 'Runhem', playable: false, map: 'jarnfors', card: 'Runhem, the region of storytellers and keepers of thought.' },
];

export function chapterDef(n: number): ChapterDef {
  return CHAPTERS.find((c) => c.number === n) ?? CHAPTERS[CHAPTERS.length - 1]!;
}
