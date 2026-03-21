
//---------------------------------------------------------------------------------------
//  Riff generation
//---------------------------------------------------------------------------------------

const beat    = require("./beat")
const library = require("./lib")
const theory  = require("./theory")
const util    = require("node:util")

function generate( riff )
{
			// we expand the input def, adding derived/calculated `global info` for convenience.
			// calling it `riff`, the object will hold MIDI events as they are generated,
			// as well as process status data such as current beat and tick positions

	riff.events   = []
	riff.prevRest = false
	riff.lastTick = 0
	riff.thisTick = 0

	riff.keyRoot  = theory.keyToSemitone( riff.key )		// do keyRoot first!
	riff.intrvls  = theory.findIntervals( riff )
	riff.timings  = theory.parseDuration( riff.duration )
	riff.minMidi  = theory.parseNoteName( riff.range[0] )
	riff.maxMidi  = theory.parseNoteName( riff.range[1] )

	if ( riff.loglevel >= 1 )
	{
		console.log( '----------------------------------------------------------------------' )
		console.log( 'riff spec =', util.inspect( riff, library.inspectOptions ))
	}

	for ( riff.measure = 0; riff.measure < riff.nMeasures; riff.measure++ )
	{
		riff.thisBeat = 0

		if ( riff.loglevel >= 4 )
		{
			console.log( '----------------------------------------------------------------------' )
			console.log( 'We are on Measure #', measure, '; lastTick =' , riff.lastTick )
		}

		for ( riff.thisBeat = 0; riff.thisBeat < riff.meter.numerator; riff.thisBeat++ )
		{
			riff.lastTick = (riff.thisTick + riff.ppqn)
			if ( riff.loglevel >= 4 )
				console.log( library.PAD4, 'Beat', riff.thisBeat, 'lastTick', riff.lastTick )

			while ( riff.thisTick < riff.lastTick )
			{
				if ( riff.loglevel >= 4 )
					console.log( library.PAD4, 'thisTick =', riff.thisTick, 'lastTick =', riff.lastTick )
				beat.generate( riff )
			}
		}
	}

	riff.events.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

	let evts  = []
	let ptime = 0

	evts.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "tempo",
		tempo: Math.round( 60000000 / riff.tempo )
	})

	evts.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "time_signature",
		numerator: riff.meter.numerator,
		denominator: riff.meter.denominator,
		metronome: 24,
		thirtyseconds: 8
	})

	for ( const e of riff.events )
	{
		const dlta = e.time - ptime
		ptime = e.time

		evts.push({ delta: dlta, type: e.type, channel: e.channel, note: e.note, velocity: e.velocity })
	}

	evts.push({ delta: 0, type: "meta", meta_type: "end_of_track" })

	if ( riff.loglevel >= 1 )
	{
		console.log( '-------------------------------------------------------------------------------------' )
		console.log( 'events =', util.inspect( evts, false, null, true ))
	}

	return evts
}

module.exports = { generate }

