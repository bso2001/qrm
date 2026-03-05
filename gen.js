
// Generate quasi-random riffage from JSON input description
// Added freeform vs chordal direction...

const fs = require("fs");

/* ---------------------------------------------------------
   VLQ + MIDI writer core
--------------------------------------------------------- */

function writeVLQ(value) {
  const bytes = [];
  let buffer = value & 0x7F;

  while (value >>= 7) {
    buffer <<= 8;
    buffer |= ((value & 0x7F) | 0x80);
  }

  while (true) {
    bytes.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }

  return bytes;
}

function encodeEvent(ev) {
  const out = [];

  out.push(...writeVLQ(ev.delta));

  switch (ev.type) {
    case "note_on": {
      const status = 0x90 | (ev.channel & 0x0F);
      out.push(status, ev.note & 0x7F, ev.velocity & 0x7F);
      break;
    }
    case "note_off": {
      const status = 0x80 | (ev.channel & 0x0F);
      out.push(status, ev.note & 0x7F, ev.velocity & 0x7F);
      break;
    }
    case "program_change": {
      const status = 0xC0 | (ev.channel & 0x0F);
      out.push(status, ev.program & 0x7F);
      break;
    }
    case "meta": {
      out.push(0xFF);
      switch (ev.meta_type) {
        case "end_of_track":
          out.push(0x2F, 0x00);
          break;

        case "tempo": {
          const t = ev.tempo;
          out.push(0x51, 0x03, (t >> 16) & 0xFF, (t >> 8) & 0xFF, t & 0xFF);
          break;
        }

        case "time_signature": {
          out.push(
            0x58,
            0x04,
            ev.numerator,
            Math.log2(ev.denominator),
            ev.metronome,
            ev.thirtyseconds
          );
          break;
        }

        default:
          throw new Error("Unknown meta event: " + ev.meta_type);
      }
      break;
    }

    default:
      throw new Error("Unknown event type: " + ev.type);
  }

  return out;
}

function writeMidiFromEvents(json, outputPath) {
  const { format, division, events } = json;

  let trackData = [];
  for (const ev of events) {
    trackData.push(...encodeEvent(ev));
  }

  const hasEOT = events.some(
    e => e.type === "meta" && e.meta_type === "end_of_track"
  );
  if (!hasEOT) {
    trackData.push(...writeVLQ(0), 0xFF, 0x2F, 0x00);
  }

  const trackLength = trackData.length;
  const trackHeader = Buffer.from("MTrk");
  const trackLengthBytes = Buffer.alloc(4);
  trackLengthBytes.writeUInt32BE(trackLength);

  const trackChunk = Buffer.concat([
    trackHeader,
    trackLengthBytes,
    Buffer.from(trackData)
  ]);

  const header = Buffer.from("MThd");
  const headerLength = Buffer.alloc(4);
  headerLength.writeUInt32BE(6);

  const formatBuf = Buffer.alloc(2);
  formatBuf.writeUInt16BE(format);

  const nTracksBuf = Buffer.alloc(2);
  nTracksBuf.writeUInt16BE(1);

  const divisionBuf = Buffer.alloc(2);
  divisionBuf.writeUInt16BE(division);

  const headerChunk = Buffer.concat([
    header,
    headerLength,
    formatBuf,
    nTracksBuf,
    divisionBuf
  ]);

  const full = Buffer.concat([headerChunk, trackChunk]);
  fs.writeFileSync(outputPath, full);
}

/* ---------------------------------------------------------
   Theory helpers
--------------------------------------------------------- */

const NOTE_BASES = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4,
  F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11
};

