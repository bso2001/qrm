
//-------------------------------------------------------------------
//  Part generation
//-------------------------------------------------------------------

const beat    = require("./beat")
const library = require("./lib")
const theory  = require("./theory")
const util    = require("node:util")

function generate( song, part )
{
	part.events     = []
	part.lastTick   = 0
	part.thisTick   = 0
	part.chordIndex = 0
	part.prevRest   = false

	part.intrvls    = theory.findIntervals( song, part )
	part.timings    = theory.parseDuration( part.duration )
	part.minMidi    = theory.parseNoteName( part.range[0] )
	part.maxMidi    = theory.parseNoteName( part.range[1] )

	if ( song.loglevel >= 1 )
	{
		console.log( '----------------------------------------------------------------------' )
		console.log( 'song spec =', util.inspect( song, library.inspectOptions ))
		console.log( 'part spec =', util.inspect( part, library.inspectOptions ))
	}

	for ( part.measure = 0; part.measure < song.nMeasures; part.measure++ )
	{
		part.thisBeat = 0
		part.lastTick = part.thisTick + (song.meter.numerator * song.ppqn)

		part.chords = song.chords	// for now...

		if ( song.loglevel >= 4 )
		{
			console.log( '----------------------------------------------------------------------' )
			console.log( 'We are on Measure #', part.measure, '; lastTick =' , part.lastTick )
		}

		for ( part.thisBeat = 0; part.thisBeat < song.meter.numerator; part.thisBeat++ )
		{
			if ( song.loglevel >= 4 )
				console.log( library.PAD4, 'Beat', part.thisBeat, 'lastTick', part.lastTick )

			while ( part.thisTick < part.lastTick )
			{
				if ( song.loglevel >= 4 )
					console.log( library.PAD4, 'thisTick =', part.thisTick, 'lastTick =', part.lastTick )
				beat.generate( song, part )
			}
		}
	}

	part.events.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

	let evts  = []
	let ptime = 0

	evts.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "tempo",
		tempo: Math.round( 60000000 / song.tempo )
	})

	evts.push(
	{
		delta: 0,
		type: "meta",
		meta_type: "time_signature",
		numerator: song.meter.numerator,
		denominator: song.meter.denominator,
		metronome: 24,
		thirtyseconds: 8
	})

	for ( const e of part.events )
	{
		const dlta = e.time - ptime
		ptime = e.time

		evts.push({ delta: dlta, type: e.type, channel: e.channel, note: e.note, velocity: e.velocity })
	}

	evts.push({ delta: 0, type: "meta", meta_type: "end_of_track" })

	if ( song.loglevel >= 1 )
	{
		console.log( '-------------------------------------------------------------------------------------' )
		console.log( 'events =', util.inspect( evts, false, null, true ))
	}

	return evts
}

module.exports = { generate }

