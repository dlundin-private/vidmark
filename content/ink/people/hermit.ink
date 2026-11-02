// The hermit. Quest: The ice road (built in step 7).
// Design: the old safe route across the lake lives in his memory; the
// hollowing shortcut is the hermit himself.

=== hermit ===
{ is_hollowed("hermit"): -> hollowed("The hermit") }
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
    The hermit: It always breaks. Every spring, the same places.
    The hermit: Folk forgot where the ice is thick. I didn't. I walked it before most of them were born.
    -> talk
* [Ask him to show the way] Signe: Will you show me the safe way?
    The hermit: Show you? My legs don't go on the ice anymore.
    The hermit: It's in here. {in_hearth("hermit"): Maybe one day I'll trust someone with it. | And it stays in here.}
    -> talk
* [Ask why he lives alone] Signe: Why do you live out here?
    The hermit: The Tithe-men count heads in the village. Out here they forget to count.
    -> talk
+ [Leave] -> END
