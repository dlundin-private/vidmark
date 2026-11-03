// Places Signe can look at closely (the map object's "inspect" property names
// the knot). Each one teaches her something; the journal map records it.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

=== place_statue ===
{ has_flag("maren_winter_part") and not has_flag("played_maren"): -> marens_winter_play }
~ set_flag("read_statue", true)
Saint Maren looks out over the lake, hands open. The stone is worn smooth where people touch it in passing.
Cut into the plinth: SHE CARRIED US.
Underneath, scratched with a knife by someone who didn't want to be seen doing it: and what did she carry?
-> END

// Maren's Winter: Signe plays young Maren in the village play.
=== marens_winter_play ===
~ set_flag("played_maren", true)
~ set_flag("read_statue", true)
The village gathers at the statue with torches. Old Gerda reads the saint's part aloud in a creaking voice, and you walk it.
Old Gerda: And the lake was starving, and the children were starving, and young Maren walked out onto the ice.
Old Gerda: And she asked for nothing, and she gave up nothing, and the ice opened its hands and the fish came up to her of their own accord.
Everyone claps. Someone hands you a fish made of straw.
{ has_keepsake("story"):
    ~ set_flag("noticed_play_differs", true)
    But in Father's story she gives something up. Something dear to her. Every time he tells it.
    Here, nobody gives up anything at all.
- else:
    It's a nice play. You can't think why anyone would tell it differently.
}
{ has_flag("read_doorpost"):
    And in the play, she has no brother.
}
-> END

=== place_maren_home ===
~ set_flag("read_doorpost", true)
Most of the house is gone. The doorpost still stands, grey and split.
Two sets of marks are cut into it, one above the other, each with a name. MAREN, and lower down, JON.
Maren's marks climb almost to the lintel. Jon's stop, a hand's width up, and never go higher.
{ has_keepsake("story"):
    In your father's story the saint has no brother. You go over it twice to be sure.
}
-> END

=== place_tithe_sled ===
{ has_flag("tithe_sled_mended"):
    ~ set_flag("read_ledger", true)
    With the boards whole again, the ledger slides out: a Tithe book, its leather swollen with damp.
    Every family in Kallsjö, in a neat hand. Beside each name, what was taken. "Net-mending." "Reading the ice." "Salting." "Her mother's face."
    One family's name is inked out. Beside it, in the same neat hand: "Could not pay. Paid in full: one, whole."
    On the last page, your family. Beside Lilja's name there is nothing written yet. Only a mark, like a question.
- else:
    The sled lies on its side by the road, its boards stove in. Something papery is wedged under the wreck, out of reach.
    If the sled were whole, it would come free.
}
-> END

=== place_cairn ===
~ set_flag("read_cairn", true)
Travellers' stones, heaped higher than you are. Every one has something scratched on it.
Names. Dozens of them, some fresh, some worn to nothing.
These are people the Tithe took to Kronvall whole, when a village couldn't pay. A few of the names you know from the village.
-> END

=== place_shelter ===
{ has_flag("shelter_mended"):
    The shelter is dry inside, and the door holds. You could rest here.
- else:
    The last roof in the empty village. Its door is stove in, and snow has drifted halfway across the floor.
    Mended, it would keep the cold out for a night.
}
-> END
