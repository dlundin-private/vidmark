# Decisions and drafts

Choices the design doc ([design.md](design.md)) doesn't make. Each one is marked by who decided it. **Draft** means Claude proposed it and it stands until Daniel changes it. Newest first within each section.

## Rules

| Decision | Status | Where |
| --- | --- | --- |
| "Your name" stays hidden in the journal until late in the full game: the reveal should land as "even this can be spent", it must not be burned by accident early, and it mirrors Maren, who burned her name last. In the slice, the debug panel can reveal and burn it, to test what losing it does. | Decided by Daniel, 2026-11-02 | `content/data/keepsakes.ts` (`hiddenUntilLate`), debug panel |
| "Why you left" exists from the start but can only be burned or used after it forms at the end of chapter 1. In the slice it never forms, so it can't be burned there. | Decided by Daniel, 2026-11-02 | `content/data/keepsakes.ts` (`formedLater`) |
| Spending uses refillable Power first, then the one-time reserve. | Draft | `src/state/actions.ts` |
| Losing a Hearth member (hollowed or faith lost) lowers max Power at once. | Draft | `src/state/actions.ts` |
| The boathouse Hollow was hollowed by someone else, so Signe carries no Echo of him. | Draft | `src/state/actions.ts` |

## People's domains

Only Ebbe's domain follows from the design (his memory teaches Mend). In the slice, Signe holds only Craft, so a domain matters mostly for what an Offering from that person can teach her.

| Person | Domain | Status | Reasoning |
| --- | --- | --- | --- |
| Ebbe | Craft | From the design | His memory of mending nets teaches Mend. |
| The hermit | Kin | Draft | A life alone with the forest, the lake and its fish. It also fits "guide the fish", the ice road's Kin solution. |
| Old Gerda | Thought | Draft | She keeps what her grandmother told her about Maren: a life spent with remembered words. |
| Reeve Olle | Thought | Draft | He keeps the Tithe: ledgers, names and who owes which memories. |
| The Hollow | Craft | Draft | Whatever he held is gone; Craft only matters if the design later reveals who he was. |
| Lilja | Kin | Draft | Bright and fearless on the ice; the swim, her bond with Signe, is a Kin memory. |
| Torvald | Craft | Draft | A fisherman's life of boats and nets. He tells the story, but the story is Signe's Thought Keepsake, not his domain. |

## Tuning starting values

All in `content/data/tuning.ts`, changeable live in the debug panel.

| Value | Start | Status |
| --- | --- | --- |
| Max Power with no Offerings | 2 | Draft (the design has no base value) |
| Max Power per Offering | 1 | From the design |
| Reserve from one hollowing | 5 | From the design ("for example 5") |
| Burn: swim / coat / story | 4 / 3 / 3 | Draft |
| Burn: shame / why you left / your name | 6 / 5 / 6 | Draft, following "pain pays best" |
| Wounds before Signe falls | 3 | From the design |

## Craft, Power and Weaves (step 4)

The design gives the four actions, their costs and the Weave parts. Everything below fills gaps; all numbers are in `content/data/tuning.ts` and the debug panel.

| Rule | Status |
| --- | --- |
| Signe reaches 3 tiles with Craft; the Range modifier makes it 8. | Draft |
| Craft only works on made things: crates, sleds, net racks, boats, ice markers, houses, the statue. Not trees, people or mountains. | Draft, from the domain ("Made") |
| **Strengthen** makes an object or ice resilient: it can't be weakened while the effect lasts. | Draft, from the design |
| **Weaken** on an object makes it brittle: the next push breaks it. On ice it cracks the ice open to black water at once. It refuses the ice under Signe or under a person. | Draft. The design says ice "cracks under whoever stands on it"; breaking it under people waits for the wolf fight. |
| **Push** moves an object straight away from Signe along one axis; she must stand in line with it. You tap where it should stop. 1 Power per 2 tiles, as designed. | Draft |
| **Mend** repairs broken things. Nets need Mend I, a boat Mend II, a house Mend III. The Size modifier lets Mend repair one size bigger. | Draft |
| A Weave's cost = the action's cost, +1 for an area target, +1 for a modifier. Trained skills make their Weaves 1 cheaper per level above I, never below 1. | Draft |
| Targets: an object, a surface (one tile of ice), or an area (3 × 3). Size makes a surface 3 × 3 and an area 5 × 5. | Draft |
| **Trigger** (Weaken on ice only): the ice looks whole and breaks under the next step. Signe sees her own traps as faint cracks, and tap-to-walk routes around them; the arrow keys can still walk onto them. Breaking through costs her a wound and she climbs back out where she came from. | Draft, from the design's example ("ice that breaks when a wolf steps on it") |
| **Duration**: an effect lasts one rest longer. Ordinary effects fade at the next rest; broken ice refreezes after one rest. | Draft |
| Only some modifiers fit each action: Trigger only for Weaken on ice, Size not for Push, and so on. The Weave screen shows only those that fit. | Draft |
| **Training**: Mend and Weaken level up from use on distinct things (3 for level II, 7 for III). Using them on the same thing again teaches nothing. | Draft, from the design ("not grinding") |
| An Offering from Ebbe raises Mend by one level; hollowing him would raise it by two. | Daniel: his memory of his wife is the one that teaches Mend. |
| **Anchoring** consumes a memory into a Weave for good: its effects never fade. A Keepsake is lost as if burned; an Offering costs a point of max Power for good; an Echo lives on in the Weave. Anchored Weaves can't be deleted. "Your name" is never offered. | Draft, from the design |
| **Resting** happens at Signe's home: tap the house. Power refills (the reserve doesn't), one wound heals, Craft effects tick down, broken ice refreezes. | Draft |
| At 3 wounds Signe dies. The game goes back to her last rest at home; everything since is undone. With no rest yet, it starts over. | Decided by Daniel |
| Death is told as a memory she had wrong: "No. That isn't how it went. You're remembering it wrong", then "Remember it again". The text is in `content/ink/death.ink`, three variants per line. | Daniel's idea, wording drafted by Claude |

