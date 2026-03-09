
//---------------------------------------------------------------------------------------
// Generate quasi-random riffage from JSON input description
//
// NOTE: the denominator of the meter will be the quickest note
// that will be generated. Want eight quavers to cover 4 quarters?
// The time sig should be 4/8; to generate a quarter note, specify
// an event that lasts 2 "beats" ... I think ....
//
// About JSON input:
//
// • key is C-B; translated to 0-11 as keyRoot
// • if we rest based on restPct, length is noteDuration
// • some stuff is in a "voice" block; allows for multiple instruments; if we get there
// • noteDuration can be an array; add multiple 1's, eg, to emphasize quarters (I think)
// • most places a single value works? an array will cause a random choice
//
// Thought:
//
//	We could pick freeforms either from key or "fill notes" why would we need both?
//	same on chordal: just pick fill notes from the chord
//	BTW. fill notes are "intervals" ( "II", "III", "V", etc )
//	And fill notes could be optional to add notes "out of key or chord"
//---------------------------------------------------------------------------------------

const fs = require("fs")

//---------------------------------------------------------------------------------------
//   MIDI helpers
//---------------------------------------------------------------------------------------

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

function writeMidiFromEvents( events, ticks, outputPath )
{
	let trackData = []
	for ( const evt of events )
		trackData.push( ...encodeEvent(evt) )

	const hasEOT = events.some( e => e.type === "meta" && e.meta_type === "end_of_track" )
	if ( !hasEOT )
		trackData.push( ...writeVLQ(0), 0xFF, 0x2F, 0x00 )

	const header = Buffer.alloc( 14 )
	header.write( "MThd", 0 )
	header.writeUInt32BE( 6, 4 )
	header.writeUInt16BE( 0, 8 )	// format always 0
	header.writeUInt16BE( 1, 10 )
	header.writeUInt16BE( ticks, 12 )

	const trackHeader = Buffer.alloc( 8 )
	trackHeader.write( "MTrk", 0 )
	trackHeader.writeUInt32BE( trackData.length, 4 )

	const trackBody = Buffer.from( trackData )

	const full = Buffer.concat( [header, trackHeader, trackBody] )
	fs.writeFileSync( outputPath, full )
}

//---------------------------------------------------------------------------------------
//   Theory helpers
//---------------------------------------------------------------------------------------

const NOTE_BASES =
{
	"C" : 0,
	"C#": 1,  "Db": 1,
	"D" : 2,
	"D#": 3,  "Eb": 3,
	"E" : 4,
	"F" : 5,
	"F#": 6,  "Gb": 6,
	"G" : 7,
	"G#": 8,  "Ab": 8,
	"A" : 9,
	"A#": 10, "Bb": 10,
	"B" : 11
}

