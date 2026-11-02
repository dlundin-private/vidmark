// Every conversation in the slice. The game starts a conversation at the knot
// named after the person (=== ebbe ===, === lilja === ...).
//
// Writing conventions:
//   Ebbe: A line.        spoken line; the name before ": " is the speaker
//   A line.              narration
//   Signe: A line.       Signe speaks; once her name is burned the game hides the label
//
// ALL TEXT IS A FIRST DRAFT by Claude, for Daniel to rewrite.

INCLUDE externals.ink
INCLUDE people/ebbe.ink
INCLUDE people/hermit.ink
INCLUDE people/gerda.ink
INCLUDE people/olle.ink
INCLUDE people/hollow.ink
INCLUDE people/lilja.ink
INCLUDE people/torvald.ink
INCLUDE meetings.ink
INCLUDE death.ink

-> END

// Shared: what is left when someone has been hollowed by Signe.
=== hollowed(name) ===
{name} looks at you the way the lake looks at the sky.
There is nobody behind the eyes to remember you. Not even to remember being asked.
-> END
