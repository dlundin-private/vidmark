// The only way dialogue sees or changes the game: these functions are bound
// to GameState in src/systems/dialogue.ts. Dialogue keeps no state of its own,
// so never use VAR for anything that must last beyond one conversation.
//
// Ids: Keepsakes "swim" "coat" "story" "shame" "whyYouLeft" "name";
// people "ebbe" "hermit" "gerda" "olle" "hollow" "lilja" "torvald".

// --- Reading -----------------------------------------------------------------
EXTERNAL has_keepsake(id)      // Signe still has it (formed and not burned or consumed)
EXTERNAL is_hollowed(who)
EXTERNAL has_offered(who)      // gave Signe an Offering (true even if later hollowed)
EXTERNAL in_hearth(who)        // offered, not hollowed, not faithless
EXTERNAL name_known()          // false once "your name" is burned: then nobody says it
EXTERNAL flag(name)            // a world flag; 0 if never set (reads as false, and compares as a number)
EXTERNAL has_flag(name)        // true if a flag is set to anything (use for flags holding text, like quest outcomes)
EXTERNAL promise_made(id)
EXTERNAL promise_kept(id)
EXTERNAL has_domain(domain)    // Signe holds this domain: "craft", "kin"
EXTERNAL dam_rests()           // rests left before the dam breaks (0 when saved, lost, or not ringing)
EXTERNAL dam_cost(route)       // Power a way of saving the dam costs: "knit", "taken", "held"
EXTERNAL dam_save(route, anchor_kind, anchor_id) // tries it; true if the dam is saved that way
EXTERNAL carries_echoes()      // Signe has hollowed anyone (people or wolves)
EXTERNAL power()               // Power Signe can spend right now
EXTERNAL remembers(who, key)   // Signe remembers this about someone (an impression, or that she asked)

// --- Changing ----------------------------------------------------------------
EXTERNAL set_flag(name, value)
EXTERNAL make_promise(id, who)
EXTERNAL offer(who)            // record an Offering from this person
EXTERNAL hollow_person(who)         // Signe takes everything from this person: they become a Hollow
EXTERNAL keep_promise(id)      // Signe kept a promise
EXTERNAL remember(who, key)    // Signe forms an impression of someone (texts: content/data/impressions.ts)
