// The hermit. Quest: The ice road (built in step 7).
// Design: the old safe route across the lake lives in his memory; the
// hollowing shortcut is the hermit himself.

=== hermit ===
{ is_hollowed("hermit"): -> hollowed("The hermit") }
-> reacts("hermit") ->
{ flag("hurt_by_trap_hermit"): The hermit: Went through the ice this morning. Fifty winters, and it's never opened under me like that. Somebody did that. }
{ has_offered("hermit"): -> after_offering }
{ flag("met_hermit"):
    The hermit: You again.
- else:
    ~ set_flag("met_hermit", true)
    ~ remember("hermit", "met")
    The hermit is gutting a fish with slow, careful cuts. He doesn't look up.
    The hermit: Nobody comes out here unless they want something.
}
-> talk

= talk
* {not remembers("hermit", "ice_road")} [Ask about the ice road] Signe: The road across the lake is breaking up.
    ~ remember("hermit", "ice_road")
    ~ set_flag("heard_ice_road", true)
    The hermit: It always breaks. Halfway over there's a band of rotten ice, right across the lake. Every spring, the same place.
    The hermit: Folk forgot where it's thick enough to walk. I didn't. I walked it before most of them were born.
    -> talk
* {not has_offered("hermit") and flag("heard_ice_road") and (not remembers("hermit", "refused_route") or hermit_trusts())} [Ask him for the safe way across] Signe: Will you tell me where the ice is thick?
    { hermit_trusts():
        The hermit: Word gets out here, even. {has_flag("quest_nets"): You're the one who sorted Ebbe's nets.|{has_flag("shelter_mended"): You're the one who put a door back on that shelter in the empty village.|You've been asking after the Tithe. Good. Somebody should.}}
        The hermit: My legs don't go on the ice anymore. Telling you won't do. You'd need to remember it the way I do, every step.
        The hermit: I can give it to you. Then it's yours, and not mine.
        ** [Take his memory of the route] Signe: I'll walk it carefully.
            ~ offer("hermit")
            ~ set_flag("knows_safe_route", true)
            ~ remember("hermit", "gave_route")
            The hermit closes his eyes. When he opens them he looks out at the lake as if it were any lake.
            You can see it now: one line through the rotten ice, east of the road, where it is thick. You know every step.
            -> END
        ** [Not yet] Signe: Keep it a while longer.
            The hermit: It's kept me company. It can keep me a while yet.
            -> talk
    - else:
        ~ remember("hermit", "refused_route")
        The hermit: I don't give what's mine to strangers. Do something for this village first, and I'll hear about it.
        -> talk
    }
* {not remembers("hermit", "alone")} [Ask why he lives alone] Signe: Why do you live out here?
    ~ remember("hermit", "alone")
    The hermit: The Tithe-men count heads in the village. Out here they forget to count.
    -> talk
+ [Take everything] -> take_everything("hermit", "The hermit")
+ [Leave] -> END

= after_offering
The hermit: Somebody asked me about the ice once. Can't think what I told them.
-> talk

// He trusts her once she has helped the village in any way he would hear of (decided by Daniel), unless she has been emptying people.
=== function hermit_trusts() ===
~ return (has_flag("quest_nets") or has_flag("shelter_mended") or has_flag("knows_tithe_takes_people")) and not emptied_someone()
