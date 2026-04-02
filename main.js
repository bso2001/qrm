
//-------------------------------------------------------------------
//   Entry point
//-------------------------------------------------------------------

const fsys   = require("fs")
const common = require("./common")
const midi   = require("./midi")
const part   = require("./part")
const theory = require("./theory")

if ( require.main === module )
{
	const inputFile = process.argv[2]

	if ( !inputFile )
	{
		console.error( "Usage: node main.js input.json" )
		process.exit(1)
	}

	common.song = JSON.parse( fsys.readFileSync( inputFile, "utf8" ))
	common.song.keyRoot = common.song.key ? theory.keyToSemitone( common.song.key.tonic ) : 0

	if ( !common.song.ppqn || common.song.ppqn === "undefined" )
		common.song.ppqn = 480

	for ( p of common.song.parts )
	{
		const pEvents = part.generate( p )

		if ( ! pEvents || pEvents.length === 0 )
			console.error( "Error: no events generated for", p )
		else
			midi.writeEvents( pEvents, common.song.ppqn, 
					(common.song.outputDir ? song.outputDir : '.') + '/' + p.file )
	}
}

