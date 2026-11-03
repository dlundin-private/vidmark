// Places worth a closer look in Järnfors (chapter 2). From the chapter 2 design
// (docs/chapter-2-jarnfors.md, "Maren's mark" and the side quests).
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

=== place_dam_statue ===
~ set_flag("read_dam_statue", true)
Saint Maren stands on the crest of the dam, one hand laid flat on the stone, as if she were holding it shut.
Cut into the plinth: SHE HELD THE WATER.
Below it, scratched long ago by someone with a mason's chisel and no hurry: with whose hands?
-> END

=== place_apprentices_hall ===
~ set_flag("read_lintel", true)
Nine marks are cut into the lintel of the apprentices' hall: one for each who learned the dam from Halvar.
The ninth has been scratched out, hard, until only the shape of the cut is left.
{ has_flag("read_doorpost") or has_offered("gerda") or remembers("gerda", "grandmother"):
    ~ set_flag("knows_ninth_apprentice", true)
    You know that shape. You saw it on a doorpost on an island in Kallsjö, low down, where the marks stopped. JON.
    Maren's brother lived. He came here, and he learned from the man she took.
- else:
    Whoever it was, someone wanted them forgotten more than the others.
}
-> END

=== place_gallery ===
~ set_flag("seen_gallery", true)
An iron door in the face of the dam, rusted half open. Beyond it a passage runs into the wall, and stops.
The roof has come down a few paces in. Water drips somewhere behind the stones, steady, patient.
Somebody has chalked on the door: KEEP OUT. And beneath, in another hand: WHY? NOBODY REMEMBERS WHAT'S IN THERE.
-> END

=== place_relief_cut ===
~ set_flag("found_relief_cut", true)
Hidden in the rock of the west wall, a channel as wide as a cart runs down from the dam, lined in the same grey stone.
At its head it is sealed: a plug of great blocks, mortared tight, with a single letter cut into the top one. H.
Somebody built a way to let the lake out slowly. Somebody else made sure it could never be used.
-> END

=== place_hollow_house ===
~ set_flag("seen_hollow_house", true)
Through the open door: two long rows of cots, and on them people who look at nothing. Someone is humming while she works.
Up above, at a narrow window, an old woman's hands hold a bowl and a spoon.
-> END

=== place_tithe_house ===
~ set_flag("seen_tithe_house", true)
The Tithe-house has bars on the lower windows and a slate by the door: the names of those who wait for the next sled north.
It has been wiped clean, recently. You can still see where the chalk was.
{ has_flag("why_you_left_for"):
    Somewhere under the smears there might have been a name you know.
}
-> END
