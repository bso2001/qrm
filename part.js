
//-------------------------------------------------------------------
//  Part generation
//-------------------------------------------------------------------

const evt    = require("./evt")
const common = require("./common")
const theory = require("./theory")
const util   = require("node:util")

function generate( pJson )
{
	common.part = pJson

	common.part.events     = []
	common.part.lastTick   = 0
	common.part.thisTick   = 0
	common.part.chordIndex = 0
	common.part.prevRest   = false

	common.part.intrvls    = theory.findIntervals( song, pJson )
	common.part.timings    = theory.parseDuration( pJson.duration )
	common.part.minMidi    = theory.parseNoteName( pJson.range[0] )
	common.part.maxMidi    = theory.parseNoteName( pJson.range[1] )

	if ( common.song.loglevel >= 1 )
	{
		console.log( '----------------------------------------------------------------------' )
		console.log( 'common.song spec =', util.inspect( common.song, common.inspectOptions ))
		console.log( 'common.part spec =', util.inspect( common.part, common.inspectOptions ))
	}

	for ( m = 0; m < song.nMeasures; m++ )
	{
		common.voice = {}

		common.part.thisBeat = 0
		common.part.measure  = m
		common.part.lastTick = part.thisTick + (song.meter.numerator * song.ppqn)

		common.part.chords = common.song.chords	// for now...

		if ( song.loglevel >= 3 )
		{
			console.log( '----------------------------------------------------------------------' )
			console.log( 'We are on measure #', common.part.measure, '; lastTick =' , common.part.lastTick )
		}

		for ( part.thisBeat = 0; part.thisBeat < song.meter.numerator; part.thisBeat++ )
		{
			if ( song.loglevel >= 3 )
				console.log( common.PAD4, 'Beat', part.thisBeat, 'lastTick', part.lastTick )

			while ( part.thisTick < part.lastTick )
			{
				if ( song.loglevel >= 3 )
					console.log( common.PAD4, 'thisTick =', part.thisTick, 'lastTick =', part.lastTick )
				evt.generate( song, part )
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