## Chapter 2: build order, and step 1 (travel and the district)

Daniel: "Build" chapter 2, after deciding the ten Järnfors questions. Built a step at a time, like chapter 1:

1. Travel and the district: more than one map in a save, the road north, the 128 × 128 district of Järnfors.
2. People and dialogue, reading what chapter 1 decided.
3. Kin: its four abilities, and gaining it from Edda (ask, bargain, take).
4. The three side quests.
5. The dam crisis: the three-rest clock, all four routes, failure, the cross-domain Weave, the Hearth helping.
6. The cramp-thieves fight.
7. World changes, the chapter's end, playtesting.

| Decision (step 1) | Status |
| --- | --- |
| A save holds more than one map: the map Signe is on keeps its world changes, sketch and position; the others are put aside as she left them (save version 6). | Claude |
| The way north: the end of chapter 1 offers "Go north to Järnfors"; staying in Kallsjö, resting at home offers it again. The first arrival plays a short film (the gorge and the dam), with a line that follows how Signe knew Lilja. | Claude's draft |
| Starting chapter 2 without a save (Daniel: a default state): the debug panel's "Start chapter 2" plays a default chapter 1 (nobody hollowed, the nets mended, the road open, Lilja taken) and starts at Järnfors' south gate. | Daniel; done through the debug panel for now |
| The district, laid out on purpose by scripts/generate-jarnfors-map.mjs (a Tiled map, editable in Tiled): the frozen reservoir, Maren's Dam with its statue, the gallery door in the dam face, the spillway and river, the city on both banks with three bridges, the Hollow-house, the apprentices' hall, the inn (rest), the Tithe-house, Gudmund's yard, the lower quarter, and Halvar's sealed relief cut hidden in the west wall, reached by one gap in the rock. A check refuses the map if any place is out of reach. | Daniel: one district, about 128 × 128, built by hand; the layout is Claude's draft |
| Lore to find: the dam statue ("She held the water" / "with whose hands?"), the lintel's nine marks (the ninth reads JON if Signe saw the island doorpost or has Gerda's Maren), the fallen gallery, the plug marked H, the Hollow-house, the wiped slate at the Tithe-house. | Design and Daniel's decisions; text is Claude's draft |

## Chapter 2, step 7: the chapter's end

| Decision | Status |
| --- | --- |
| The world changes the chapter 2 design lists were built in earlier steps: Halvar's name on the statue (Brita's bowl), lanterns at the gallery (The keeping), the flooded lower quarter (the relief cut), the drowned city (the dam breaks). | Design |
| Chapter 2 ends once the dam is decided, any of the five ways: the next rest at the inn warns that nothing here needs Signe any more, then plays the ending film. | Claude's draft (the design says what the chapter holds, not how it closes) |
| The ending film: the dam as she left it (standing at dawn, or gone and the city under brown water); her page (how she came by Kin, what she told Brita, Arn, Knut, who gave and who she emptied here, whether word went ahead of her, and what the boy remembered of Lilja); then the road north to chapter 3, Runhem of the storytellers, which is not written. A record of chapter 2 is kept in the save beside chapter 1's. | Claude's draft; Runhem as chapter 3 is the design's order |
| Found in the playthrough check: with only Edda's gift, knitting the dam costs 5 Power and Signe has 3. That's the design working (gather more givers here, or burn something), but worth watching in playtesting. | For Daniel to judge |

## Chapter 2, step 6: the cramp-thieves

