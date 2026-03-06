
// Generate quasi-random riffage from JSON input description
// Added freeform vs chordal direction...
// More harmonic smarts...
// NOTE: time signature "denominator" will be the quickest note
// that will be generated. Want eight 8th notes to cover 4 quavers?
// The time sig should be 4/8; generating a quarter note means
// specifying an event that lasts 2 "beats" ... I think ....

const fs = require("fs")

//---------------------------------------------------------
//   MIDI helpers
//---------------------------------------------------------

function writeVLQ( value )
{
	const bytes = []
	let buffer = value & 0x7F

	while ( value >>= 7 )
	{
		buffer <<= 8
		buffer |= ( (value & 0x7F) | 0x80 )
	}

	while ( true )
	{
		bytes.push( buffer & 0xFF )
		if ( buffer & 0x80 )
			buffer >>= 8
		else
			break
	}

	return bytes
}

function encodeEvent( evt )
{
	const out = []
	out.push( ...writeVLQ(evt.delta) )

	switch ( evt.type )
	{
		case "note_on":
			out.push( 0x90 | evt.channel, evt.note & 0x7F, evt.velocity & 0x7F )
			break
		case "note_off":
			out.push( 0x80 | evt.channel, evt.note & 0x7F, evt.velocity & 0x7F )
			break
		case "program_change":
			out.push( 0xC0 | evt.channel, evt.program & 0x7F )
			break
		case "meta":
			out.push( 0xFF )

			if ( evt.meta_type === "end_of_track" )
				out.push( 0x2F, 0x00 )

			else if ( evt.meta_type === "tempo" )
			{
				out.push(
					0x51, 0x03,
					(evt.tempo >> 16) & 0xFF,
					(evt.tempo >> 8) & 0xFF,
					evt.tempo & 0xFF
				)
			}

			else if ( evt.meta_type === "time_signature" )
			{
				out.push(
					0x58, 0x04,
					evt.numerator,
					Math.log2(evt.denominator),
					evt.metronome,
					evt.thirtyseconds
				)
			}

			break
	}

	return out
}

function writeMidiFromEvents( json, outputPath )
{
	const { format, division, events } = json

	let trackData = []
	for ( const evt of events )
		trackData.push( ...encodeEvent(evt) )

	const hasEOT = events.some( e => e.type === "meta" && e.meta_type === "end_of_track" )
	if ( !hasEOT )
		trackData.push( ...writeVLQ(0), 0xFF, 0x2F, 0x00 )

	const header = Buffer.alloc( 14 )
	header.write( "MThd", 0 )
	header.writeUInt32BE( 6, 4 )
	header.writeUInt16BE( format, 8 )
	header.writeUInt16BE( 1, 10 )
	header.writeUInt16BE( division, 12 )

	const trackHeader = Buffer.alloc( 8 )
	trackHeader.write( "MTrk", 0 )
	trackHeader.writeUInt32BE( trackData.length, 4 )

	const trackBody = Buffer.from( trackData )

	const full = Buffer.concat( [header, trackHeader, trackBody] )
	fs.writeFileSync( outputPath, full )
}

//---------------------------------------------------------
//   Theory helpers
//---------------------------------------------------------

const NOTE_BASES =
{
	C: 0, "C#": 1, Db: 1,
	D: 2, "D#": 3, Eb: 3,
	E: 4,
	F: 5, "F#": 6, Gb: 6,
	G: 7, "G#": 8, Ab: 8,
	A: 9, "A#": 10, Bb: 10,
	B: 11
}

