// Old Gerda. Her grandmother knew Maren as a girl.
// She is a source of lore that does not match Torvald's bedtime story.

=== gerda ===
{ is_hollowed("gerda"): -> hollowed("Old Gerda") }
{ flag("met_gerda"):
    Old Gerda: Sit, if you're staying.
- else:
    ~ set_flag("met_gerda", true)
    Old Gerda: {name_known(): Signe. | You.} Come closer, my eyes are worse than my ears.
}
-> talk

= talk
* [Ask about the statue on the shore] Signe: Who carved the statue of Saint Maren?
    Old Gerda: Someone who never met her.
    Old Gerda: My grandmother did. She said Maren was a skinny girl with chapped hands, before she was anybody's saint.
    -> talk
* [Ask what her grandmother said] Signe: What else did your grandmother say about her?
    Old Gerda: That she loved her little brother more than her own eyes.
    Old Gerda: And that the winter she saved the lake, she stopped knowing her mother's face.
    { has_keepsake("story"):
        You know your father's story by heart. It has a saint in it, and a miracle on the ice. It has nothing about a mother's face.
    - else:
        Somewhere you think you should know a story about this. You reach for it, and there is nothing there.
    }
    -> talk
+ [Leave] -> END
