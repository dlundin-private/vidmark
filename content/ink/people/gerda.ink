// Old Gerda. Her grandmother knew Maren as a girl.
// She is a source of lore that does not match Torvald's bedtime story.

=== gerda ===
{ is_hollowed("gerda"): -> hollowed("Old Gerda") }
-> reacts("gerda") ->
{ has_offered("gerda"): Old Gerda: Maren? A saint. A statue on the shore. What more is there to say about her? }
{ flag("hurt_by_trap_gerda"): Old Gerda: I went through the ice like a girl. At my age. Someone has been at it, and I'd like to know who. }
{ flag("met_gerda"):
    Old Gerda: Sit, if you're staying.
- else:
    ~ set_flag("met_gerda", true)
    ~ remember("gerda", "met")
    Old Gerda: {name_known(): Signe. | You.} Come closer, my eyes are worse than my ears.
}
-> talk

= talk
+ {carries_echoes()} [Take everything] -> take_everything("gerda", "Old Gerda")
* {not has_offered("gerda") and not remembers("gerda", "statue")} [Ask about the statue on the shore] Signe: Who carved the statue of Saint Maren?
    ~ remember("gerda", "statue")
    Old Gerda: Someone who never met her.
    Old Gerda: My grandmother did. She said Maren was a skinny girl with chapped hands, before she was anybody's saint.
    -> talk
* {not has_offered("gerda") and not remembers("gerda", "grandmother")} [Ask what her grandmother said] Signe: What else did your grandmother say about her?
    ~ remember("gerda", "grandmother")
    Old Gerda: That she loved her little brother more than her own eyes.
    Old Gerda: And that the winter she saved the lake, she stopped knowing her mother's face.
    { has_keepsake("story"):
        You know your father's story by heart. It has a saint in it, and a miracle on the ice. It has nothing about a mother's face.
    - else:
        Somewhere you think you should know a story about this. You reach for it, and there is nothing there.
    }
    -> talk
* {flag("met_hollow") and not remembers("gerda", "hollow")} [Ask about the man in the boathouse] Signe: Who is the man in the boathouse?
    ~ remember("gerda", "hollow")
    ~ set_flag("asked_about_hollow", true)
    Old Gerda is quiet for a long time.
    Old Gerda: We don't say his name. It would be cruel. He can't answer to it.
    Old Gerda: His family couldn't pay, the winter the catch failed. So the Tithe took what they could from him instead. All of it.
    Old Gerda: Somebody combs his hair. Somebody always will. That's all we can do.
    -> talk
* {not remembers("gerda", "winter")} [Ask about Maren's Winter] Signe: Is there a play this year, for Maren's Winter?
    ~ remember("gerda", "winter")
    Old Gerda: There's always a play. The whole village at the statue, and someone as the saint walking the starving lake.
    Old Gerda: I need a young Maren this year. You'd do. You've the face for it.
    ** [Take the part] Signe: I'll play her.
        ~ set_flag("maren_winter_part", true)
        Old Gerda: Good. Come to the statue when you're ready. And ask your father for the old story first, so you know who you're playing.
        -> talk
    ** [Not this year] Signe: Ask someone else.
        Old Gerda: There's nobody else who remembers the lines. Never mind. I'll do it myself, and creak.
        -> talk
* {has_flag("quest_marens-winter") and not has_offered("gerda") and not has_flag("village_knows")} [Ask who will read the saint's part when she's gone] Signe: Who'll read Maren's part, when you're gone?
    Old Gerda: Nobody. That's the trouble.
    Old Gerda: When I go, my grandmother's Maren goes with me. The chapped hands, the brother, her mother's face. All of it.
    Old Gerda: Take it. I'd rather it lived in you than died with me.
    ** [Take her memory] Signe: I'll keep it.
        ~ offer("gerda")
        ~ remember("gerda", "gave")
        Old Gerda closes her eyes. When she opens them she looks at the statue on the shore as if it were only a statue.
        Old Gerda: There. Now, what were we talking about?
        -> END
    ** [Refuse] Signe: Keep it, Gerda. Tell it to someone else.
        Old Gerda: There's nobody else who listens.
        -> talk
+ {not carries_echoes()} [Take everything] -> take_everything("gerda", "Old Gerda")
+ [Leave] -> END
