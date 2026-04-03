
//-----------------------------------------------------------------------------
//   Beat generation: fill the current beat for the supplied `part`
//-----------------------------------------------------------------------------

const common = require("./common")
const theory = require("./theory")

function _chordAt( part )
{
	if ( ! part.chords || part.chords.length == 0 )
		throw new Error( "Bad chordal def: " + part )

	if ( part.chordIndex >= part.chords.length )
		part.chordIndex = 0

	return theory.parseChordSymbol( part.chords[ part.chordIndex++ ])
}

function _tonic( part )
{
	let tonic = true

	if ( Array.isArray( part.tonicPct ))
	{
		if ( ! common.probabilityHit( part.tonicPct [ part.thisBeat ] ))
			tonic = false
	}
	else if ( ! common.probabilityHit( part.tonicPct ))
			tonic = false

	return tonic
}

function _clampToRange( mNote, part )
{
	while ( mNote < part.minMidi )
		mNote += 12
	while ( mNote > part.maxMidi )
		mNote -= 12

	return mNote
}

function _chordalNote( part )
{
	const chord  = _chordAt( part )
	const offset = _tonic( part ) ? 0 : common.randomChoice( chord.notes )
	const semitn =  chord.root + offset

	return [ _clampToRange( semitn, part ) ]
}

function _freeformNote( part )
{
	const offset = _tonic( part ) ? 0 : common.randomChoice( part.intrvls )
	const semitn = part.keyRoot + offset

	return [ _clampToRange( semitn, part ) ]
}

function _fullChord( part )
{
	const chord  = _chordAt( part )
	const notes  = []
	let nNotes = 3		// make this a param?

	// if ( nNotes > chord.notes.length )
		nNotes = chord.notes.length

	for ( let i = 0; i < nNotes; i++ ) {
		const semitn = chord.root + chord.notes[i]
		notes.push( _clampToRange( semitn, part ))
	}

	return notes
}

function generate( song, part ) 
{
					// determine event (note or rest) duration in ticks. tdiv is the "PPQN divisor"
					// that yields the # of ticks for a given note length. eg; the tdiv for an
					// eighth note is 2; 480/2 = 240: the # of ticks for a quaver

	const tdiv  = common.randomChoice( part.timings )
	let endTick = part.thisTick + (song.ppqn / tdiv)

	if ( song.loglevel >= 2 )
		console.log( common.PAD4, 'thisTick', part.thisTick, 'tdiv', tdiv, 'lastTick', part.lastTick, 'endTick', endTick )

	if ( endTick > part.lastTick ) {
		if ( song.loglevel >= 2 )
			console.log( common.PAD4, 'endTick ran over part end!' )
		endTick = part.lastTick
	}

					// see if we're taking a breather; we don't rest twice in a row; that should
					// be a param! restPct can be a single value, or a value per beat
	let resting = true

	if ( part.prevRest == false )
		resting = false

	if ( resting )
	{
		if ( Array.isArray(part.restPct) ) {
			if ( ! common.probabilityHit( part.restPct [ part.thisBeat ] ))
				resting = false
		}
		else if ( ! common.probabilityHit( part.restPct ))
			resting = false
	}

	if ( resting )
	{
		part.prevRest = true
		if ( song.loglevel >= 3 )
			console.log( common.PAD8, 'resting on beat', part.thisBeat, 'endTick =', endTick)
	}
	else
	{
		let notes = []

		part.prevRest = false

		if ( part.type == "chordal" )
			notes = _chordalNote( part )

		if ( part.type == "freeform" )
			notes = _freeformNote( part )

		if ( part.type == "chords" )
			notes = _fullChord( part )

		if ( notes.length == 0 )
			throw new Error( "Bad part type? " + part.type )

		if ( song.loglevel >= 3 )
			console.log( common.PAD8, notes, 'on beat', part.thisBeat, 'endTick =', endTick)

		for ( let midiNote of notes ) {
			part.events.push( common.noteOn( part.thisTick, midiNote,
												common.randomInRange( part.velocity )))
			part.events.push( common.noteOff( endTick, midiNote ))
		}
	}

	part.thisTick = endTick
}

module.exports = { generate }

