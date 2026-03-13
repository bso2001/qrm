
//---------------------------------------------------------------------------------------
//   Event generation
//---------------------------------------------------------------------------------------

const library = require("./lib")
const theory  = require("./theory")

function _chordAt( measureIndex )
{
	if ( !spec.chords || spec.chords.length === 0 )
		return null

	let last = spec.chords[0]
	for ( const p of spec.chords ) {
		if ( p.measure - 1 <= measureIndex )
			last = p
	}

	return thoery.parseChordSymbol( last.chord )
}

function _chordalNote( spec, chord, isFill )
{
	const root = chord.bassOverride ?? chord.root

	if ( isFill )
	{
		const deg = library.randomChoice( spec.fillNotes )
		return theory.degreeToSemitone( deg, spec.keyRoot, spec.intervals )
	}

	if ( library.probabilityHit( spec.tonicPct ))
		return root

	if ( library.probabilityHit( spec.chordTonePct ))
		return root + library.randomChoice( chord.notes )

	return root + library.randomChoice( [2, -2] )
}

function _freeformNote( spec )
{
	let offset = 0
	
	if ( ! library.probabilityHit( spec.tonicPct ))
		offset = library.randomChoice( spec.intervals )

	return spec.keyRoot + offset
}

function _clampToRange( midi, min, max )
{
	while ( midi < min )
		midi += 12
	while ( midi > max )
		midi -= 12

	return midi
}


function generate( spec )
{
	const events    = []
	const absEvents = []

	const minMidi   = theory.parseNoteName( spec.range[0] )
	const maxMidi   = theory.parseNoteName( spec.range[1] )
	const bpMeasure = spec.meter.numerator

	spec.intervals = theory.scaleIntervals( spec.scale )
	spec.keyRoot   = theory.keyToSemitone( spec.key )
	spec.quikDivsr = theory.parseDuration( spec.fastestNote )

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
		console.log( '-------------------------------------------------------' )
		console.log( 'min/max MIDI   =', [minMidi, maxMidi] )
		console.log( 'spec.keyRoot   = ', spec.keyRoot)
		console.log( 'spec.intervals = ', spec.intervals)
	}

	// For each measure:
	// 	- determine if there's a fill; not sure 'bout this yet
	// 	- for each of the measure's Beats:
	//		

	for ( let prevRest = false, prevNote = '', measure = 0; measure < spec.nMeasures; measure++ )
	{
		const measureStartBeat = measure * bpMeasure

		const useFill =
			library.probabilityHit( spec.fillPct ) &&
			spec.fillNotes && spec.fillNotes.length > 0

		if ( spec.verbose ) {
			console.log( '-------------------------------------------------------' )
			console.log( 'We are on Measure #', measure,
						 '; measureStartBeat =', measureStartBeat,
						 useFill ? '; fill' : '' )
		}

		for ( let semitone, beat = 0; beat < bpMeasure; beat++ )
		{
				if ( spec.verbose )
					console.log( library.PAD4, 'Beat', beat )

							// see if we're taking a breather; we don't rest twice in a row
							// also: resting on first beat is a spec pct that must be checked

			let resting = !prevRest && library.probabilityHit( spec.restPct )

			if ( resting && beat == 0 && !library.probabilityHit( spec.restOnOnePct ))
				resting = false

			if ( resting ) {
				prevRest = true
				if ( spec.verbose )
					console.log( library.PAD8, 'resting on beat', beat )
				continue			// here we rely on beat being incremented by the loop!
			}

			prevRest = false

			const quickestTicks = 30	// need to calculate!
			let currentTick = Math.round( beat * spec.ppqn )
			let endTick = (currentTick + (bpMeasure * spec.ppqn)) - quickestTicks

			// while ( currentTick < endTick )
				// currentTick = genEvent( currentTick )

			// genEvent is kinda below....


			const isFillRegion = useFill && ( beat >= ( bpMeasure - library.parseValue(spec.fillLength) ))

			if ( beat != 0 && library.probabilityHit(spec.tonicOnOnePct) )
				semitone = spec.keyRoot
			else {
				if ( spec.mode === "chordal" )
					semitone = _chordalNote( spec, _chordAt(measure), isFillRegion )
				else
					semitone = _freeformNote( spec )
			}

			let   midiNote  = _clampToRange( semitone, minMidi, maxMidi )
			const duration  = Math.round( library.parseValue(spec.noteDuration) * spec.ppqn )
			const velocity  = library.parseValue( spec.velocity )

			if ( spec.verbose ) {
				console.log( library.PAD8, 'semitone', semitone, '-->', midiNote )
				console.log( library.PAD8, 'ticks', currentTick, 'thru', endTick )
			}
																				// ensure prev note stops; don't go earlier
			absEvents.push( library.noteOff( currentTick, prevNote ))			// than `currentTick` or bad stuff happens
			absEvents.push( library.noteOn( currentTick, midiNote, velocity ))
			absEvents.push( library.noteOff( endTick,  midiNote ))				// hopefully this note is already off

			prevNote = midiNote
		}
	}

	absEvents.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

	let lastTime = 0

	for ( const ev of absEvents )
	{
		const delta = ev.time - lastTime
		lastTime = ev.time

		events.push({
			delta: delta, type: ev.type, channel: ev.channel, note: ev.note, velocity: ev.velocity
		})
	}

	events.push({ delta: 0, type: "meta", meta_type: "end_of_track" })

	return events
}

function genEvent( currentTick ) 
{
	const isFillRegion = useFill && ( beat >= ( bpMeasure - library.parseValue(spec.fillLength) ))

	if ( beat != 0 && library.probabilityHit(spec.tonicOnOnePct) )
		semitone = spec.keyRoot
	else {
		if ( spec.mode === "chordal" )
			semitone = _chordalNote( spec, _chordAt(measure), isFillRegion )
		else
			semitone = _freeformNote( spec )
	}

	let   midiNote  = _clampToRange( semitone, minMidi, maxMidi )
	const duration  = Math.round( library.parseValue(spec.noteDuration) * spec.ppqn )
	const velocity  = library.parseValue( spec.velocity )

	if ( spec.verbose ) {
		console.log( '        semitone', semitone, '-->', midiNote )
		console.log( '        ticks', currentTick, 'thru', endTick )
	}
																		// ensure prev note stops; don't go earlier
	absEvents.push( library.noteOff( currentTick, prevNote ))			// than `currentTick` or bad stuff happens
	absEvents.push( library.noteOn( currentTick, midiNote, velocity ))
	absEvents.push( library.noteOff( endTick,  midiNote ))				// hopefully this note is already off
}

module.exports = { generate }

