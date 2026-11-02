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
EXTERNAL promise_made(id)
EXTERNAL power()               // Power Signe can spend right now

// --- Changing ----------------------------------------------------------------
EXTERNAL set_flag(name, value)
EXTERNAL make_promise(id, who)
EXTERNAL offer(who)            // record an Offering from this person
