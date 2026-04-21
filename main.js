
//-------------------------------------------------------------------
//   CLI entry point
//-------------------------------------------------------------------

const fs                   = require("fs")
const path                 = require("path")
const { generateSong }     = require("./engine/generateSong")

if ( require.main === module )
{
	const inputFile = process.argv[2]

	if ( !inputFile )
	{
		console.error( "Usage: node main.js input.json" )
		process.exit(1)
	}

	const song      = JSON.parse( fs.readFileSync( inputFile, "utf8" ) )
	const outputDir = song.outputDir || path.dirname( inputFile )

	generateSong( song, outputDir )
}
