// Lilja, Signe's little sister. Bright and fearless on the ice.
// Design: burning "the swim" makes Signe greet Lilja as a stranger.

=== lilja ===
{ is_hollowed("lilja"): -> hollowed("Lilja") }
-> reacts("lilja") ->
{ flag("hurt_by_trap_lilja"): Lilja: I fell in! The ice just opened. I wasn't even past the reeds. I'm so cold. }
~ remember("lilja", "met")
{ not has_keepsake("swim"): -> stranger }
Lilja: {name_known(): Signe! Signe, look! | Look! Look!}
Lilja: I slid all the way from the jetty to the reeds and I didn't fall once.
-> talk

= talk
* {not remembers("lilja", "careful")} [Tell her to be careful] Signe: Not past the reeds. The ice is thin there.
    ~ remember("lilja", "careful")
    Lilja: You always say that.
    { not has_offered("lilja"): Lilja: You said that about the water too, and then you taught me to swim in it. }
    -> talk
* {(not promise_made("lilja_ice")) and not remembers("lilja", "promise")} [Promise to take her out on the ice] Signe: When the road is safe, I'll take you all the way across.
    ~ remember("lilja", "promise")
    ~ make_promise("lilja_ice", "lilja")
    Lilja: Promise?
    Signe: Promise.
    -> talk
* {has_flag("knows_tithe_takes_people") and not has_offered("lilja")} [Tell her to stay close to home] Signe: Stay close to home for a while. Near Father.
    Lilja: Because of the Tithe-men? I heard what they do. Olle's men count the children.
    Lilja: If they take me, I want you to have something of me. Something real.
    Lilja: The swim. When you held me up in the water and let go, and I didn't sink. Take it. Then you'll always remember me.
    ** [Take her memory] Signe: ...All right.
        ~ offer("lilja")
        ~ remember("lilja", "gave_swim")
        Lilja blinks, then laughs at nothing in particular.
        Lilja: What were we saying? Can we go sliding?
        -> END
    ** [Refuse] Signe: I'll remember you anyway. Keep it.
        Lilja: Promise?
        Signe: Promise.
        -> talk
* {promise_made("lilja_ice") and has_flag("ice_road_open") and not promise_kept("lilja_ice")} [Take her across the ice road] Signe: The road's safe now. Come on. All the way across, like I promised.
    ~ keep_promise("lilja_ice")
    ~ remember("lilja", "kept_promise")
    You walk the ice road together, past the spruce sprigs, over the place where it used to be rotten. Lilja runs ahead and slides and runs back.
    On the far shore she turns round and looks at the village, small and far away across the white.
    Lilja: You kept it.
    -> talk
+ [Take everything] -> take_everything("lilja", "Lilja")
+ [Leave] -> END

= stranger
A girl comes running across the ice toward you, red-cheeked and grinning.
Signe: Hello. Are you lost? Where are your people?
The girl stops. The grin stays on her face a moment too long, as if it doesn't know yet.
Lilja: It's me.
Lilja: {name_known(): Signe. It's me. | It's me.}
You smile at her, the way you would at any child, and wait for her to explain.
+ [Take everything] -> take_everything("lilja", "the girl")
+ [Leave] -> END
