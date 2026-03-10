## Create quasi-random Riffs from JSON Input
This started as a AI generated project (GPT-5-something). We were able to quickly get an app skeleton built as well as an "apparently working" first version. As AI was requested to add features, things broke.

**This is important!** Don't ever go down the rabbit hole of debugging with the "help" of an AI. Trust me.

### JSON Input Description
- The denominator of *meter* will be the quickest note that can be generated. Want eight quavers to cover 4 quarters? *Meter* should be 4/8; to generate a quarter note, specify an event that lasts 2 "beats" —— UPDATE: this works, sorta, but not really; a better way is imminent...
- *key* is C-B; translated to 0-11 as keyRoot
- If we do rest based on *restPct*, the rest length is *noteDuration*
- Some stuff is in a *voice* block; allows for multiple instruments; if we get there
- *noteDuration* can be an array; add multiple 1's, eg, to emphasize quarters (I think)
- Most places a single value works? an array will cause a random choice

### Thoughts

- We could pick freeforms either from key or "fill notes" why would we need both? Same on chordal: just pick fill notes from the chord.
- BTW. fill notes are "intervals" ( "II", "III", "V", etc ), and could be optional, only used to add notes "out of key or chord"
