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
// Chapter 1 is over: the Tithe has taken Lilja across the road Signe opened.
{ has_flag("why_you_left_for"):
    { who == "torvald": Torvald: The road's open both ways now. Go, if you're going. }
    { who == "gerda": Old Gerda: They took the Tithe child across the road you opened. Don't think nobody noticed. }
    { who == "ebbe": Ebbe: The sled went past before light. I didn't look up. I'm sorry. }
    { who == "hermit": The hermit: Kronvall's road. It always was. }
}
// Someone saw Signe hollow a person, so the village knows (Daniel: "only by evidence").
// They react; the game never judges. Nobody offers from now on.
{ has_flag("village_knows"):
    { who == "ebbe": Ebbe: They're saying it was you, with {flag("seen_hollowing")}. I don't want to believe it. So don't tell me. }
    { who == "gerda": Old Gerda: I know what you did to {flag("seen_hollowing")}. Sit, if you must. Don't come near me. }
    { who == "olle": Reeve Olle: You take without a ledger, girl. Kronvall will hear of it. }
    { who == "lilja": Lilja: Everyone says you did something to {flag("seen_hollowing")}. You didn't. Did you? }
    { who == "torvald": Torvald: Is it true? About {flag("seen_hollowing")}? ...Don't answer me. Go home. }
    { who == "hermit": The hermit: Word reached me, even here. Stay on your side of the fire. }
}
{ who == "gerda":
    { is_hollowed("ebbe"): Old Gerda: Ebbe sits by his racks and doesn't know what they're for. Who would do that to a man? }
    { is_hollowed("lilja"): Old Gerda: That poor child. I can't look at her. }
}
{ who == "torvald":
    { is_hollowed("lilja"):
        Torvald: Lilja doesn't know me. She looks at me the way she looks at the ice.
    - else:
        { emptied_someone() and not has_flag("village_knows"): Torvald: Folk are saying someone's emptying people. Stay close to home. }
    }
}
{ who == "lilja":
    { is_hollowed("torvald"): Lilja: Papa won't talk to me. He just sits there. }
}
{ who == "olle":
    { emptied_someone() and not has_flag("village_knows"): Reeve Olle: Someone in Kallsjö is taking without a ledger. That isn't how it's done. }
}
{ who == "ebbe":
    { is_hollowed("gerda"): Ebbe: Gerda's gone blank. Somebody took her stories. All of them. }
}
{ who == "hermit":
    { emptied_someone() and not has_flag("village_knows"): The hermit: Word gets out here, even. Somebody's emptying people in the village. }
}
->->

// Someone in the village has been hollowed by Signe (the boathouse Hollow doesn't count).
=== function emptied_someone() ===
~ return is_hollowed("ebbe") or is_hollowed("gerda") or is_hollowed("olle") or is_hollowed("lilja") or is_hollowed("torvald") or is_hollowed("hermit")

// --- The hunger: when Signe is low on Power, an Echo points out who is close (Daniel's design).
=== hunger_ebbe ===
{~Ebbe is close. Forty winters in him.|The net-mender. All those knots, all those springs.|He has one memory left worth anything. Only one? Look closer.}
-> END

=== hunger_hermit ===
{~The hermit is close. Fifty winters alone, and every one of them kept.|He keeps the whole lake in his head.|No one would miss what he knows.}
-> END

=== hunger_gerda ===
{~Gerda is close. She has so much.|Her grandmother's whole life, inside her. And her own.|She is old. She will lose it all soon anyway.}
-> END

=== hunger_olle ===
{~The Reeve is close. He has carried other people's memories for years.|He takes for Kronvall. Take from him.|All those names in his head.}
-> END

=== hunger_lilja ===
{~She is close. So bright. So full.|Every winter she has, she has with you in it.|Small. But so full.}
-> END

=== hunger_torvald ===
{~Father is close.|All of your childhood is in him. All of it.|He would give it to you, if you asked. Why ask?}
-> END

// Järnfors.
=== hunger_edda ===
{~Edda is close. Forty Hollows in her hands, and every one of them remembered.|She holds everything she can't give anyone. Take it, then.|She fears being needed. Need her.}
-> END

=== hunger_brita ===
{~The old woman. A hundred years of one man in her.|Brita is close. She will not last the winter anyway.|All that love, and nobody to give it to.}
-> END

=== hunger_gudmund ===
{~The dam-master. What's left of the keeping is in there somewhere.|Gudmund is close. Maren took a builder once. It worked.|A whole wall's worth of knowing. Half of it, anyway.}
-> END

=== hunger_clerk ===
{~The clerk. Every name that went north is in his head.|He signs children away. Who would miss him?|The road to Kronvall is in him, step by step.}
-> END

=== hunger_arn ===
{~The boy. Small. Sick. Nobody is coming for him.|Arn is close. He saw her. He remembers her.|He'll die on the step anyway. Wouldn't it be kinder?}
-> END

=== hunger_knut ===
{~The forge-hand. Strong hands, quick, sure.|Knut is close. He's robbing the dam. Rob him.|Nobody in the upper city would ask where he went.}
-> END

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

// A hollowed wolf has no words: only what it felt.
=== echo_wolf ===
{~(Hunger. The smell of the village on the wind.)|(Cold under the paws. The pack, close, warm.)|(Something small and quick under the snow. Not enough.)}
-> END

=== echo_edda ===
{~Turn them in the night, or they get sores.|Whoever the dam needs, it takes.|Grandmother? Is that broth still warm?}
-> END

=== echo_brita ===
{~Was he a coward? Go on. Ask.|Twice a day. Twice a day. Twice a day.|He said no to her. That's all he did.}
-> END

=== echo_gudmund ===
{~Every drain. My father knew every drain.|It's just a wall. It's just a wall.|Listen to it. Every spring, we listened.}
-> END

=== echo_clerk ===
{~Wiped when the sled leaves. Nothing to discuss.|Kronvall's concern, not mine. Not mine.|The first one cried. I wrote it down anyway.}
-> END

=== echo_arn ===
{~I'm not dead. I keep checking.|Is the sled coming back?|A whole other sky, under the ice.}
-> END

=== echo_knut ===
{~Fetches a good price downriver.|We get drowned. They get wet feet.|Pry, twist, lift. Pry, twist, lift.}
-> END

=== echo_torvald ===
{~There's my girl.|Stay where the ice is white.|Tell it again? The old one?}
-> END