function parseNoteName( name )
{
	const m = name.match( /^([A-G][b#]?)(\d)$/ )
	if (!m)
		throw new Error( "Bad note name: " + name )

	const pitch = NOTE_BASES[ m[1] ] + 12		// "modern" note numbers?
	const octave = parseInt( m[2], 10 )

	return pitch + (octave + 1) * 12
}

function parseKeyToSemitone( key )
{
	const m = key.match( /^([A-G][b#]?)/i )
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

//---------------------------------------------------------------------------------------
//   Chord parser
//---------------------------------------------------------------------------------------

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

//---------------------------------------------------------------------------------------
//   Event generation
//---------------------------------------------------------------------------------------

function randomChoice( arr )
{
	return arr[ Math.floor( Math.random() * arr.length )]
}

function randomInRange( [lo, hi] )
{
	return Math.floor( Math.random() * (hi - lo + 1) ) + lo
}

function probabilityHit( prob )
{
	return Math.random() < prob
}

function parseValue( val )
{
	if ( Array.isArray(val) )
		return randomChoice(val)

	return val
}

function generateEvents( spec )
{
	const beatsPerMeasure	= spec.meter.numerator
	const keyRoot			= parseKeyToSemitone( spec.key )
	const scaleOffsets		= getScaleOffsets( spec.scale )

	const minMidi = parseNoteName( spec.voice.range[0] )
	const maxMidi = parseNoteName( spec.voice.range[1] )

	const events = []
	const absEvents = []

	events.push({
		delta: 0,
		type: "meta",
		meta_type: "tempo",
		tempo: Math.round( 60000000 / spec.tempo )
	})

	events.push({
		delta: 0,
		type: "meta",
		meta_type: "time_signature",
		numerator: spec.meter.numerator,
		denominator: spec.meter.denominator,
		metronome: 24,
		thirtyseconds: 8
	})

	events.push({
		delta: 0,
		type: "program_change",
		channel: 0,
		program: 32
	})

	if ( spec.verbose ) {
		console.log('keyRoot = ', keyRoot)
		console.log('scale = ', scaleOffsets)
	}

	function chordAtMeasure( measureIndex )
	{
		if ( !spec.chords || spec.chords.length === 0 )
			return null

		let last = spec.chords[0]
		for ( const p of spec.chords ) {
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
			const deg = randomChoice( spec.voice.fillNotes )
			return degreeToSemitoneOffset( deg, keyRoot, scaleOffsets )
		}

		if ( probabilityHit( spec.voice.tonicPct ))
			return root

		if ( probabilityHit( spec.voice.chordTonePct ))
			return root + randomChoice( chord.intervals )

		return root + randomChoice( [2, -2] )
	}

	function chooseFreeformNote()
	{
		let offset = 0
		
		if ( ! probabilityHit( spec.voice.tonicPct ))
			offset = randomChoice( scaleOffsets )

		return keyRoot + offset
	}

	function clampToRange( midi, min, max )
	{
		while ( midi < min )
			midi += 12
		while ( midi > max )
			midi -= 12

		return midi
	}

	if ( spec.verbose )
		console.log( 'min/max MIDI =', [minMidi, maxMidi] )

	for ( let prevRest = false, prevNote = '', measure = 0; measure < spec.nMeasures; measure++ )
	{
		const measureStartBeat = measure * beatsPerMeasure

		const useFill =
			probabilityHit( spec.voice.fillPct ) &&
			spec.voice.fillNotes &&
			spec.voice.fillNotes.length > 0

		const chord = spec.mode === "chordal" ? chordAtMeasure(measure) : null

		if ( spec.verbose )
			console.log( 'on measure', measure, 'measureStartBeat = ', measureStartBeat )

		for ( let semitone, beat = 0; beat < beatsPerMeasure; beat++ )
		{
				if ( spec.verbose )
					console.log( 'on beat', beat )

									// we currently never rest on beat 0
			if ( beat != 0 && !prevRest && probabilityHit( spec.voice.restPct )) {
				prevRest = true
				if ( spec.verbose )
					console.log( 'resting on beat', beat )
				continue;
			}

			prevRest = false

			const currentBeat  = measureStartBeat + beat
			const isFillRegion = useFill && ( beat >= ( beatsPerMeasure - parseValue(spec.voice.fillLength) ))	// ???

			if ( beat != 0 && probabilityHit(spec.voice.tonicOnOne) )
				semitone = keyRoot
			else {
				if ( spec.mode === "chordal" )
					semitone = chooseChordalNote( chord, isFillRegion )
				else
					semitone = chooseFreeformNote()
			}

			let midiNote = clampToRange( semitone, minMidi, maxMidi )

			if ( spec.verbose )
				console.log( ( (semitone < 10) ? 'semitone ' : 'semitone'), semitone, '->', midiNote )

			const startTick = Math.round( currentBeat * spec.ticksPerBeat )
			const durationTicks = Math.round( parseValue(spec.voice.noteDuration) * spec.ticksPerBeat )

			absEvents.push(
			{							// ensure the prev note is stopped
				time: startTick,		// don't start earlier than `startTick` or bad stuff happens
				type: "note_off",
				channel: 0,
				note: prevNote,
				velocity: 0
			})

			absEvents.push(
			{
				time: startTick,
				type: "note_on",
				channel: 0,
				note: midiNote,
				velocity: parseValue( spec.voice.velocity )
			})
											// hopefully this note is already off is another started
			absEvents.push(
			{
				time: startTick + durationTicks,
				type: "note_off",
				channel: 0,
				note: (prevNote = midiNote),
				velocity: 0
			})
					// if noteDuration is fractional; not sure what happens
					// beat += parseValue( spec.voice.noteDuration )
		}
	}

	absEvents.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

	let lastTime = 0

	for ( const ev of absEvents )
	{
		const delta = ev.time - lastTime
		lastTime = ev.time

		events.push({
			delta,
			type: ev.type,
			channel: ev.channel,
			note: ev.note,
			velocity: ev.velocity
		})
	}

	events.push({
		delta: 0,
		type: "meta",
		meta_type: "end_of_track"
	})

	return events
}

//---------------------------------------------------------------------------------------
//   Entry point
//---------------------------------------------------------------------------------------

if ( require.main === module )
{
	const inputFile = process.argv[2]
	if ( !inputFile )
	{
		console.error( "Usage: node gen.js spec.json" )
		process.exit(1)
	}

	const spec = JSON.parse( fs.readFileSync( inputFile, "utf8" ))
	const evts = generateEvents( spec )

	if ( ! evts || evts.length === 0 )
		throw new Error( "Error: no events generated" )

	writeMidiFromEvents( evts, spec.ticksPerBeat, spec.outputPath || "output.mid" )
}

