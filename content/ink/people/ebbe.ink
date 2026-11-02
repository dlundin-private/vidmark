// Ebbe, the net-mender. Quest: The net-mender's hands (built in step 7).
// Design: he has forgotten his craft; Craft mends the nets, or he offers
// his last memory of his wife.

=== ebbe ===
{ is_hollowed("ebbe"): -> hollowed("Ebbe") }
{ has_offered("ebbe"): -> after_offering }
{ flag("met_ebbe"):
    Ebbe: Back again.
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
* [Offer to mend the nets] Signe: Let me try. I can feel how things are made.
    Ebbe: You? {name_known(): Torvald's girl, mending nets with her hands in her lap? | A stranger's hands in my nets?}
    Ebbe: If you can, do it. The ice won't hold forever, and nobody eats if the nets stay like this.
    ~ set_flag("ebbe_asked_mend", true)
    -> talk
* {not has_offered("ebbe")} [Ask if there's another way] Signe: Is there anything else that would help?
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

= after_offering
Ebbe: The nets again.
Ebbe: Strange. I keep thinking someone used to sit with me while I worked. Can't think who.
-> END