function parseKeyToSemitone(key) {
  const m = key.match(/^([A-G][b#]?)/i);
  if (!m) throw new Error("Bad key: " + key);
  return NOTE_BASES[m[1]];
}

const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

function getScaleOffsets(scaleName) {
  switch (scaleName) {
    case "natural_minor": return NATURAL_MINOR;
    case "major": return MAJOR;
    default: throw new Error("Unsupported scale: " + scaleName);
  }
}

function degreeToSemitoneOffset(degreeStr, keyRoot, scaleOffsets) {
  const romanMap = { I:0, II:1, III:2, IV:3, V:4, VI:5, VII:6 };

  let accidental = 0;
  let core = degreeStr;

  if (degreeStr.startsWith("b")) { accidental = -1; core = degreeStr.slice(1); }
  else if (degreeStr.startsWith("#")) { accidental = 1; core = degreeStr.slice(1); }

  let semitone;
  if (romanMap[core] !== undefined) {
    const idx = romanMap[core];
    semitone = keyRoot + scaleOffsets[idx] + accidental;
  } else {
    const n = parseInt(core, 10);
    const base = scaleOffsets[n - 1];
    semitone = keyRoot + base + accidental;
  }

  return semitone;
}

function rootNoteForKey(key, scaleName, octave) {
  const rootSemitone = parseKeyToSemitone(key);
  return rootSemitone + (octave + 1) * 12;
}

/* ---------------------------------------------------------
   FULL UPDATED CHORD PARSER
--------------------------------------------------------- */

function parseChordSymbol(sym) {
  // Slash chords
  let bassOverride = null;
  if (sym.includes("/")) {
    const [main, bass] = sym.split("/");
    sym = main;
    bassOverride = NOTE_BASES[bass];
  }

  // Extract root + quality
  const m = sym.match(/^([A-G][b#]?)(.*)$/);
  if (!m) throw new Error("Bad chord: " + sym);

  const rootName = m[1];
  const qual = m[2].toLowerCase();
  const root = NOTE_BASES[rootName];

  const intervals = {
    "":        [0, 4, 7],
    "m":       [0, 3, 7],
    "min":     [0, 3, 7],
    "dim":     [0, 3, 6],
    "aug":     [0, 4, 8],

    "sus2":    [0, 2, 7],
    "sus4":    [0, 5, 7],

    "6":       [0, 4, 7, 9],
    "m6":      [0, 3, 7, 9],

    "7":       [0, 4, 7, 10],
    "maj7":    [0, 4, 7, 11],
    "m7":      [0, 3, 7, 10],
    "min7":    [0, 3, 7, 10],

    "9":       [0, 4, 7, 10, 14],
    "m9":      [0, 3, 7, 10, 14],

    "11":      [0, 4, 7, 10, 14, 17],
    "m11":     [0, 3, 7, 10, 14, 17],

    "13":      [0, 4, 7, 10, 14, 17, 21],
    "m13":     [0, 3, 7, 10, 14, 17, 21]
  };

  let chosen = intervals[qual];
  if (!chosen) chosen = intervals[""];

  return { root, intervals: chosen, bassOverride };
}

/* ---------------------------------------------------------
   Bassline generator
--------------------------------------------------------- */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInRange([lo, hi]) { return randomInt(lo, hi); }

function generateBassEvents(spec) {
  const {
    tempo_bpm,
    time_signature,
    division,
    key,
    scale,
    length_measures,
    harmonic_mode,
    progression,
    bass
  } = spec;

  const ticksPerBeat = division;
  const beatsPerMeasure = time_signature.numerator;

  const keyRoot = parseKeyToSemitone(key);
  const scaleOffsets = getScaleOffsets(scale);
  const rootMidi = rootNoteForKey(key, scale, bass.root_octave);

  const events = [];

  // Meta events
  const mpqn = Math.round(60000000 / tempo_bpm);
  events.push({ delta: 0, type: "meta", meta_type: "tempo", tempo: mpqn });
  events.push({
    delta: 0,
    type: "meta",
    meta_type: "time_signature",
    numerator: time_signature.numerator,
    denominator: time_signature.denominator,
    metronome: 24,
    thirtyseconds: 8
  });
  events.push({
    delta: 0,
    type: "program_change",
    channel: bass.channel,
    program: 32
  });

  const absEvents = [];

  function chordAtMeasure(measureIndex) {
    if (!progression || progression.length === 0) return null;

    let last = progression[0];
    for (const p of progression) {
      if (p.measure - 1 <= measureIndex) last = p;
    }
    return parseChordSymbol(last.chord);
  }

  function chooseChordalNote(chord, isFill) {
    const bassRoot = chord.bassOverride ?? chord.root;

    if (isFill) {
      const deg = randomChoice(bass.fill_degrees);
      return degreeToSemitoneOffset(deg, keyRoot, scaleOffsets);
    }

    const r = Math.random();

    if (r < bass.root_probability) {
      return bassRoot;
    }

    if (r < bass.root_probability + bass.chord_tone_probability) {
      const intv = randomChoice(chord.intervals);
      return bassRoot + intv;
    }

    return bassRoot + randomChoice([2, -2]);
  }

  function chooseFreeformNote(isFill) {
    let degreeStr;

    if (isFill) {
      degreeStr = randomChoice(bass.fill_degrees);
    } else {
      const r = Math.random();
      if (r < bass.root_probability) degreeStr = "I";
      else if (r < bass.root_probability + bass.fifth_probability) degreeStr = "V";
      else degreeStr = randomChoice(bass.degree_pool);
    }

    if (degreeStr === "I") return keyRoot + scaleOffsets[0];
    if (degreeStr === "V") return keyRoot + 7;

    return degreeToSemitoneOffset(degreeStr, keyRoot, scaleOffsets);
  }

  for (let measure = 0; measure < length_measures; measure++) {
    const measureStartBeat = measure * beatsPerMeasure;

    const useFill =
      Math.random() < (bass.fill_chance_per_measure || 0) &&
      bass.fill_degrees &&
      bass.fill_degrees.length > 0;

    const chord =
      harmonic_mode === "chordal" ? chordAtMeasure(measure) : null;

    for (let beat = 0; beat < beatsPerMeasure; ) {
      const currentBeat = measureStartBeat + beat;
      const isFillRegion =
        useFill &&
        beat >= beatsPerMeasure - (bass.fill_length_beats || 2);

      let semitone;

      if (harmonic_mode === "chordal") {
        semitone = chooseChordalNote(chord, isFillRegion);
      } else {
        semitone = chooseFreeformNote(isFillRegion);
      }

      let midiNote = semitone + (bass.root_octave + 1) * 12 - keyRoot;
      while (midiNote < rootMidi - 12) midiNote += 12;
      while (midiNote > rootMidi + 12) midiNote -= 12;

      const startTick = Math.round(currentBeat * ticksPerBeat);
      const durationTicks = Math.round(bass.note_duration_beats * ticksPerBeat);
      const velocity = randomInRange(bass.velocity_range);

      absEvents.push({
        time: startTick,
        type: "note_on",
        channel: bass.channel,
        note: midiNote,
        velocity
      });

      absEvents.push({
        time: startTick + durationTicks,
        type: "note_off",
        channel: bass.channel,
        note: midiNote,
        velocity: 64
      });

	  console.log({ measure, beat, semitone, midiNote, chord });

      beat += bass.note_duration_beats;
      if (beat >= beatsPerMeasure) break;
    }
  }

  absEvents.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.type === "note_off" ? -1 : 1;
  });

  let lastTime = 0;
  for (const ev of absEvents) {
    const delta = ev.time - lastTime;
    lastTime = ev.time;
    events.push({
      delta,
      type: ev.type,
      channel: ev.channel,
      note: ev.note,
      velocity: ev.velocity
    });
  }

  events.push({ delta: 0, type: "meta", meta_type: "end_of_track" });

  return { format: 0, division, events };
}

/* ---------------------------------------------------------
   Entry point
--------------------------------------------------------- */

function main(jsonPath) {
  const spec = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const midiEventsJson = generateBassEvents(spec);
  writeMidiFromEvents(midiEventsJson, spec.output_path || "out.mid");
}

if (require.main === module) {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: node gen.js spec.json");
    process.exit(1);
  }
  main(jsonPath);
}

