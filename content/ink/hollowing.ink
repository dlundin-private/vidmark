// Hollowing (build step 5): taking everything from someone. Always offered,
// never highlighted, and asked twice. Anyone can be hollowed, family included
// (decided by Daniel). Restrained: no gore, no judgement; the consequences are
// what Signe and the village no longer have.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

=== take_everything(who, name) ===
You could reach into {name} and take all of it. Every winter, every face, every word. You know how. You have always known how.
It would be yours. All of it, at once.
* [Take everything]
    ~ hollow_person(who)
    { who == "hermit": 
        ~ set_flag("knows_safe_route", true)
    }
    It is easier than it should be.
    It pours into you, a whole life in one breath: rooms you have never stood in, voices you have never heard, a cold you have never felt.
    Then {name} blinks, and nothing looks back at you.
    -> END
* [Let it be]
    You let your hand fall.
    -> END

// How people react when someone they know has been hollowed. Called at the
// start of their conversations: -> reacts("gerda") ->
=== reacts(who) ===
{ who == "gerda":
    { is_hollowed("ebbe"): Old Gerda: Ebbe sits by his racks and doesn't know what they're for. Who would do that to a man? }
    { is_hollowed("lilja"): Old Gerda: That poor child. I can't look at her. }
}
{ who == "torvald":
    { is_hollowed("lilja"):
        Torvald: Lilja doesn't know me. She looks at me the way she looks at the ice.
    - else:
        { emptied_someone(): Torvald: Folk are saying someone's emptying people. Stay close to home. }
    }
}
{ who == "lilja":
    { is_hollowed("torvald"): Lilja: Papa won't talk to me. He just sits there. }
}
{ who == "olle":
    { emptied_someone(): Reeve Olle: Someone in Kallsjö is taking without a ledger. That isn't how it's done. }
}
{ who == "ebbe":
    { is_hollowed("gerda"): Ebbe: Gerda's gone blank. Somebody took her stories. All of them. }
}
{ who == "hermit":
    { emptied_someone(): The hermit: Word gets out here, even. Somebody's emptying people in the village. }
}
->->

// Someone in the village has been hollowed by Signe (the boathouse Hollow doesn't count).
=== function emptied_someone() ===
~ return is_hollowed("ebbe") or is_hollowed("gerda") or is_hollowed("olle") or is_hollowed("lilja") or is_hollowed("torvald") or is_hollowed("hermit")

// --- Echoes: what is left of a hollowed life inside Signe. Now and then one speaks.
=== echo_ebbe ===
{~Over, under, pull. Over, under, pull.|Forty winters on that shore, and you took them in one breath.|She used to laugh at my knots. Who did?}
-> END

=== echo_hermit ===
{~Thick on the east side. Always the east side.|Nobody comes out here unless they want something.|Fifty winters alone, and now I'm never alone.}
-> END

=== echo_gerda ===
{~Grandmother said she had chapped hands.|Sit, if you're staying.|My eyes are worse than my ears. Yours are worse than both.}
-> END

=== echo_olle ===
{~Kallsjö. Yes. One of Torvald's.|The ledger said. The ledger always said.|Someone should be writing this down.}
-> END

=== echo_lilja ===
{~{name_known(): Signe, look! Look! | Look! Look!}|You said not past the reeds.|I'm cold.}
-> END

=== echo_torvald ===
{~There's my girl.|Stay where the ice is white.|Tell it again? The old one?}
-> END
