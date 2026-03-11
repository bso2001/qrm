
//---------------------------------------------------------------------------------------
//   Entry point
//---------------------------------------------------------------------------------------

const filsys = require("fs")
const events = require("./events")
const midi   = require("./midi")

if ( require.main === module )
{
	const inputFile = process.argv[2]
	if ( !inputFile )
	{
		console.error( "Usage: node gen.js spec.json" )
		process.exit(1)
	}

	const spec = JSON.parse( filsys.readFileSync( inputFile, "utf8" ))
	const evts = events.generate( spec )

	if ( ! evts || evts.length === 0 )
		throw new Error( "Error: no events generated" )

	midi.writeEvents( evts, spec.ppqn, spec.outputPath || "output.mid" )
}