| Decision | Status |
| --- | --- |
| While the flood-bell rings, on a night at the inn, iron screams on the crest: Knut and two others from the lower quarter are prying out the cramps. Go up, or let them. Letting them costs a night off the clock, and Knut and his family are gone before the water; on the last night, that breaks the dam. | Design; when it happens is Claude's draft |
| The fight is the wolf fight's rules on the crest at night (two actions, runs shown before they act, three wounds). Weaken a plank under a thief and he drops to the ledge below, hurt and out (nobody drowns). Push a crate or the windlass cart into one: two hits and he gives up. Two down and the last runs; Knut, who leads them, yields instead of running. Planks (here and on Kallsjö's jetty) can now be weakened and strengthened like ice. | Design; the plank rule is Claude's |
| Stopping them slows the crack: a night back on the clock. Then Knut, on his knees: spare him, ask for something (he gives the morning the forge first answered to him), or take everything, which the masons on the towers see. Only Knut can be emptied in the fight. | Design; Knut's memory is Claude's draft |
| Avoided: tell Knut the dam can hold (once Gudmund has the keeping back); promise his family a place on the relief route (saved as a promise); ask Gudmund to post masons (once he has the keeping back); or Strengthen all three cramps by day. | Design; conditions are Claude's draft |
| Every memory the dialogue forms now has words in the journal; a test checks it. | Claude |

## Chapter 2, step 5: the dam crisis

| Decision | Status |
| --- | --- |
| The flood-bell rings at a rest in Järnfors once Signe holds Kin, or has finished two side quests, or on her third rest there. Then the city has three rests (Daniel); the HUD shows them, and each rest at the inn brings the break nearer. A crack opens on the crest. | Three rests: Daniel; the trigger is Claude's draft |
| **Knit** (asking): Kin and Craft together at the crack, "stone that knits like bone", 6 Power less 1 for each Järnfors giver, who come up to stand with her (Daniel). Anchored in an Offering (that Power is gone for good), a Keepsake, or an Echo (it leaves her and lives in the dam). It becomes a permanent Weave she doesn't carry. | Design and Daniel; costs are tuning values |
| **Taken**: with Gudmund's keeping in her (hollowing him), hold the crack for 4 Power. Hollowing Edda for Kin, then knitting, is the other taking route. | Design; costs are tuning values |
| **Relief**: open Halvar's cut after weakening the plug, pushing both sluice carts clear and strengthening the two walls at its mouth. The dam holds; the lower quarter floods (nobody drowns) and Knut's people go up above it. | Design; the three tasks are Claude's draft |
| **Held**: raw Craft, 8 Power: more than she has without burning Keepsakes (about two). | Design |
| **Broken**: the third rest passes and the dam goes at dawn. Most of the city floods, the statue is gone, everyone climbs above the water. Nobody blames her. | Design ("failing is allowed") |
| People heading for a shared spot (everyone fleeing to the same place) take the nearest free tile around it, and anyone whose way there is cut off gets there out of sight. | Claude |

## Chapter 2, step 4: the side quests

From the chapter 2 design. Each finished quest counts toward Edda's trust. All steps, lines and lore are Claude's draft.

| Quest | How it goes |
| --- | --- |
| **Brita's bowl** (Brita) | Starts when Brita asks whether Halvar was a coward. Read the statue on the crest and the nine marks on the apprentices' hall, then Mend Halvar's split drawing table: underneath he cut TOO HIGH. I TOLD THEM. Tell Brita the truth, a kind lie, or nothing. With the truth she and Halvar move to the crest beside the statue, and HALVAR is scratched beside Maren's name. Once told, she can give her memory of the morning he refused. Hollowing her ends it too. |
| **The keeping** (Gudmund) | Starts when he admits the Tithe took the keeping. Look into the fallen gallery, then learn the dam again: Mend the gallery door (Mend II: train Mend, or take Gudmund's first stone as an Offering, which teaches it) or find the apprentices' tally-sticks behind their hall. Tell Gudmund: he learns again, and tells of Halvar's sealed relief cut and Edda's fear. Lanterns then hang at the gallery door. Hollowing him puts the whole keeping, and the relief cut, in Signe. |
| **The Tithe-house** (Arn) | Starts when Arn says why he was left. Mend the broken cot by the door and carry him to the Hollow-house, or Calm the clerk (Kin) until he strikes Arn's name, or hollow the clerk. Then the Tithe-house ledger shows Edda's page: her household's Tithe paid in her own memories for twenty winters. Once he has struck the name, the clerk can give his memory of the first child he signed away. Arn lives at the Hollow-house afterwards. |

## Chapter 2, step 3: Kin, and the Keystone

| Decision | Status |
| --- | --- |
| Kin has four abilities mirroring Craft (Daniel): Strengthen (a body), Calm, Heal (a wound), Sense. Craft works on made things, Kin on the living, Signe included. Each costs 1 Power (tuning values). Aimed by tapping Signe, someone within Craft's reach, or a wolf in a fight. | Daniel chose the four; what each does is Claude's draft |
| Heal: closes one of Signe's wounds, or eases someone hurt or sick (Arn's cough, a villager hurt by trap ice). Calm: a person is quiet until the next rest; in a fight, a calmed enemy does nothing on its next turn and shows no run. Strengthen: on Signe, the next wound before she rests does not land. Sense: what someone holds closest, and whether they would ever give it (one Ink line per person; a Hollow is "a warm, breathing nothing"). | Claude's draft |
| Only a Keystone gives a domain: Edda (Kin, with a Craft start). Her Offering, or hollowing her, gives Signe Kin. Nobody else's does. | Design and Daniel's Keystone rule |
| Edda's trust follows Signe's deeds: carrying her water, listening to Brita, easing Arn, and (step 4) finishing a side quest; one less if the village knew. Two or more: she gives her memory of Halvar looking at her (ask). One, with Lilja's promise kept: she gives it on a condition, "if you ever can, you give him back", saved as a promise (bargain). Anyone can take. Not once Signe has emptied someone in Järnfors. | Chapter 2 design; the trust sources are Claude's draft until the side quests exist |

