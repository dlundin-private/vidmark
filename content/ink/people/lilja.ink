// Lilja, Signe's little sister. Bright and fearless on the ice.
// Design: burning "the swim" makes Signe greet Lilja as a stranger.

=== lilja ===
{ is_hollowed("lilja"): -> hollowed("Lilja") }
{ flag("hurt_by_trap_lilja"): Lilja: I fell in! The ice just opened. I wasn't even past the reeds. I'm so cold. }
{ not has_keepsake("swim"): -> stranger }
Lilja: {name_known(): Signe! Signe, look! | Look! Look!}
Lilja: I slid all the way from the jetty to the reeds and I didn't fall once.
-> talk

= talk
* [Tell her to be careful] Signe: Not past the reeds. The ice is thin there.
    Lilja: You always say that.
    Lilja: You said that about the water too, and then you taught me to swim in it.
    -> talk
* {not promise_made("lilja_ice")} [Promise to take her out on the ice] Signe: When the road is safe, I'll take you all the way across.
    ~ make_promise("lilja_ice", "lilja")
    Lilja: Promise?
    Signe: Promise.
    -> talk
+ [Leave] -> END

= stranger
A girl comes running across the ice toward you, red-cheeked and grinning.
Signe: Hello. Are you lost? Where are your people?
The girl stops. The grin stays on her face a moment too long, as if it doesn't know yet.
Lilja: It's me.
Lilja: {name_known(): Signe. It's me. | It's me.}
You smile at her, the way you would at any child, and wait for her to explain.
-> END
