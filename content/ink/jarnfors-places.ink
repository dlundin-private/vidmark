// Places worth a closer look in Järnfors (chapter 2). From the chapter 2 design
// (docs/chapter-2-jarnfors.md, "Maren's mark" and the side quests).
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

=== place_dam_statue ===
~ set_flag("read_dam_statue", true)
Saint Maren stands on the crest of the dam, one hand laid flat on the stone, as if she were holding it shut.
Cut into the plinth: SHE HELD THE WATER.
Below it, scratched long ago by someone with a mason's chisel and no hurry: with whose hands?
{ flag("quest_britas-bowl") == "truth":
    And beside her name, fresh, the chisel marks still pale: HALVAR. HE SAID IT WAS TOO HIGH.
}
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
{ has_flag("gallery_mended"):
    The gallery runs into the wall, its roof whole again. Inside, the dam talks: water in the drains, running here, choked there, a slow tick of seepage.
    Anyone who knew how to listen could read the whole wall from in here.
- else:
    An iron door in the face of the dam, rusted half open. Beyond it a passage runs into the wall, and stops.
    The roof has come down a few paces in. Water drips somewhere behind the stones, steady, patient.
    Somebody has chalked on the door: KEEP OUT. And beneath, in another hand: WHY? NOBODY REMEMBERS WHAT'S IN THERE.
}
-> END

=== place_relief_cut ===
~ set_flag("found_relief_cut", true)
Hidden in the rock of the west wall, a channel as wide as a cart runs down from the dam, lined in the same grey stone.
At its head it is sealed: a plug of great blocks, mortared tight, with a single letter cut into the top one. H.
Somebody built a way to let the lake out slowly. Somebody else made sure it could never be used.
{ dam_rests() > 0:
    { has_flag("plug_weakened") and has_flag("cut_walls_strengthened") and has_flag("cut_carts_cleared"):
        The plug is brittle now, the carts are clear of the channel, and the walls at its mouth are hard as the dam itself.
        One push, and the lake goes out this way instead of through the city. The lower quarter is at the bottom of the cut.
        * [Open the cut] You put your hand to the H and push.
            ~ dam_save("relief", "", "")
            The plug goes all at once. The lake comes down the cut like a held breath let out, roaring, and does not stop.
            Far below, in the lower quarter, someone starts shouting, and then everyone.
            -> END
        * [Not yet] -> END
    - else:
        To let the lake out this way: weaken the plug, clear the carts left in the channel, and strengthen the walls at its mouth.
        { has_flag("plug_weakened"): The plug is weak. }
        { has_flag("cut_carts_cleared"): The carts are clear. }
        { has_flag("cut_walls_strengthened"): The walls are strengthened. }
    }
}
-> END

=== place_hollow_house ===
~ set_flag("seen_hollow_house", true)
Through the open door: two long rows of cots, and on them people who look at nothing. Someone is humming while she works.
Up above, at a narrow window, an old woman's hands hold a bowl and a spoon.
-> END

=== place_drawing_table ===
{ has_flag("drawing_table_mended"):
    ~ set_flag("read_drawing_table", true)
    Halvar's drawing table, whole again. Under the top, where only someone lying on the floor would see it, he cut letters into the wood:
    TOO HIGH. I TOLD THEM TOO HIGH. THE ICE WILL FIND IT. — H.
    Below, smaller, in a hand that shook: they will need someone. it will not be me.
- else:
    A builder's drawing table, left out by the hall, its top split and wedged down hard. Something is cut into the underside; the boards won't let you see.
}
-> END

=== place_tally_sticks ===
~ set_flag("read_tally", true)
In the chest, bundles of notched sticks, each one tied with a scrap of cloth and a name: the apprentices' tallies.
Every drain in the dam, every spring for a hundred years, notched by hand. Most stop a few years ago, when the Tithe took the keeping.
One is cut deeper than the rest, with an H on it, and a word: SEALED. BY ORDER.
-> END

