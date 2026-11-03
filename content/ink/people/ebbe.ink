// Ebbe, the net-mender. Quest: The net-mender's hands (built in step 7).
// Design: he has forgotten his craft; Craft mends the nets, or he offers
// his last memory of his wife.

=== function all_nets() ===
~ return flag("nets_mended") and (flag("nets_mended") >= flag("nets_total"))

=== ebbe ===
{ is_hollowed("ebbe"): -> hollowed("Ebbe") }
{ flag("hurt_by_trap_ebbe"): Ebbe: Someone's been at the ice by the shore. Went through to my waist. Ice doesn't open like that by itself. }
{ flag("nets_mended") and (flag("ebbe_seen_mended") < flag("nets_mended")): -> sees_mended }
{ (all_nets() or has_offered("ebbe")) and not flag("weaves_taught"): -> teach_weaves }
{ has_offered("ebbe"): -> after_offering }
{ flag("met_ebbe"):
    { flag("nets_mended"):
        Ebbe: {all_nets(): The nets are holding. I keep checking them anyway. | Back again. One of them's whole, at least.}
    - else:
        Ebbe: Back again.
    }
- else:
    ~ set_flag("met_ebbe", true)
    A heap of torn nets lies across Ebbe's knees. His hands hold a needle as if it belonged to someone else.
    Ebbe: Forty winters I've mended nets on this shore. Ask anyone.
    Ebbe: And this morning I sat down and my hands had nothing in them. Not the knot. Not the first pass. Nothing.
}
-> talk

= talk
* [Ask what happened] Signe: What happened to you?
    Ebbe: The Tithe. Reeve Olle's people took what they always take. This year they took more.
    Ebbe: They don't tell you which part of you it was. You find out when you reach for it.
    -> talk
* {not all_nets()} [Offer to mend the nets] Signe: Let me try. I can feel how things are made.
    Ebbe: You? {name_known(): Torvald's girl, mending nets with her hands in her lap? | A stranger's hands in my nets?}
    Ebbe: If you can, do it. The ice won't hold forever, and nobody eats if the nets stay like this.
    ~ set_flag("ebbe_asked_mend", true)
    -> talk
* {not has_offered("ebbe") and not all_nets()} [Ask if there's another way] Signe: Is there anything else that would help?
    Ebbe looks at the needle for a long time.
    Ebbe: There's one thing they didn't take. My wife, on the jetty, the first spring. Her laughing at how bad my knots were.
    Ebbe: It's the last thing of her I have. If it's worth anything to you, I'd give it. Better it's worth something than nothing.
    ** [Accept his memory] Signe: I'll keep it safe.
        ~ offer("ebbe")
        He closes his eyes. When he opens them, he looks puzzled, as if he walked into a room and forgot why.
        Ebbe: There. Done. I think.
        -> END
    ** [Refuse] Signe: Keep it. It's yours.
        Ebbe: Then the nets stay torn.
        -> talk
+ [Leave] -> END

// Signe has mended one or both of his net racks since he last saw them.
= sees_mended
~ set_flag("ebbe_seen_mended", flag("nets_mended"))
{ flag("met_ebbe"):
    Ebbe is turning a net over in his hands, finding each knot with his thumbs.
- else:
    ~ set_flag("met_ebbe", true)
    Ebbe sits by his net racks, turning a net over in his hands, finding each knot with his thumbs.
}
{ all_nets():
    Ebbe: All of them. Every net on the racks, whole.
- else:
    Ebbe: Somebody's mended one of my nets. The other's still in rags.
}
Ebbe: Tight, even knots. I used to tie them like that. I think.
* [Tell him you did it] Signe: It was me. I could feel how they were made.
    Ebbe: You? {name_known(): Torvald's girl.}
    He looks at your hands for a long moment, then at his own.
    { all_nets():
        Ebbe: Then the village eats this winter. I owe you for that, and I don't forget what I owe.
        Ebbe: Not yet, anyway.
        ~ set_flag("ebbe_knows_signe_mended", true)
        -> teach_weaves
    - else:
        Ebbe: Then do the other, if you can. The ice won't wait.
    }
    ~ set_flag("ebbe_knows_signe_mended", true)
    -> talk
* [Say nothing about it] Signe: They look good.
    Ebbe: They do. Strange. Like my hands remembered, for one night.
    -> talk

// Ebbe's quest is done: he passes on the one thing about craft he still has.
// Unlocks Weave crafting (the HUD reads the flag).
= teach_weaves
~ set_flag("weaves_taught", true)
Ebbe: One more thing, before you go.
Ebbe: My father used to say a net is made before the fish comes. You don't mend it with the fish thrashing in it.
Ebbe: Whatever it is you do with your hands, I'd wager the same holds. Shape it by the fire. Have it ready when the ice cracks.
You understand him better than he knows. Your Craft can be shaped ahead of time, and carried ready.
(You can now craft Weaves.)
-> END

= after_offering
Ebbe: The nets again.
Ebbe: Strange. I keep thinking someone used to sit with me while I worked. Can't think who.
-> END
