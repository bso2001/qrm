
//---------------------------------------------------------------------------------------
//  Riff generation
//---------------------------------------------------------------------------------------

const beat    = require("./beat")
const library = require("./lib")
const theory  = require("./theory")

function generate( riff )
{
			// we expand the input def, adding derived/calculated `global info` for convenience
			// calling it `riff` the object also holds the MIDI events as they are generated
			// as well as generation status data such as beat and tick numbers

	riff.intrvls  = theory.scaleIntervals( riff.scale )
	riff.keyRoot  = theory.keyToSemitone( riff.key )
	riff.quikval  = theory.parseDuration( riff.fastestNote )
	riff.minMidi  = theory.parseNoteName( riff.range[0] )
	riff.maxMidi  = theory.parseNoteName( riff.range[1] )
	riff.measure  = 0
	riff.thisBeat = 0
	riff.thisTick = 0
	riff.lastTick = 0
	riff.prevRest = false
	riff.events   = []

	if ( riff.verbose ) {
		console.log( '-------------------------------------------------------' )
		console.log( 'starting riff =', riff )
	}

	for ( let measure = 0; measure < riff.nMeasures; measure++ ) {
		riff.thisBeat = 0
		riff.lastTick = (riff.thisTick + (riff.meter.numerator * riff.ppqn)) // ?? - riff.quikval 

		if ( riff.verbose ) {
			console.log( '-------------------------------------------------------' )
			console.log( 'We are on Measure #', measure, '; lastTick =' , riff.lastTick )
		}

		for ( ; riff.thisBeat < riff.meter.numerator; riff.thisBeat++ ) {
			if ( riff.verbose )
				console.log( library.PAD4, 'Beat', riff.thisBeat )

			while ( riff.thisTick < riff.lastTick ) {
				if ( riff.verbose )
					console.log( library.PAD4, 'thisTick =', riff.thisTick, 'lastTick =', riff.lastTick )
				beat.generate( riff )
			}
		}
	}

	riff.events.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

	let evts  = []
	let ptime = 0

	evts.push({
		delta: 0,
		type: "meta",
		meta_type: "tempo",
		tempo: Math.round( 60000000 / riff.tempo )
	})

	evts.push({
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

	if ( riff.verbose ) {
		console.log( '-------------------------------------------------------' )
		console.log( 'evts =', evts )
	}

	return evts
}

module.exports = { generate }

