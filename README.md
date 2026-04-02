## Creating quasi-random music from JSON Input

This started as a AI generated project (GPT-5-something). We were able to quickly get an app skeleton built, as well as an "apparently working" first version. As AI was requested to add features, things broke.

**This is important!** Don't ever go down the rabbit hole of debugging with the "help" of an AI. Trust me.

### JSON Input Description (a _song_)

The JSON input file describes a song — the _song_ definition consists of some global info, and _parts_: an array of objects, each describing its part of the song. The JSON for a part contains some "common" info (like the name and the number of measures the part covers), and then an array of _voices_. Examples of song parts would be "intro," "bridge", "chorus", etc. A song might consist of only one part if it is, for example, a lone bass line.

To render a part, we generate lines of notes, for each voice, based its parameters. The term "voice" might be misleading, as we say nothing about how lines in parts "sound." We are only generating MIDI files containing notes; what sounds come out for these notes is a job for the DAW.

We have three schemes for generating notes:

* Riffs based on the notes of a given key; and/or specific intervals in that key;
* Riffs based on the notes in a given sequence of chords;
* A specific chord pattern in a given _range_.

The _type_ param of a voice defines what will be generated; the values are **freeform**, **chordal**, and **chords**.

The parameters below can appear at either the _part_ or _voice_ level.

* _duration_ is one or more of these values: [ **1**, **1/2**, **1/4**, **1/8**, **1/16**, **1/32**, **1/64** ]. These correspond, respectively, to the notes from Whole to Sixty-Fourth.

* Each duration value can have a single character suffix **a** - **z**. It specifies the weight of that duration entry; **a** = 1, **b** = 2, etc., defining increasing likelihood of the corrresponding length to be chosen.  For example, **"duration": [ "1/16b", "1/8d", "1/4d", "1/2b" ]** specifies events to have one of four note lengths, with Eigths and Quarters carrying twice the weight of sixteenths and halves.

* _restPct_ can be a single value; more likely, an array is useful. Each array element is the probably of a rest during the corresponding beat. Thus, if meter denominator is **4**, there should be four array entries; eg: [ **0**, **0.25**, **0.25**, **0.1** ].

* If we do rest based on _restPct_, the rest length is based on _duration_.

* _tonicPct_ works like _restPct_, specifying the likelihood we'll stick to the root within a given beat. NOTE: if _type_ is **freeform** then the tonic is the root of the given _key_. Otherwise, it's the root of the "current chord."

* _passingNotes_ can be used to define a more limited set. These are specified as "classic intervals" – eg: **[ "II", "III", "bV", "#VI", "VII" ]** relative to the _key_.

The global _loglevel_ param requests increasing amount of debugging detail: currently **0** through **4** are used. 0 means no debug info and 4 is a lot.

We _assume_ the MIDI ticks/beat (PPQN) to be 480. Other values 
"should" work. The _ppqn_ song param can specify an alternate, if one is brave....

**[ THIS IS STILL A MESS! ]**

**[ WE NEED A PARAM DICTIONARY! ]**


### MIDI Timing

MIDI specifications typically use a default of 480 ticks per quarter note, which means there are 480 ticks for each beat in _4/4_ time. However, this can vary depending on the specific MIDI device or software being used. Again, we use 480, which should work forever.

#### Understanding Ticks

* Pulses Per Quarter Note (PPQN): This is the measurement of resolution in MIDI. A higher PPQN allows for finer timing control.

* Ticks: Each pulse (_tick_) represents a fraction of a beat. For example, at 480 PPQN, a sixteenth note would be represented by 120 ticks (a 16th is 1/4 of a quarter note; so 480/4 = 120). A 64th note would be 30 ticks.

#### Common MIDI Resolutions

| PPQN | Ticks / beat | x4 = ticks per 4/4 |
|:----|:----|:-----|
|  24 |  24 |   96 |
|  48 |  48 |  192 |
|  96 |  96 |  384 |
| 120 | 120 |  480 |
| 480 | 480 | 1920 |
| 960 | 960 | 3840 |

#### Default Values

* The default MIDI tempo is typically set at 120 beats per minute (BPM).

* The default ticks per quarter note is normally 480. The charts below assume 480 ppqn.


#### Ticks per Notes

##### Straight Notes

| Note  | Ticks |
|:------|:------|
| Whole | 1920 |
| Half | 960 |
| Quarter | 480 |
| 8th | 240 |
| 16th | 120 |
| 32nd | 60 |
| 64th | 30 |
| 128th | 15 |

##### Dotted Notes [_multiply straight value by 1.5_]

| Note  | Ticks |
|:------|:------|
| Dot Half | 1440 |
| Dot Quarter | 720 |
| Dot 8th | 360 |
| Dot 16th | 180 |
| Dot 32nd | 90 |
| Dot 64th | 45 |

##### Triplet Notes [_multiply by .66 and round up_]

| Note  | Ticks |
|:------|:------|
| Half Trip | 640 |
| Quarter Trip | 320 |
| 8th Trip | 160 |
| 16th Trip | 80 |
| 32nd Trip | 40 |
| 64th Trip | 20 |

```
© 2026. Sven Bert Olsson.
```