## Chapter 2, step 2: the people of Järnfors

| Decision | Status |
| --- | --- |
| Seven people, as the chapter 2 design names them: Edda (the Hollow-house, Kin), Brita (about 117, feeding Halvar at the window), Halvar (a Hollow from the start), Gudmund (the dam-master), the clerk (the Tithe-house), Arn (the boy left on the step) and Knut (a forge-hand who prises iron out of the dam). Each has a first conversation, memories Signe keeps, an Echo and hunger lines, and can be emptied like anyone. | Design names them; all lines are Claude's draft |
| What chapter 1 decided reaches them: Arn's girl from Kallsjö is Lilja only while Signe has the swim (and Why you left); a hollowed Lilja was a girl who said nothing, "paid in full". Brita's question about why she feeds him needs the coat. Hollowing the hermit makes Signe "look at people like a reeve". If the village knew, word has come up the Tithe road (Edda, Gudmund, the clerk). | Chapter 2 design (carry-over table); lines are Claude's draft |
| People belong to a map; an old save gains the Järnfors people, unmet (save version 7). Two meetings: Edda and Brita, the clerk and Arn. No tree grows within three tiles of anyone (Daniel's earlier report). | Claude |
| Offerings, Kin from Edda and the side quests come in steps 3 and 4. | Build order |

## After the slice: intro, ending, sound, art, chapters

Daniel, after his playthrough: fix the art a bit, consider performance, add sound, prepare for the next slice, an intro that introduces Signe without giving too much away, and a move to the next slice that reflects what the player did.

| Decision | Status |
| --- | --- |
| The intro is a short film of still pixel tableaux with a line or two each (the night lake, the village, Lilja on the ice, the coat by the door, waking). It hints that something is missing and never says that memory is magic. Skippable; shown once per new game; older saves skip it. | Daniel chose the form; scenes and lines are Claude's draft |
| Chapter 1 ends as the design says: once the ice road is open and Signe rests, morning comes and the Tithe has taken Lilja across it. "Why you left" forms. The rest prompt warns that anything could come over the road by morning. | Daniel |
| If Signe hollowed Reeve Olle, Kronvall sends its own men, who take Lilja and the blank Reeve too. | Daniel |
| If Signe hollowed Lilja, she is taken anyway; "Why you left" forms colder: "to bring Lilja home, even if nobody is in there to bring". | Daniel; wording is Claude's draft |
| If the swim is burned, Signe goes for a girl she doesn't know because Torvald asks (or, if he is hollowed, because she means to anyway): "to bring home the girl they took". | Daniel; wording is Claude's draft |
| The ending film reflects chapter 1: who took her, how Signe knew her, who gave, who she emptied (wolves too), what she burned, the nets, Maren's Winter noticed, the promise kept or broken (an open promise counts as broken), and whether the village knew. Then "Chapter 2: Järnfors", not yet written; the player can stay in Kallsjö or start over. Lilja and Olle are gone from the village, and the others say a line about it. | Claude's draft |
| The save knows its chapter and keeps a record of each finished chapter (src/systems/chapters.ts), for Järnfors to read. Quests belong to a chapter. Save version 5. | Daniel chose it; the shape is Claude's |
| A first design draft for chapter 2 is in docs/chapter-2-jarnfors.md. Its ten open questions are decided (its "Decided" table); the rest is still draft. | Daniel answered the questions; content is Claude's draft |
| Sound is synthesised in the browser, no files: wind, steps by surface, ice, Craft tones, wolves, hollowing, burning, chimes, Echoes, the fire, a low drone. It starts muted for now; the speaker button turns it on. | Daniel |
| Art: outlines on object sprites, shadows under people and wolves, falling snow, a cold vignette. Performance: depth sorting and view culling no longer touch everything on the map (worst frame 22.5 ms to 5 ms). | Claude, on Daniel's "fix the art a bit, consider performance" |

## World changes and playtesting (step 7)

Daniel's answers before step 7, and how they were built.

| Decision | Status |
| --- | --- |
| The hermit's hut stands empty once he has given the route: he gave away what kept him on the headland and moves into the village, near the fire. If he is hollowed instead, his Hollow sits in the empty doorway. | Daniel |
| Being seen: hollowing someone while others are close by gets seen; the village then knows it was Signe (see above). | Daniel; "close by" is a tuning value to draft |
| Quest endings change the village visibly: Ebbe's nets out at the fishing holes when mended or given (torn, empty racks when he is hollowed); burnt-out torches at the statue after the play (nothing if Gerda was hollowed first); fresh spruce markers along the opened ice road, with villagers walking it; open water where a wolf went through and tracks north where the pack fled. | Daniel; the look is Claude's draft |
| Playtesting: Daniel plays the slice straight from a new game, as a new player would, against the design's slice questions. No jump points or checklist page. | Daniel |
| Built: objects can carry a show condition ("flag" or "flag=a|b") and only exist once it holds. New ones are appended to the map so every older object keeps its id (saves refer to objects by id). | Claude |
| Built: the hermit walks to a new village fire in the street; Lilja plays out on the near half of the opened road and Olle walks the far half, toward Kronvall. Anyone with no way to walk to their new spot is simply there. | Claude's draft |
| Built: "seen" means another unhollowed villager within 6 tiles (tuning). Ebbe, Gerda and Lilja then never offer (the hermit already refuses anyone who has emptied someone), and each person says they know. Hollowing a wolf on the ice is never seen. | Claude's draft |
| Built: a wolf's hole on the road never freezes over; tracks run 12 tiles north from where each fled wolf turned. Torvald has a line for the nets out by the hole. | Claude's draft |
| Push never moves a wolf: Craft works on made things (Daniel: keep the domain rule). Tapping a wolf with Push says to push an ice marker into it instead. Aiming stays as everywhere else. | Daniel |
| Things to push in the fight (Daniel: yes, add some): a supply sled from the far side that never made it across, its load spilled, is what brought the starving wolves onto the road. The sled and four crates stand on the far half of the road; Signe can look at the sled. | Daniel; the lore and placement are Claude's draft |
| Fixed (Daniel's playtest): trees no longer grow within 3 tiles of ruins, the shelter or places to look at, so Maren's house and the shelter door are reachable; the empty village's shelter has a dark window. A map test keeps it so. | Daniel's report |

## The hunger: hollowing made tempting

Daniel: hollowing "should be unbearably tempting once you tried it". His design, approved as is; the numbers are drafts (tuning values in the debug panel).

| Decision | Status |
| --- | --- |
| A bigger first taste: hollowing gives +10 Power once (was 5). They also give everything they knew: the skill they teach (+2 levels, as before) and their knowledge, with no quest. | Daniel; +10 is a draft |
| What each person's knowledge is: the hermit, his safe route; Reeve Olle, what the Tithe does when a village can't pay; Old Gerda, her grandmother's Maren (it goes into Signe's memory of her). | Claude's draft |
| The hunger: after the first hollowing, each rest refills 1 less Power per Echo she carries; never below 0. Wolf Echoes count too: any life she carries crowds the Hearth. | Daniel; wolves counting is Claude's call |
| When Signe is low on Power (1 or less, reserve included) and someone she hasn't hollowed is within 8 tiles, the Echo line points them out ("Gerda is close. She has so much."). | Daniel; the lines, the range and the threshold are drafts |
| Once she has hollowed anyone (people or wolves), "Take everything" is the first choice in every conversation instead of the last before Leave. Still unhighlighted, still asks twice. | Daniel |
| The costs stay: Hollows, village reactions, cold memories, endings. The Hearth page and the messages after hollowing and resting say how much less the Hearth now refills. | Daniel |

## The wolf fight (step 6)

| Decision | Status |
| --- | --- |
| The wolves come out when Signe steps off the cracked ice on the far side anywhere but the hermit's route, while the road isn't open yet. Crossing by the route avoids them (design). | Daniel |
| A wolf that goes through the ice is gone; a wolf hit twice runs; once half the pack is down, the rest flee. | Daniel |
| Hollowing a wolf: +2 Power once (a smaller life than a person's), the wolf goes blank and wanders off, and a wordless Echo (hunger, cold, the pack) speaks up now and then. | Daniel |
| No running from the fight. It ends with the wolves gone, or with Signe fallen (three wounds: "you remember it wrong", back to the last rest). | Daniel |
| Two actions a turn: move up to 3 tiles, use Craft, or take everything from a wolf beside her. Wolves show their run and bite before acting, then run exactly that way, stopping short of anything now in the way. A wolf bites if it ends beside Signe. | Design; numbers are tuning values |
| How a wolf is hurt: Weaken under it (it goes through), Signe's armed trap ice on its run, or a pushed crate or marker (one hit; the push stops at the wolf). Cracked ice holds a wolf: they are light. | Claude's draft |
| Three wolves, 3 tiles a turn, one wound a bite, appearing 4–7 tiles ahead. "Take everything" from a wolf is offered whenever one is beside her, and again when a cast lacks Power. | Claude's draft; tuning values in the debug panel |
| The ice road quest: crossing by the route ends it at once; crossing by strengthened ice ends it once the wolves are gone. | Claude's draft |
| A reload in the middle of the fight brings the pack back where Signe stands. | Claude's draft |

## Offering, hollowing and burning (step 5)

Daniel's answers to the step-5 questions, and the drafts built on them.

| Decision | Status |
| --- | --- |
| Anyone can be hollowed, family included. *Take everything* is in every conversation, never highlighted, and always asks a second time. | Daniel |
| A Hollow stays where they are, blank, greyed out, and leaves an Echo in Signe that speaks up now and then (every 40–90 s). | Daniel; timing and lines are drafts |
| Keepsakes are burned from the journal, any time; the confirmation names only the gain. When a cast lacks Power, the prompt offers *Burn a Keepsake…*. | Daniel; the prompt is Claude's draft |
| Offerings are hard decisions with a reason, not rewards; not everyone gives, and only valuable memories count. Roster: Ebbe (his wife; necessity), the hermit (the route; trust), Gerda (her grandmother's Maren, after the play; so someone remembers), Lilja (the swim, once Signe knows the Tithe takes people; so you'll remember me). Torvald and Olle refuse. | Daniel chose the roster; reasons and lines are drafts |
| The hermit trusts Signe once she has mended Ebbe's nets, the empty village's shelter, or learned what the Tithe does; never once she has hollowed someone in the village. | Daniel ("when he trusts her"); the conditions are drafts |
| The Tithe ledger's mark beside Lilja stays. | Daniel |
| Lilja's promise can be kept once the ice road is open: Signe walks her across. | Daniel |
| Hollowing the hermit gives Signe the safe route (it was in him). The ice road and Maren's Winter get "hollowed" endings; Maren's Winter ends with no play if Gerda is hollowed first. | Claude's draft |
| How others react to a hollowing (Torvald about Lilja, Gerda about Ebbe, Olle and the hermit about "someone emptying people") and every Echo's lines. | Claude's draft, for Daniel to rewrite |
| The village finds out it was Signe only by evidence: nobody can tell from a Hollow who did it, but a hollowing with others close by is seen, and then the village knows. They react (doors shut, nobody offers) without the game ever judging. Built in the slice (step 7). | Daniel |

## The journal map, places to find, and two more quests

Daniel asked for a sketched map of what Signe has found, sketched when she stops (walk too long and she remembers less), for places that make exploring worth it, and for the remaining quests.

| Decision | Status |
| --- | --- |
| When Signe stops (about half a second), she sketches everything within 8 tiles of the steps she still remembers. She remembers the last 45 steps; anything earlier on a longer walk is lost. Both are tuning values. | Daniel's design; numbers are drafts |
| The Map page is a hand sketch, not a survey: patches of 4 × 4 tiles, a wash and one inked line for the lake, a few tree and peak marks, dashed roads, small houses, labelled places. It zooms to what she has sketched. | Daniel asked for neat and pretty, not every detail; the style is Claude's draft |
| Places worth finding, each with a note on the map and (for some) something to learn by looking closely: the island doorpost (Maren and Jon's heights; Jon's stop), the statue's inscription ("She carried us" / "and what did she carry?"), the cairn of names at the pass north, a stove-in Tithe sled whose ledger can be read once mended, and an empty village on the west shore whose shelter becomes a second rest point once its door is mended. | Draft lore and places, invented by Claude to make exploring pay off |
| **The Hollow in the boathouse** (design side quest): ask someone in the village about him (Gerda tells, Ebbe won't), read the Tithe ledger, read the cairn. Ends on what the Tithe does when a village can't pay: takes a person whole. | Draft, from the design's one-line description |
| **Maren's Winter** (design side quest): Gerda asks Signe to play young Maren at the statue. If she still has *the story*, the play (Maren gave up nothing) contradicts Father's version (she gave up something dear); if she has seen the doorpost, she notices the play has no brother. | Draft, from the design ("the first lore crack") |
| The ledger's last page has a mark beside Lilja's name: foreshadowing the end of chapter 1. | Daniel: keep it. |
| The bar separates the four plain actions from carried Weaves (a divider and a ✦). A Weave that is only a plain action (an object, no twist, no memory) can't be saved. | Draft, from Daniel's confusion over "7 Weaves" |

## Memories of people, and carrying Weaves

Daniel's ideas: Signe should form memories of the people she meets (an outline, not a transcript, coloured by who she is), and she should only carry a few Weaves at once, with lore for why.

| Decision | Status |
| --- | --- |
| Each conversation topic, once asked, disappears; what Signe took from it becomes an impression of that person, kept in the game state and shown in the journal's **People** page. | Decided by Daniel |
| Impressions can be lost: burning a Keepsake blurs what rests on it (the swim: everything about Lilja, who becomes "a girl from the village"; the story: Torvald's tale and Gerda's Maren lore). | Decided by Daniel; which memory rests on which Keepsake is Claude's draft |
| How she sees people follows who she has become: once she carries an Echo, her impressions turn cold (what people are worth to her, not who they are). Each person also shows where they stand: in her Hearth, lost faith, hollowed by her. | Decided by Daniel; the cold texts are drafts |
| All impression texts are in `content/data/impressions.ts`, with blurred and cold variants. | Draft |
| A short note after a conversation says when she formed a new memory of someone. | Draft |
| **Signe carries three Weaves at once** (tuning `weaveSlots`); only those are on the bar. She keeps knowing the rest. | Decided by Daniel |
| **Lore:** a Weave is Craft shaped ahead of time and carried the way a memory is carried; a fourth presses on something of her own. Reshaping or refocusing takes quiet, so it's done by the fire at home (tap the house). Away from home the Weave screen only shows what she carries. Ebbe's lesson ends on this. | Daniel asked for lore; this lore is Claude's draft |
| Anchored Weaves also take a slot when carried; their effects are still permanent. | Draft |

## Quests, the journal and the cracked ice

Daniel asked for story progress to be visible as quests, and to see his givers (the Hearth).

| Decision | Status |
| --- | --- |
| Quests are read from the game state (flags, Offerings, hollowing): they start, tick off steps and end by themselves; an ending is kept for good. Defined in `content/data/quests.ts`. | Draft |
| The net-mender's hands starts on meeting Ebbe and ends when both nets are mended, or when he gives his memory (or, later, if he is hollowed). | Draft, from the design |
| **Weaves are taught by Ebbe** once his quest ends, either way: "a net is made before the fish comes". The Weaves button appears only then. | Decided by Daniel (taught by a person); Ebbe and the line are Claude's draft |
| The ice road is broken by a band of cracked ice, three tiles deep, across the whole lake, so it can't be walked around on the ice. Cracked ice breaks under Signe (a wound) unless strengthened. Villagers keep off it. | Draft |
| The quest starts when Torvald or the hermit tells Signe about the cracked ice, or when she goes through it. It ends when she crosses the band on foot: by strengthened ice, or by the hermit's route. Then the road is open again and drawn as road. | Draft |
| **The hermit's safe route** is a memory he gives as an Offering: one column through the band, east of the road, which Signe then sees marked. He offers it only after the nets quest is done ("do something for this village first"). | Draft |
| **Villagers can fall through Signe's trap ice**: they climb out hurt, remember it (their dialogue says so), and someone in her Hearth loses faith. | Decided by Daniel |
| Ebbe's memory of his wife teaches Mend: it's a memory of his knots. | Decided by Daniel |
| Old Gerda's hint about Maren's first burn stays as it is. | Decided by Daniel |
| The journal has three pages: Quests, Hearth (a pyramid of givers on Signe's own Power, plus anyone who lost faith and the Echoes she carries) and Keepsakes ("Your name" stays hidden). | Draft |
| The game fills the screen at a whole-pixel scale in either orientation; the short side shows about 270 game pixels. HUD buttons are at least 48 px tall on touch screens. | Daniel asked for it to fit the screen; the numbers are a draft |
| Tapping with a Craft action is forgiving: anywhere on an object's picture counts. Out of reach, Signe walks closer and then casts. | Draft, from Daniel's playtest |

## People moving and meeting

Daniel asked for people to move about near their spots, and for nearby people to walk over to each other, talk a little and part again.

| Decision | Status |
| --- | --- |
| Each person wanders within a few tiles of their spot (in `content/data/npcs.ts`): Lilja 5 tiles and only on the ice, Olle and the hermit 4, Ebbe 3, Gerda 2. Torvald stays at his fishing hole and the Hollow doesn't move. | Draft |
| Every 14–30 seconds, two people whose spots are near each other may meet: one walks over (whoever wanders further; Torvald is always visited, never leaves his hole), they say two or three lines in speech bubbles, then both go back. Pairs are in `content/data/meetings.ts`, lines in `content/ink/meetings.ink`. | Draft |
| Nobody walks into Signe or her next steps. Someone Signe is talking to, or walking over to, holds still. | Draft |
| Villagers can fall through Signe's trap ice: see "Quests, the journal and the cracked ice". | Decided by Daniel |
| Where people stand isn't saved: after a reload they're back at their spots. | Draft |
| Ebbe notices when Signe mends his nets, one rack or both. Once both are whole he no longer asks for help or offers his memory. Gerda's meeting with him mentions it too. | Draft (dialogue), from Daniel's playtest note |

## The Kallsjö map (step 1, rebuilt)

Daniel asked for a much bigger world with roads, mountains and forest, and for people to stand where their dialogue puts them. Decided by Daniel: 256 × 256 tiles, mountains as an impassable backdrop (flat ground, no climbing), Lilja on the ice by the jetty, layout drafted by Claude for approval. See [map-overview.svg](map-overview.svg).

| Decision | Status |
| --- | --- |
| The lake fills the middle of the valley (about 136 tiles across); birch forest rings it; mountains ring the forest. | Draft, from the design ("the lake is the centre of the map") |
| Signe's village sits on the near (south-west) shore, with her home, Old Gerda's house, Ebbe's hut and net racks, two boathouses, two more houses, a jetty with reeds, and Saint Maren's statue on the shore. | Draft |
| The ice road runs straight across the lake from the village to the far shore, marked with poles and spruce sprigs, and continues through a pass north. | Draft. The design doesn't say where the ice road leads. |
| A road leaves the village through a pass south: the way out of the valley. A shore track runs east around the lake to the hermit's hut on a headland. | Draft |
| Maren's ruined birth village is three ruined walls on an island in the lake, reachable over the ice. | Draft, from the design |
| Torvald fishes at a hole in the ice near the start of the ice road. Lilja plays on the ice at the end of the jetty. Ebbe stands at his net racks, Gerda by the statue near her house, Olle by his sled in the street, the Hollow at the boathouse door, the hermit outside his hut. | Torvald and Lilja decided by Daniel; the rest draft |
| A second hole of open water lies out on the lake, away from the road. | Draft |
| Only one of the design's "fishing villages" ringing the lake is built; the slice has one village. | Draft |

## Dialogue drafts (step 3)

All lines in `content/ink/` are Claude's first drafts. They stay within the design doc's facts, except for the details below, which are invented and need your call.

| Where | Invented detail | Why it's there |
| --- | --- | --- |
| Ebbe | He has mended nets for "forty winters". His memory of his wife: on the jetty, the first spring, laughing at his bad knots. | The design says he offers his last memory of his wife; it needed a concrete memory. |
| Old Gerda | Her grandmother says Maren loved her little brother, and that the winter Maren saved the lake she stopped knowing her mother's face. | Gerda is the slice's lore source. This hints at Maren's first burn (her mother's face, to save her brother) and contradicts Torvald's story. It may reveal too much too early. |
| Torvald | His story has "the saint, the starving lake, the miracle on the ice". | The design only calls it a garbled history of the predecessor. |
| Reeve Olle | He calls the Tithe "a share of what you know, for the Hearth at Kronvall" and says "Saint Maren carries all of us". If a village can't pay, "Kronvall decides". | Shows he believes in his duty without spoiling the end of chapter 1. |
| The hermit | He lives apart because "out here they forget to count" heads for the Tithe. | Gives him a reason to be alone. |
| Lilja | Signe's promise to take her across the ice once the road is safe. | A promise to exercise the promise system; chapter 5 tests promises. |
| The Hollow | Placed outside the boathouse door, since the boathouse has no interior yet. | Placeholder until step 7. |

## Dialogue system (step 3)

| Decision | Status |
| --- | --- |
| A line written `Name: text` is spoken by that person; anything else is narration. | Draft |
| Once "your name" is burned, nobody says "Signe" and her speaker label disappears. | Draft, from the design ("the game stops using your name") |
| Dialogue shows in an HTML box over the game, not in pixel text, so it stays readable on phones. | Draft |
| Each conversation starts fresh from GameState; "have we met" is a world flag (`met_ebbe`), never Ink state. | From CLAUDE.md |
| The game saves after every conversation, as well as whenever Signe stops walking. | Draft |
| Tap someone to walk beside them and talk; or stand beside them and press E, Space or Enter. | Draft |
