// People meeting each other in the village: a few lines, shown in speech
// bubbles, when two of them walk over to each other. The game picks a pair
// from content/data/meetings.ts and plays the knot named there.
// These read GameState like any conversation. No choices here.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

=== meet_ebbe_gerda ===
{ is_hollowed("ebbe") or is_hollowed("gerda"): -> END }
Old Gerda: Hands still idle, Ebbe?
{ all_nets():
    Ebbe: Someone mended my nets in the night. Neater than I ever did.
    Old Gerda: Then don't let the Reeve see them. He'll count them.
- else:
    Ebbe: They remember holding something. Not what.
    Old Gerda: Mine forget the names of things. It comes to all of us.
}
-> END

=== meet_olle_gerda ===
{ is_hollowed("olle") or is_hollowed("gerda"): -> END }
Reeve Olle: Gerda. The ledger has your household down for winter.
Old Gerda: My household is me, Reeve. Take what you like. It's mostly the dead.
Reeve Olle: ...I'll put you down for spring.
-> END

=== meet_ebbe_olle ===
{ is_hollowed("ebbe") or is_hollowed("olle"): -> END }
Ebbe: You took my hands, Reeve.
Reeve Olle: I took what the ledger said. I'm sorry for it.
Ebbe: Write that in your book, then.
-> END

=== meet_lilja_torvald ===
{ is_hollowed("lilja") or is_hollowed("torvald"): -> END }
Lilja: Papa, how deep is it, under the hole?
Torvald: Deep enough. Stay where the ice is white.
Lilja: It's all white!
-> END

=== meet_lilja_gerda ===
{ is_hollowed("lilja") or is_hollowed("gerda"): -> END }
Lilja: Was Saint Maren ever little?
Old Gerda: Once. Smaller than you, and hungrier.
-> END

=== meet_ebbe_torvald ===
{ is_hollowed("ebbe") or is_hollowed("torvald"): -> END }
Torvald: Nets?
Ebbe: Nets.
Torvald: Thin catch without them.
-> END

=== meet_olle_torvald ===
{ is_hollowed("olle") or is_hollowed("torvald"): -> END }
Reeve Olle: Torvald. Your girls are well?
Torvald: They're mine. That's all you need to write down.
-> END

// Järnfors.
=== meet_edda_brita ===
{ is_hollowed("edda") or is_hollowed("brita"): -> END }
Edda: You've let it go cold again, Grandmother.
Brita: He doesn't mind. He never minded anything once I'd started.
-> END

=== meet_clerk_arn ===
{ is_hollowed("clerk") or is_hollowed("arn"): -> END }
Arn: Is it coming today? The sled?
The clerk: Not for you. Go inside, you're letting the cold in.
-> END