function parseNoteName( name )
{
	const m = name.match( /^([A-G][b#]?)(\d)$/ )
	if (!m)
		throw new Error( "Bad note name: " + name )

	const pitch = NOTE_BASES[ m[1] ]
	const octave = parseInt( m[2], 10 )

	return pitch + (octave + 1) * 12
}

function parseKeyToSemitone(key)
{
	const m = key.match(/^([A-G][b#]?)/i)
	if ( !m )
		throw new Error( "Bad key: " + key )

	return NOTE_BASES[ m[1] ]
}

const MINOR = [ 0, 2, 3, 5, 7, 8, 10 ]
const MAJOR = [ 0, 2, 4, 5, 7, 9, 11 ]

function getScaleOffsets( name )
{
	if ( name === "minor" )
		return MINOR
	if ( name === "major" )
		return MAJOR

	throw new Error( "Unsupported scale: " + name )
}

function degreeToSemitoneOffset( degreeStr, keyRoot, scaleOffsets )
{
	const romanMap = { I:0, II:1, III:2, IV:3, V:4, VI:5, VII:6 }
	let accidental = 0
	let core = degreeStr

	if ( degreeStr.startsWith("b") )
	{
		accidental = -1
		core = degreeStr.slice( 1 )
	}
	else if ( degreeStr.startsWith("#") )
	{
		accidental = 1
		core = degreeStr.slice( 1 )
	}

	if ( romanMap[core] !== undefined )
	{
		const idx = romanMap[core]
		return keyRoot + scaleOffsets[idx] + accidental
	}

	const n = parseInt( core, 10 )
	return keyRoot + scaleOffsets[n - 1] + accidental
}

//---------------------------------------------------------
//   Chord parser
//---------------------------------------------------------

function parseChordSymbol( sym )
{
	let bassOverride = null

	if ( sym.includes("/") )
	{
		const [main, bass] = sym.split("/")
		sym = main
		bassOverride = NOTE_BASES[bass]
	}

	const m = sym.match(/^([A-G][b#]?)(.*)$/)
	if ( !m )
		throw new Error( "Bad chord: " + sym )

	const rootName = m[1]
	const qual = m[2].toLowerCase()
	const root = NOTE_BASES[rootName]

	const intervals =
	{
		"": [0, 4, 7],
		"m": [0, 3, 7],
		"min": [0, 3, 7],
		"dim": [0, 3, 6],
		"aug": [0, 4, 8],
		"sus2": [0, 2, 7],
		"sus4": [0, 5, 7],
		"6": [0, 4, 7, 9],
		"m6": [0, 3, 7, 9],
		"7": [0, 4, 7, 10],
		"maj7": [0, 4, 7, 11],
		"m7": [0, 3, 7, 10],
		"min7": [0, 3, 7, 10],
		"9": [0, 4, 7, 10, 14],
		"m9": [0, 3, 7, 10, 14],
		"11": [0, 4, 7, 10, 14, 17],
		"m11": [0, 3, 7, 10, 14, 17],
		"13": [0, 4, 7, 10, 14, 17, 21],
		"m13": [0, 3, 7, 10, 14, 17, 21]
	}

	return {
		root,
		intervals: intervals[qual] || intervals[""],
		bassOverride
	}
}

//---------------------------------------------------------
//   Range clamp
//---------------------------------------------------------

function clampToRange( midi, min, max )
{
	while ( midi < min )
		midi += 12
	while ( midi > max )
		midi -= 12

	return midi
}

//---------------------------------------------------------
//   Melodic motion engine -- this is nonsense!
//---------------------------------------------------------

function applyMotion( prev, target )
{
	if ( prev === null )
		return target

	const diff = target - prev

	if ( Math.abs(diff) <= 2 )
		return target

	if ( Math.random() < 0.7 )
		return prev + (diff > 0 ? 2 : -2)

	return target
}

//---------------------------------------------------------
//   Event generator
//---------------------------------------------------------

function randomChoice( arr )
{
	return arr[ Math.floor( Math.random() * arr.length )]
}

function randomInRange( [lo, hi] )
{
	return Math.floor( Math.random() * (hi - lo + 1) ) + lo
}

function generateEvents( spec )
{
	const
	{
		tempo_bpm,
		time_signature,
		division,
		key,
		scale,
		length_measures,
		harmonic_mode,
		progression,
		instrument
	} = spec

	const ticksPerBeat = division
	const beatsPerMeasure = time_signature.numerator

	const keyRoot = parseKeyToSemitone( key )
	const scaleOffsets = getScaleOffsets( scale )

	const minMidi = parseNoteName( instrument.range[0] )
	const maxMidi = parseNoteName( instrument.range[1] )

	const events = []
	const mpqn = Math.round( 60000000 / tempo_bpm )

	events.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "tempo",
		tempo: mpqn
	})

	events.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "time_signature",
		numerator: time_signature.numerator,
		denominator: time_signature.denominator,
		metronome: 24,
		thirtyseconds: 8
	})

	events.push(
	{
		delta: 0,
		type: "program_change",
		channel: 0,
		program: 32
	})

	const absEvents = []
	let prevMidi = null

	function chordAtMeasure( measureIndex )
	{
		if ( !progression || progression.length === 0 )
			return null

		let last = progression[0]
		for ( const p of progression ) {
			if ( p.measure - 1 <= measureIndex )
				last = p
		}

		return parseChordSymbol( last.chord )
	}

	function chooseChordalNote( chord, isFill )
	{
		const root = chord.bassOverride ?? chord.root

		if ( isFill )
		{
			const deg = randomChoice( instrument.fill_degrees )
			return degreeToSemitoneOffset( deg, keyRoot, scaleOffsets )
		}

		const r = Math.random()

		if ( r < instrument.root_probability )
			return root

		if ( r < instrument.root_probability + instrument.chord_tone_probability )
			return root + randomChoice( chord.intervals )

		return root + randomChoice( [2, -2] )
	}

	function chooseFreeformNote()
	{
		const ffn = keyRoot + randomChoice( scaleOffsets )

		return ffn
	}

	if ( spec.verbose )
		console.log( 'min/max MIDI =', [minMidi, maxMidi] )

	for ( let measure = 0; measure < length_measures; measure++ )
	{
		const measureStartBeat = measure * beatsPerMeasure

		const useFill =
			Math.random() < instrument.fill_chance_per_measure &&
			instrument.fill_degrees &&
			instrument.fill_degrees.length > 0

		const chord = harmonic_mode === "chordal" ? chordAtMeasure(measure) : null

		for ( let beat = 0; beat < beatsPerMeasure; )
		{
			const currentBeat  = measureStartBeat + beat
			const isFillRegion = useFill && (beat >= beatsPerMeasure - instrument.fill_length_beats)

			let semitone

			if ( harmonic_mode === "chordal" )
				semitone = chooseChordalNote( chord, isFillRegion )
			else
				semitone = chooseFreeformNote()

			if ( spec.verbose )
				console.log( 'semitone = ', semitone )

			// if ( spec.verbose )
				// console.log( 'clamping to ', semitone, minMidi, maxMidi )

			let midiNote = clampToRange( semitone, minMidi, maxMidi )
			if ( spec.verbose )
				console.log( 'midiNote 1 = ', midiNote )
			midiNote = applyMotion( prevMidi, midiNote )
			if ( spec.verbose )
				console.log( 'midiNote 2 = ', midiNote )
			prevMidi = midiNote

			// if note_duration_beats is an array? pick one; weighted; somehow... !!!!

			const startTick = Math.round( currentBeat * ticksPerBeat )
			const durationTicks = Math.round( instrument.note_duration_beats * ticksPerBeat )
			const velocity = randomInRange( instrument.velocity_range )

			absEvents.push(
			{
				time: startTick,
				type: "note_on",
				channel: 0,
				note: midiNote,
				velocity
			})

			absEvents.push(
			{
				time: startTick + durationTicks,
				type: "note_off",
				channel: 0,
				note: midiNote,
				velocity: 64
			})

			beat += instrument.note_duration_beats
		}
	}

	absEvents.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

	let lastTime = 0

	for ( const ev of absEvents )
	{
		const delta = ev.time - lastTime
		lastTime = ev.time

		events.push(
		{
			delta,
			type: ev.type,
			channel: ev.channel,
			note: ev.note,
			velocity: ev.velocity
		})
	}

	events.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "end_of_track"
	})

	return { format: 0, division, events }
}

//---------------------------------------------------------
//   Entry point
//---------------------------------------------------------

function main( inputFile )
{
	const spec = JSON.parse( fs.readFileSync(inputFile, "utf8") )
	const midiEventsJson = generateEvents( spec )
	writeMidiFromEvents( midiEventsJson, spec.output_path || "output.mid" )
}

if ( require.main === module )
{
	const inputFile = process.argv[2]
	if ( !inputFile )
	{
		console.error( "Usage: node gen.js spec.json" )
		process.exit(1)
	}

	main( inputFile )
}

