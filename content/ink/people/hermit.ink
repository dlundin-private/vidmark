// The hermit. Quest: The ice road (built in step 7).
// Design: the old safe route across the lake lives in his memory; the
// hollowing shortcut is the hermit himself.

=== hermit ===
{ is_hollowed("hermit"): -> hollowed("The hermit") }
{ flag("hurt_by_trap_hermit"): The hermit: Went through the ice this morning. Fifty winters, and it's never opened under me like that. Somebody did that. }
{ has_offered("hermit"): -> after_offering }
{ flag("met_hermit"):
    The hermit: You again.
- else:
    ~ set_flag("met_hermit", true)
    The hermit is gutting a fish with slow, careful cuts. He doesn't look up.
    The hermit: Nobody comes out here unless they want something.
}
-> talk

= talk
* [Ask about the ice road] Signe: The road across the lake is breaking up.
    ~ set_flag("heard_ice_road", true)
    The hermit: It always breaks. Halfway over there's a band of rotten ice, right across the lake. Every spring, the same place.
    The hermit: Folk forgot where it's thick enough to walk. I didn't. I walked it before most of them were born.
    -> talk
* {flag("heard_ice_road")} [Ask him for the safe way across] Signe: Will you tell me where the ice is thick?
    { flag("quest_nets"):
        The hermit: Word gets out here, even. You're the one who sorted Ebbe's nets.
        The hermit: My legs don't go on the ice anymore. Telling you won't do. You'd need to remember it the way I do, every step.
        The hermit: I can give it to you. Then it's yours, and not mine.
        ** [Take his memory of the route] Signe: I'll walk it carefully.
            ~ offer("hermit")
            ~ set_flag("knows_safe_route", true)
            The hermit closes his eyes. When he opens them he looks out at the lake as if it were any lake.
            You can see it now: one line through the rotten ice, east of the road, where it is thick. You know every step.
            -> END
        ** [Not yet] Signe: Keep it a while longer.
            The hermit: It's kept me company. It can keep me a while yet.
            -> talk
    - else:
        The hermit: I don't give what's mine to strangers. Do something for this village first, and I'll hear about it.
        -> talk
    }
* [Ask why he lives alone] Signe: Why do you live out here?
    The hermit: The Tithe-men count heads in the village. Out here they forget to count.
    -> talk
+ [Leave] -> END

= after_offering
The hermit: Somebody asked me about the ice once. Can't think what I told them.
-> END
