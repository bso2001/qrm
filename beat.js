
//---------------------------------------------------------------------------------------
//   Beat generation: fill the current beat for the supplied `part`
//---------------------------------------------------------------------------------------

const library = require("./lib")
const theory  = require("./theory")

function _chordAt( part )
{
	if ( ! part.chords || part.chords.length === 0 )
		throw new Error( "Bad chordal def: " + part )

	return theory.parseChordSymbol( part.chords[part.measure % part.chords.length] )
}

function _tonic( part )
{
	let tonic = true

	if ( Array.isArray( part.tonicPct ))
	{
		if ( ! library.probabilityHit( part.tonicPct [ part.thisBeat ] ))
			tonic = false
	}
	else if ( ! library.probabilityHit( part.tonicPct ))
			tonic = false

	return tonic
}

function _chordalNote( part )
{
	const chord  = _chordAt( part )
	const offset = _tonic( part ) ? 0 : library.randomChoice( chord.notes )

	return chord.root + offset
}

function _freeformNote( song, part )
{
	let offset = 0
	
	if ( ! _tonic( part ))
		offset = library.randomChoice( part.intrvls )

	return song.keyRoot + offset
}

function _clampToRange( mNote, part )
{
	while ( mNote < part.minMidi )
		mNote += 12
	while ( mNote > part.maxMidi )
		mNote -= 12

	return mNote
}

function generate( song, part ) 
{
					// determine event (note or rest) duration in ticks. tdiv is the "PPQN divisor"
					// that yields the # of ticks for a given note length. eg; the tdiv for an
					// eighth note is 2; 480/2 = 240: the # of ticks for a quaver

	const tdiv  = library.randomChoice( part.timings )
	let endTick = part.thisTick + (part.ppqn / tdiv)

	if ( endTick > part.lastTick )
		endTick = part.lastTick

					// see if we're taking a breather; we don't rest twice in a row; that should
					// be a param! restPct can be a single value, or a value per beat

	let resting = true

	if ( part.prevRest == false )
		resting = false

	if ( resting )
	{
		if ( Array.isArray(part.restPct) ) {
			if ( ! library.probabilityHit( part.restPct [ part.thisBeat ] ))
				resting = false
		}
		else if ( ! library.probabilityHit( part.restPct ))
			resting = false
	}

	if ( resting )
	{
		part.prevRest = true
		if ( song.loglevel >= 4 )
			console.log( library.PAD8, 'resting on beat', part.thisBeat, 'endTick =', endTick)
	}
	else
	{
		let semitone

		part.prevRest = false

		if ( part.type === "chordal" )
			semitone = _chordalNote( part )
		else
			semitone = _freeformNote( song, part )

		const midiNote = _clampToRange( semitone, part )
		const velocity = library.parseValue( part.velocity )

		part.events.push( library.noteOn(  part.thisTick, midiNote, velocity ))
		part.events.push( library.noteOff( endTick, midiNote ))
	}

	part.thisTick = endTick
}

module.exports = { generate }

