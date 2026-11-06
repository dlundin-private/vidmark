// The people of Järnfors (chapter 2). From docs/chapter-2-jarnfors.md. Their
// first conversations: who they are, what they let slip, and how what Signe
// did in Kallsjö reaches them. Offerings, Kin and the side quests come in
// later build steps.
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

// --- Edda: runs the Hollow-house. Halvar and Brita's granddaughter. Holds Kin.
=== edda ===
{ is_hollowed("edda"): -> hollowed("Edda") }
-> here_reacts("edda") ->
{ flag("met_edda"):
    Edda: Back again. The water's still there to carry.
- else:
    ~ set_flag("met_edda", true)
    ~ remember("edda", "met")
    A woman of forty or so, sleeves pushed up, is wiping the face of someone who doesn't notice.
    Edda: If you've come to look, look and go. If you've come to help, there's water to carry.
}
{ has_flag("village_knows") and not remembers("edda", "heard"):
    ~ remember("edda", "heard")
    Edda: Word came up the Tithe road ahead of you. A girl from the lake who empties people.
    Edda: I have forty of those already. I don't need one more on her feet.
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("edda", "Edda")
* {not remembers("edda", "house")} [Ask about the Hollow-house] Signe: Who are they?
    ~ remember("edda", "house")
    Edda: People the Tithe took everything from. A family can't pay, so it takes one of them whole.
    Edda: They come here. Somebody has to wash them and feed them and turn them in the night. Somebody always has to.
    -> talk
* {flag("met_halvar") and not remembers("edda", "grandfather")} [Ask about the man at the window] Signe: The old man upstairs, at the window.
    ~ remember("edda", "grandfather")
    Edda: Halvar. My grandfather. He built the dam, and the city says he was a coward for it.
    Edda: Grandmother says otherwise. Every day, twice a day, to someone who can't hear her.
    -> talk
* {not remembers("edda", "dam")} [Ask about the dam] Signe: Everyone here looks at the dam the way we look at the ice at home.
    ~ remember("edda", "dam")
    Edda: Everyone here asks the dam for something. It always answers the same way.
    Edda: It takes someone. A builder, a saint. Whoever it needs. Don't let it need you.
    -> talk
* {has_keepsake("whyYouLeft") and not remembers("edda", "lilja")} [Ask about the Tithe's children] Signe: {flag("why_you_left_for") == "stranger": A girl was taken from my village. | They took my sister.} Did the sled stop here?
    ~ remember("edda", "lilja")
    Edda: Every sled stops at the Tithe-house. Ask the clerk, if he'll talk. Ask the boy on the step, if you want an answer.
    -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("edda", "Edda")
+ [Leave] -> END

// --- Brita: Halvar's widow, about 117 (Daniel), nearly blind. Feeds him twice a day.
=== brita ===
{ is_hollowed("brita"): -> hollowed("Brita") }
-> here_reacts("brita") ->
{ flag("met_brita"):
    Brita: You again. You walk like someone from away.
- else:
    ~ set_flag("met_brita", true)
    ~ remember("brita", "met")
    An old, old woman sits at the window with a bowl, spooning broth into a man who looks past her.
    Brita: Is that you, Edda? No. You walk like someone from away.
}
{ is_hollowed("hermit") and not remembers("brita", "reeve"):
    ~ remember("brita", "reeve")
    Brita: And you look at people like a reeve. Weighing them. I can feel it from here.
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("brita", "Brita")
* {not remembers("brita", "refused")} [Ask about Halvar] Signe: Who was he?
    ~ remember("brita", "refused")
    Brita: Ask me what they all ask. Was he a coward. Go on.
    Signe: Was he?
    Brita: He said no to her. That's all he did. Said no, and then she took him in front of his boys.
    -> talk
* {has_keepsake("coat") and not remembers("brita", "why")} [Ask why she still feeds him] Signe: He doesn't know you. Why do you still feed him?
    ~ remember("brita", "why")
    Brita: Because he would do it for me.
    Brita: And because somebody has to remember he was a man, not a story.
    -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("brita", "Brita")
+ [Leave] -> END

// --- Halvar: the master builder Maren hollowed a century ago. A Hollow from the start.
=== halvar ===
{ flag("met_halvar"):
    He is where he was. A clean cloth has been tied around his neck.
- else:
    ~ set_flag("met_halvar", true)
    ~ remember("halvar", "met")
    The man at the window is very old and not old at all, the way the Hollows are. His hands are a builder's hands, broad and scarred.
    They lie in his lap and hold nothing.
}
-> talk

= talk
* {not remembers("halvar", "hands")} [Look at his hands] There is old mortar ground into the creases of his knuckles. A century of washing has not got it out.
    ~ remember("halvar", "hands")
    -> talk
* {not remembers("halvar", "eyes")} [Look where he is looking] Signe: What are you looking at?
    ~ remember("halvar", "eyes")
    He is looking up the gorge, at the dam. He has been looking at it for a hundred years.
    -> talk
+ [Leave] -> END

// --- Gudmund: the dam-master. The Tithe took the keeping out of him.
=== gudmund ===
{ is_hollowed("gudmund"): -> hollowed("Gudmund") }
-> here_reacts("gudmund") ->
{ flag("met_gudmund"):
    Gudmund: Still here?
- else:
    ~ set_flag("met_gudmund", true)
    ~ remember("gudmund", "met")
    A big man with a chisel stands over a block of stone, staring at it as if it ought to explain itself.
    Gudmund: If you're from the council, the answer is: soon. If you're not, mind the blocks.
}
{ has_flag("village_knows") and not remembers("gudmund", "heard"):
    ~ remember("gudmund", "heard")
    Gudmund: Lake girl. I've heard about you. Keep your hands where I can see them.
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("gudmund", "Gudmund")
* {not remembers("gudmund", "forgot")} [Ask if the dam is safe] Signe: Is the dam safe?
    ~ remember("gudmund", "forgot")
    Gudmund: It's held a hundred years. My father knew every drain in it. So did I.
    Gudmund: Then the Tithe came round, and now I look at that wall and it's just a wall.
    -> talk
* {flag("seen_gallery") and not remembers("gudmund", "gallery")} [Ask about the iron door in the dam] Signe: There's a door in the dam face. It goes in and stops.
    ~ remember("gudmund", "gallery")
    Gudmund: The gallery. We used to walk the whole wall from the inside, every spring. Listen to it.
    Gudmund: The roof came down in the autumn. Nobody's been in since. Nobody remembers how to shore it.
    -> talk
* {not remembers("gudmund", "saint")} [Ask about the statue on the crest] Signe: They say she held the water with her hands.
    ~ remember("gudmund", "saint")
    Gudmund: So they say. I'd settle for a mason who remembered his mortar.
    -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("gudmund", "Gudmund")
+ [Leave] -> END

// --- The clerk: keeps the Tithe-house, where those bound for Kronvall wait.
=== clerk ===
{ is_hollowed("clerk"): -> hollowed("The clerk") }
-> here_reacts("clerk") ->
{ flag("met_clerk"):
    The clerk: The Tithe-house is closed to visitors. As before.
- else:
    ~ set_flag("met_clerk", true)
    ~ remember("clerk", "met")
    A thin man with ink on every finger stands in the doorway of the Tithe-house as if he were the door.
    The clerk: The Tithe-house is closed to visitors.
}
{ has_flag("village_knows") and not remembers("clerk", "heard"):
    ~ remember("clerk", "heard")
    The clerk: The Reeve's report came up the road. "Takes without a ledger." I'll be keeping mine shut.
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("clerk", "The clerk")
* {not remembers("clerk", "tithe")} [Ask what happens to the people here] Signe: What happens to the people who wait here?
    ~ remember("clerk", "tithe")
    The clerk: They wait for the sled. Then Kronvall. Then they are Kronvall's concern, and not mine.
    -> talk
* {has_keepsake("whyYouLeft") and not remembers("clerk", "wiped")} [Ask about a girl from Kallsjö] Signe: A girl from Kallsjö came through here. {flag("why_you_left_for") == "stranger": I've come for her. | My sister.}
    ~ remember("clerk", "wiped")
    The clerk: I don't discuss the Tithe's goods.
    The clerk: And the names are wiped when the sled leaves. There's nothing to discuss.
    -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("clerk", "The clerk")
+ [Leave] -> END

// --- Arn: a sick boy, left behind when the last sled went north.
=== arn ===
{ is_hollowed("arn"): -> hollowed("Arn") }
-> here_reacts("arn") ->
{ flag("met_arn"):
    Arn: You came back. Nobody comes back.
- else:
    ~ set_flag("met_arn", true)
    ~ remember("arn", "met")
    A boy of nine or ten sits on the Tithe-house step in a blanket, coughing into his fist.
    Arn: Are you from the sled? Is it coming back for me?
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("arn", "Arn")
* {not remembers("arn", "left")} [Ask why he's out here] Signe: Why are you sitting out in the cold?
    ~ remember("arn", "left")
    Arn: They said I'd die on the road, and Kronvall doesn't pay for dead ones. So they left me.
    Arn: I'm not dead, though. I keep checking.
    -> talk
* {not remembers("arn", "girl")} [Ask who he waited with] Signe: Who did you wait with, in there?
    ~ remember("arn", "girl")
    { flag("why_you_left_for") == "hollow":
        Arn: A girl from Kallsjö. She didn't talk. She just looked at the ceiling.
        Arn: The men said she was paid in full. I didn't know what it meant. I still don't.
    - else:
        Arn: A girl from Kallsjö. She talked about swimming. She said under the ice there's a whole other sky.
        { has_keepsake("swim") and has_keepsake("whyYouLeft"):
            ~ set_flag("lilja_trace_known", true)
            You told her that. The summer you held her up in the water, you told her that.
            Lilja. It was Lilja.
        - else:
            { has_keepsake("swim"):
                Something about it is familiar. You nod, and the feeling passes before you can hold it.
            - else:
                A girl who talked about swimming. Something in you turns over, looking for something, and finds nothing there.
            }
        }
    }
    -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("arn", "Arn")
+ [Leave] -> END

// --- Knut: a forge-hand from the lower quarter. Steals iron from the dam at night (the fight, later).
=== knut ===
{ is_hollowed("knut"): -> hollowed("Knut") }
-> here_reacts("knut") ->
{ flag("met_knut"):
    Knut: Still looking at my bar?
- else:
    ~ set_flag("met_knut", true)
    ~ remember("knut", "met")
    A forge-hand with burnt forearms is sharpening a pry-bar that isn't meant for any forge.
    Knut: Lost? The upper city's up the stairs.
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("knut", "Knut")
* {not remembers("knut", "cramps")} [Ask what the bar is for] Signe: That isn't a forge tool.
    ~ remember("knut", "cramps")
    Knut: Cramps. The iron that ties the dam stones together. Fetches a good price downriver.
    Knut: Don't look at me like that. Everyone down here knows it's going. Might as well be paid before it does.
    -> talk
* {not remembers("knut", "quarter")} [Ask about the lower quarter] Signe: You live right under it.
    ~ remember("knut", "quarter")
    Knut: When it goes, the upper city gets wet feet. We get drowned. The council knows it. We know it.
    -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("knut", "Knut")
+ [Leave] -> END

// --- How Järnfors reacts when Signe empties someone there.
=== here_reacts(who) ===
{ who == "edda":
    { is_hollowed("brita"): Edda: Grandmother sits by him now. Two of them at the window. I feed them both. }
}
{ who == "brita":
    { is_hollowed("edda"): Brita: Edda doesn't come up any more. Somebody else brings the broth. They don't hum. }
}
{ who == "arn" or who == "clerk":
    { is_hollowed("arn") and who == "clerk": The clerk: The boy on the step. Someone emptied him. He was no use to Kronvall before, and less now. }
}
{ emptied_here() and who != "edda" and not has_flag("village_knows"):
    { who == "gudmund": Gudmund: Somebody's emptying people in the city. Like her, on the crest, in the old story. }
    { who == "knut": Knut: There's a rumour down here. Someone walks about taking people whole. No sled, no ledger. }
}
->->

=== function emptied_here() ===
~ return is_hollowed("edda") or is_hollowed("brita") or is_hollowed("gudmund") or is_hollowed("clerk") or is_hollowed("arn") or is_hollowed("knut")
