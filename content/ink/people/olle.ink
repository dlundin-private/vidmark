// Reeve Olle, the Tithe-collector. Not cruel; doing his duty.
// At the end of chapter 1 he takes Lilja to Kronvall as payment (not in the slice).

=== olle ===
{ is_hollowed("olle"): -> hollowed("Reeve Olle") }
{ flag("hurt_by_trap_olle"): Reeve Olle: The ice by the village opened under me. I'll be writing that down. }
{ flag("met_olle"):
    Reeve Olle: Something else?
- else:
    ~ set_flag("met_olle", true)
    Reeve Olle is counting names in a ledger, lips moving. He finishes the line before he looks up.
    Reeve Olle: Kallsjö. Yes. You're one of Torvald's.
}
-> talk

= talk
* [Ask about the Tithe] Signe: What does the Tithe take?
    Reeve Olle: What every village owes. A share of what you know, for the Hearth at Kronvall.
    Reeve Olle: It holds the world together. Saint Maren carries all of us. The least we can do is help carry her.
    -> talk
* [Tell him they took too much] Signe: You took too much this year. Ebbe can't mend nets. Nobody can read the ice.
    Reeve Olle: I took what the ledger said.
    Reeve Olle: I'm sorry for it. I am. But a village that can't pay still owes.
    -> talk
* [Ask what happens if they can't pay] Signe: And if we can't pay?
    Reeve Olle looks at the ledger instead of at you.
    Reeve Olle: Then Kronvall decides. Not me.
    -> talk
+ [Leave] -> END
