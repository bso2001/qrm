
//-------------------------------------------------------------------
//   Engine orchestration
//-------------------------------------------------------------------

const path   = require("path")
const part   = require("./part")
const theory = require("./theory")
const midi   = require("./midi")

function generateSong( song, outputDir )
{
	// work on a shallow clone so callers are not surprised by mutations

	const s = { ...song }

	if ( !s.ppqn || s.ppqn === "undefined" )
		s.ppqn = 480

	s.keyRoot = s.key ? theory.keyToSemitone( s.key.tonic ) : 0

	const files = []

	for ( const section of s.sections )
	{
		if ( !section.parts ) continue

		for ( const p of section.parts )
		{
			const pEvents = part.generate( s, section, p, 0 )

			if ( !pEvents || pEvents.length === 0 )
			{
				console.error( "Error: no events generated for", p.name )
				continue
			}

			let evts  = []
			let ptime = 0

			evts.push(
			{
				delta      : 0,
				type       : "meta",
				meta_type  : "tempo",
				tempo      : Math.round( 60000000 / s.tempo )
			})

			evts.push(
			{
				delta         : 0,
				type          : "meta",
				meta_type     : "time_signature",
				numerator     : s.meter.numerator,
				denominator   : s.meter.denominator,
				metronome     : 24,
				thirtyseconds : 8
			})

			for ( const e of pEvents )
			{
				const dlta = e.time - ptime
				ptime = e.time
				evts.push({ delta: dlta, type: e.type, channel: e.channel, note: e.note, velocity: e.velocity })
			}

			evts.push({ delta: 0, type: "meta", meta_type: "end_of_track" })

			const outPath = path.join( outputDir, p.file )
			midi.writeEvents( evts, s.ppqn, outPath )
			files.push( p.file )
		}
	}

	return files
}

module.exports = { generateSong }