=== place_dam_crack ===
A crack has opened across the crest, wide enough for a hand. Water breathes up through it, black and cold, and the whole wall hums.
The flood-bell is ringing down in the city. {dam_rests() == 1: One more night. That's all it has. | {dam_rests()} more nights, the masons say. Maybe.}
{ has_domain("kin"):
    You can feel it the way you feel a hurt body: where it is tearing, where it still holds.
}
* {has_domain("kin") and power() >= dam_cost("knit")} [Knit the stone: Kin and Craft together ({dam_cost("knit")} Power)] -> knit
* {has_domain("kin") and power() < dam_cost("knit")} [Knit the stone (you need {dam_cost("knit")} Power)] -> crack_short
* {has_flag("keeping_in_signe") and power() >= dam_cost("taken")} [Hold it with what you took from Gudmund ({dam_cost("taken")} Power)] -> taken
* {power() >= dam_cost("held")} [Hold it with everything you have ({dam_cost("held")} Power)] -> held
* {power() < dam_cost("held")} [Hold it with everything you have (you need {dam_cost("held")} Power)] -> crack_short
* [Leave it] -> END

= crack_short
You don't have that much in you. Not yet. You could burn something. You could take something.
-> END

= knit
{ helpers_line() }
To mend stone the way you would mend a body, it has to be anchored in something of yours, or it will not last the winter.
* {has_offered("edda")} [Anchor it in what Edda gave you] -> do_knit("offering", "edda")
* {has_offered("brita")} [Anchor it in what Brita gave you] -> do_knit("offering", "brita")
* {has_offered("gudmund")} [Anchor it in what Gudmund gave you] -> do_knit("offering", "gudmund")
* {has_keepsake("swim")} [Anchor it in the swim] -> do_knit("keepsake", "swim")
* {has_keepsake("coat")} [Anchor it in the coat] -> do_knit("keepsake", "coat")
* {has_keepsake("story")} [Anchor it in the story] -> do_knit("keepsake", "story")
* {has_keepsake("shame")} [Anchor it in the shame] -> do_knit("keepsake", "shame")
* {has_keepsake("whyYouLeft")} [Anchor it in why you left] -> do_knit("keepsake", "whyYouLeft")
* {carries_echoes()} [Anchor it in an Echo you carry] -> do_knit("echo", "")
* [Not yet] -> END

= do_knit(kind, id)
{ dam_save("knit", kind, id):
    You lay both hands on the stone and feel it the way Edda feels a sleeper: where it hurts, where it holds. Then you mend it as you would mend a sheet. Stitch by stitch.
    The crack closes. The stone around it is a shade paler, like a scar.
    The bell stops ringing.
- else:
    It slips away from you. Not enough.
}
-> END

= taken
{ dam_save("taken", "", ""):
    Gudmund's keeping knows this wall better than you know your own hands. You let it tell you where to press, and how hard, and for how long.
    The crack groans shut. In the gallery below, someone shouts that the drains are running again.
    The bell stops ringing.
}
-> END

= held
{ dam_save("held", "", ""):
    You put everything you have into the stone, raw, the way you first held the ice at home. It isn't skill. It's weight.
    The crack shuts, slowly, grinding. When it's done you can't feel your hands.
    The bell stops ringing.
}
-> END

=== function helpers_line() ===
{ has_offered("edda") or has_offered("brita") or has_offered("gudmund") or has_offered("clerk"):
    ~ return "The people who gave you something here come up the stairs one by one and stand with you on the crest. It is easier, with them."
}
~ return "You are alone on the crest."

=== place_tithe_house ===
~ set_flag("seen_tithe_house", true)
The Tithe-house has bars on the lower windows and a slate by the door: the names of those who wait for the next sled north.
It has been wiped clean, recently. You can still see where the chalk was.
{ has_flag("why_you_left_for"):
    Somewhere under the smears there might have been a name you know.
}
{ has_flag("arn_safe") or is_hollowed("clerk"):
    ~ set_flag("read_edda_debt", true)
    With nobody in the door, you see the ledger open on its stand. One page has a name you know: EDDA, THE HOLLOW-HOUSE.
    Twenty winters of entries. Her household's Tithe, paid each year in her own memories, because a Hollow can't pay.
    She has less left to give than anyone in this city.
}
-> END
