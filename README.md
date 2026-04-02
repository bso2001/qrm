## Creating quasi-random music from JSON Input

This started as a AI generated project (GPT-5-something). We were able to quickly get an app skeleton built, as well as an "apparently working" first version. As AI was requested to add features, things broke.

**This is important!** Don't ever go down the rabbit hole of debugging with the "help" of an AI. Trust me.

### JSON Input Description (_ie, a song_)

The JSON input file describes a song — the song definition consists of some global info, and the song's _parts_: an array of objects, each describing its section of the song. The JSON for a part contains, again, some common info, followed by an array of _voices_.

To render each part, we generate "lines of notes," one for each voice, based on the voice parameters.
```
The term "voice" might be misleading, as we say nothing about how lines in parts "sound." We are only generating MIDI files containing notes; what sounds come out for these notes is the job of the DAW.
```

Thus, one part of the song might require a bass line and a chord sequence; each would be a _voice_, and a line of notes will be generated for each. We have three schemes for generating notes:

* Riffs based on the notes of a given key; and/or specific intervals in that key;
* Riffs based on the notes in a given sequence of chords;
* A specific chord pattern in a given range.

#### Almost All the Details...

**songs/afglo/json** =
```
{
  "name"      // song title (eg, "Afterglowish")
  "outputDir" // the MIDI files are written here
  "tempo"     // in BPM
  "loglevel"  // debug verbosity: 0=quiet; 4=chatty

  "parts" : [ // this song has an intro and an outro
  {
      "name"      // part name: "intro",
      "key"       // eg: { "tonic" : "G", "mode" : "major" }
      "meter"     // eg: { "numerator" : 4, "denominator" : 4 }
      "nMeasures" // # of measures in this part
      "chords"    // a list of chords thru which we cycle
      "velocity"  // an array of min/max velocity; eg: [ 70, 80 ]
      "restPct"   // chance of resting; see Notes below
      "duration"  // event durations; see Notes below

      "voices" : [
        {
          "file"     // the file for this line; eg, bass1.mid
          "type"     // "chordal", "freeform", or "chords"
          "range"    // generate values in this range of MIDI note numbers
          "tonicPct" // the odds we'll produce the root; see Notes below
        },
        {
...
          "type"         // for type "chords",
          "inversionPct" //0.25,
        }
      ]
    },
    {			 // part 2
      "name" : "outro", 
...
      "voices" [
        {
...               // a freeform line chooses notes from key, not chords

          "file" : "bass2.mid",
          "type" : "freeform"
        }, ...
      ]
    }
  ]
}
```
#### Notes

1. _restPct_ can be a single value or an array; the value or values are the % odds we will rest during a given beat. If the value is scalar, the odds are the same for every event. If its an array, then each element is the probably of a rest during the corresponding beat. Thus, if meter denominator is 4, there should be four array entries; eg: [ 0, 0.25, 0.25, 0.1 ].

1. If we do pause based on _restPct_, the rest length is based on _duration_; described below.

1. _duration_ is one or more of these values: [ 1, 1/2, 1/4, 1/8, 1/16, 1/32, 1/64 ]. These correspond, respectively, to the notes from Whole to Sixty-Fourth. Each duration value can have a single character suffix a - z. It specifies the weight of that duration entry; a = 1, b = 2, etc., defining increasing likelihood of the corrresponding length to be chosen. For example, "duration": [ "1/16b", "1/8d", "1/4d", "1/2b" ] specifies events to have one of four note lengths, with Eigths and Quarters carrying twice the weight of Sixteenths and Halves.

1. Like _restPct_, _duration_ can also be a scalar; for example, to generate a bass line of all quarter notes: **"duration" : "1/4"**

1. Virtually all note generation parameters can appear at either the part or voice level. This allows definitions of songs with one part and one voice to be "collapsed." Such song definitions have a _parts_ array, with a single entry, containing all note generation params for the one part/voice. These params are: _key_, _meter_, _file_, _type_, _nMeasures_, _chords_, _range_, _velocity_, _duration_, _restPct_, _tonicPct_, and _inversionPct.

1. Some part params can be "promoted" to the song level when the values apply to the whole song: _key_, _meter_, _nMeasures_, _chords_.

1. Thus, we have some params that can appear at any level: _key_, _meter_, _nMeasures_, and _chords_.

1. We assume the MIDI ticks/beat (PPQN) to be 480. Other values "should" work. The _ppqn_ song-level param can specify an alternate, if one is brave.

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

