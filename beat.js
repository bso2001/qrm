
//---------------------------------------------------------------------------------------
//   Beat generation: fill the current beat for the supplied `riff`
//---------------------------------------------------------------------------------------

const library = require("./lib")
const theory  = require("./theory")

function _chordAt( riff )
{
	if ( ! riff.chords || riff.chords.length === 0 )
		return null

	let last = riff.chords[0]
	for ( const p of riff.chords ) {
		if ( p.measure - 1 <= riff.measure )
			last = p
	}

	return theory.parseChordSymbol( last.chord )
}

function _tonic( riff )
{
	let tonic = true

	if ( Array.isArray( riff.tonicPct ))
	{
		if ( ! library.probabilityHit( riff.tonicPct [ riff.thisBeat ] ))
			tonic = false
	}
	else if ( ! library.probabilityHit( riff.tonicPct ))
			tonic = false

	return tonic
}

function _chordalNote( riff, chord )
{
	chord = _chordAt(riff)

	if ( _tonic( riff ))
		return chord.root

	if ( library.probabilityHit( riff.chordTonePct ))
		return chord.root + library.randomChoice( chord.notes )

	return chord.root + library.randomChoice( [2, -2] )
}

function _freeformNote( riff )
{
	let offset = 0
	
	if ( ! _tonic( riff ))
		offset = library.randomChoice( riff.intrvls )

	return riff.keyRoot + offset
}

function _clampToRange( mNote, riff )
{
	while ( mNote < riff.minMidi )
		mNote += 12
	while ( mNote > riff.maxMidi )
		mNote -= 12

	return mNote
}

function generate( riff ) 
{
					// determine event (note or rest) duration in ticks. tdiv is the "PPQN divisor"
					// that yields the # of ticks for a given note length. eg; the tdiv for an
					// eighth note is 2; 480/2 = 240: the # of ticks for a quaver

	const tdiv  = library.randomChoice( riff.timings )
	let endTick = riff.thisTick + (riff.ppqn / tdiv)

	if ( endTick > riff.lastTick )
		endTick = riff.lastTick

					// see if we're taking a breather; we don't rest twice in a row; that should
					// be a param! restPct can be a single value, or a value per beat

	let resting = true

	if ( riff.prevRest == false )
		resting = false

	if ( resting )
	{
		if ( Array.isArray(riff.restPct) ) {
			if ( ! library.probabilityHit( riff.restPct [ riff.thisBeat ] ))
				resting = false
		}
		else if ( ! library.probabilityHit( riff.restPct ))
			resting = false
	}

	if ( resting )
	{
		riff.prevRest = true
		if ( riff.loglevel == 3 )
			console.log( library.PAD8, 'resting on beat', riff.thisBeat, 'endTick =', endTick)
	}
	else
	{
		let semitone

		riff.prevRest = false

		if ( riff.type === "chordal" )
			semitone = _chordalNote( riff, _chordAt(riff) )
		else
			semitone = _freeformNote( riff )

		const midiNote = _clampToRange( semitone, riff )
		const velocity = library.parseValue( riff.velocity )

		riff.events.push( library.noteOn(  riff.thisTick, midiNote, velocity ))
		riff.events.push( library.noteOff( endTick, midiNote ))
	}

	riff.thisTick = endTick
}

module.exports = { generate }

