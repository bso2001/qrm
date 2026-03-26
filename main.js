
//-------------------------------------------------------------------
//   Entry point
//-------------------------------------------------------------------

const fsys   = require("fs")
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

	const song = JSON.parse( fsys.readFileSync( inputFile, "utf8" ))
	const root = song.key ? theory.keyToSemitone( song.key.tonic ) : 0

	if ( !song.ppqn || song.ppqn === "undefined" )
		song.ppqn = 480

	for ( pJson of song.parts )
	{
		if ( !pJson.file )
			console.error( "Error: no file for", pJson )
		else
		{
			pJson.keyRoot = root

			const pEvents = part.generate( song, pJson )

			if ( ! pEvents || pEvents.length === 0 )
				console.error( "Error: no events generated for", pJson )
			else
			{
				const outputPath = (song.outputDir ? song.outputDir : '.') + '/' + pJson.file
				midi.writeEvents( pEvents, song.ppqn, outputPath )
			}
		}
	}
}

