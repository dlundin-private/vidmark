// Torvald, Signe's father, a fisherman. He tells the bedtime story
// (Signe's Keepsake "the story", a garbled history of the predecessor).

=== torvald ===
{ is_hollowed("torvald"): -> hollowed("Torvald") }
Torvald: {name_known(): There's my girl. | There you are.}
-> talk

= talk
* [Ask for the old story] Signe: Tell it again. The old one.
    { has_keepsake("story"):
        He laughs and starts it anyway: the saint, the starving lake, the miracle on the ice.
        You know every word a moment before he says it.
    - else:
        He laughs and starts a story about a saint and a starving lake.
        You've never heard it before. You listen politely, and you can't tell why his voice catches near the end.
        Torvald: You used to say it along with me.
    }
    -> talk
* [Ask about the fishing] Signe: How's the catch?
    Torvald: Thin. Nobody remembers how to salt it properly, so half of it spoils anyway.
    -> talk
* {promise_made("lilja_ice")} [Tell him your promise to Lilja] Signe: I promised Lilja I'd take her across the ice when it's safe.
    Torvald: Then you'd better keep it. She'll hold you to it until you're both grey.
    -> talk
+ [Leave] -> END
