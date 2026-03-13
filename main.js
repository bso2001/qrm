
//---------------------------------------------------------------------------------------
//   Entry point
//---------------------------------------------------------------------------------------

const fsys = require("fs")
const riff = require("./riff")
const midi = require("./midi")

if ( require.main === module )
{
	const inputFile = process.argv[2]
	if ( !inputFile )
	{
		console.error( "Usage: node main.js input.json" )
		process.exit(1)
	}

	const json = JSON.parse( fsys.readFileSync( inputFile, "utf8" ))
	const mldy = riff.generate( json )

	if ( ! mldy || mldy.length === 0 )
		throw new Error( "Error: no riff generated" )

	midi.writeEvents( mldy, json.ppqn, json.outputPath || "output.mid" )
}

