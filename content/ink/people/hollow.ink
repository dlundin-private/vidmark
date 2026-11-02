// The Hollow in the boathouse. Hollowed by the Tithe-collectors, not by Signe.
// Quest: The Hollow in the boathouse reveals what the Tithe does when a village can't pay.

=== hollow ===
{ flag("met_hollow"):
    He is where he was. Someone has turned his chair toward the window.
- else:
    ~ set_flag("met_hollow", true)
    A man sits in the cold boathouse, hands in his lap. His hair is combed. Someone washes his face.
    He breathes. He blinks. That is all.
}
-> talk

= talk
* [Ask who he is] Signe: Who are you?
    Nothing. Not even the effort of not answering.
    -> talk
* [Touch his hand] You take his hand. It is warm, and it does not hold back.
    { has_keepsake("shame"):
        You think of the day you ran. You think of who you left behind. You let go first.
    }
    -> talk
+ [Leave] -> END
