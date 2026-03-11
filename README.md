## Create quasi-random Riffs from JSON Input

This started as a AI generated project (GPT-5-something). We were able to quickly get an app skeleton built as well as an "apparently working" first version. As AI was requested to add features, things broke.

**This is important!** Don't ever go down the rabbit hole of debugging with the "help" of an AI. Trust me.

### JSON Input Description

* _key_ is C-B; translated to 0-11 as _keyRoot_ (and placed into the JSON spec).
* We _assume_ the MIDI ticks/beat (PPQN) to be 480. Other values _should_ work.
* _fastestNote_ is the quickest we'll generate; must be one of these values: [ **1**, **1/2**, **1/4**, **1/8**, **1/16**, **1/32**, **1/64** ]. Meaning a melody consisting of any "plain" note from Whole to Sixty-Fourth can be specified.
* If we do rest based on _restPct_, the rest length is _noteDuration_.
* _restFirstBeat_ controls whether a rest on beat 0 is allowed.
* Some stuff is in a _voice_ block; allows for multiple instruments; if we get there.
* _noteDuration_ can be an array; add multiple 1's, eg, to emphasize quarters (I think).
* Most places a single value works? an array will cause a random choice.

### MIDI Timing [by Duck.Ai]

MIDI specifications typically use a default of 480 ticks per quarter note, which means there are 480 ticks for each beat in a 4/4 time signature. However, this can vary depending on the specific MIDI device or software being used.

#### Understanding Ticks

* Pulses Per Quarter Note (PPQN): This is the measurement of resolution in MIDI. A higher PPQN allows for finer timing control.
* Ticks: Each pulse (_tick_) represents a fraction of a beat. For example, at 480 PPQN, a sixteenth note would be represented by 120 ticks (a 16th is 1/4 of a quarter note; so 480/4 = 120). A 64th note would be 30 ticks.

#### Common MIDI Resolutions

| PPQN | Ticks / beat | x4 = ticks per 4/4|
|:----|:----|:-----|
|  24 |  24 |   96 |
|  48 |  48 |  192 |
|  96 |  96 |  384 |
| 120 | 120 |  480 |
| 480 | 480 | 1920 |
| 960 | 960 | 3840 |

#### Default Values

* The default MIDI tempo is typically set at 120 beats per minute (BPM).
* The default ticks per quarter note is normally 480.

### Thoughts

* We could pick freeforms either from key or "fill notes" why would we need both? Same on chordal: just pick fill notes from the chord.
* BTW. fill notes are "intervals" ( "II", "III", "V", etc ), and could be optional, only used to add notes "out of key or chord"
