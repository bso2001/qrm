//---------------------------------------------------------------------------------------
//   Theory helpers
//---------------------------------------------------------------------------------------

const NOTE_BASES =
{
	"C" : 0,
	"C#": 1,  "Db": 1,
	"D" : 2,
	"D#": 3,  "Eb": 3,
	"E" : 4,
	"F" : 5,
	"F#": 6,  "Gb": 6,
	"G" : 7,
	"G#": 8,  "Ab": 8,
	"A" : 9,
	"A#": 10, "Bb": 10,
	"B" : 11
}

function parseNoteName( name )
{
	const m = name.match( /^([A-G][b#]?)(\d)$/ )
	if (!m)
		throw new Error( "Bad note name: " + name )

	const pitch = NOTE_BASES[ m[1] ] + 12		// "modern" note numbers?
	const octave = parseInt( m[2], 10 )

	return pitch + (octave + 1) * 12
}

function keyToSemitone( key )
{
	const m = key.match( /^([A-G][b#]?)/i )
	if ( !m )
		throw new Error( "Bad key: " + key )

	return NOTE_BASES[ m[1] ]
}

const MINOR = [ 0, 2, 3, 5, 7, 8, 10 ]
const MAJOR = [ 0, 2, 4, 5, 7, 9, 11 ]

function scaleIntervals( name )
{
	if ( name === "minor" )
		return MINOR
	if ( name === "major" )
		return MAJOR

	throw new Error( "Unsupported scale: " + name )
}

function degreeToSemitone( degreeStr, keyRoot, intervals )
{
	const romanMap = { I:0, II:1, III:2, IV:3, V:4, VI:5, VII:6 }
	let accidental = 0
	let core = degreeStr

	if ( degreeStr.startsWith("b") )
	{
		accidental = -1
		core = degreeStr.slice( 1 )
	}
	else if ( degreeStr.startsWith("#") )
	{
		accidental = 1
		core = degreeStr.slice( 1 )
	}

	if ( romanMap[core] !== undefined )
	{
		const idx = romanMap[core]
		return keyRoot + intervals[idx] + accidental
	}

	const n = parseInt( core, 10 )
	return keyRoot + intervals[n - 1] + accidental
}

function parseChordSymbol( sym )
{
	let bassOverride = null

	if ( sym.includes("/") )
	{
		const [main, bass] = sym.split("/")
		sym = main
		bassOverride = NOTE_BASES[bass]
	}

	const m = sym.match(/^([A-G][b#]?)(.*)$/)
	if ( !m )
		throw new Error( "Bad chord: " + sym )

	const rootName = m[1]
	const qual = m[2].toLowerCase()
	const root = NOTE_BASES[rootName]

	const chordIntervals =
	{
		"": [0, 4, 7],
		"m": [0, 3, 7],
		"min": [0, 3, 7],
		"dim": [0, 3, 6],
		"aug": [0, 4, 8],
		"sus2": [0, 2, 7],
		"sus4": [0, 5, 7],
		"6": [0, 4, 7, 9],
		"m6": [0, 3, 7, 9],
		"7": [0, 4, 7, 10],
		"maj7": [0, 4, 7, 11],
		"m7": [0, 3, 7, 10],
		"min7": [0, 3, 7, 10],
		"9": [0, 4, 7, 10, 14],
		"m9": [0, 3, 7, 10, 14],
		"11": [0, 4, 7, 10, 14, 17],
		"m11": [0, 3, 7, 10, 14, 17],
		"13": [0, 4, 7, 10, 14, 17, 21],
		"m13": [0, 3, 7, 10, 14, 17, 21]
	}

	return {
		root,
		notes: chordIntervals[qual] || chordIntervals[""],
		bassOverride
	}
}

function parseDuration( nd )
{
	const ndDivisors = 
	{
		"1"    : 0.25,
		"1/2"  : 0.5,
		"1/4"  : 1,
		"1/8"  : 2,
		"1/16" : 4,
		"1/32" : 8,
		"1/64" : 16
	}

	let d = ndDivisors[nd]
	return ( !d || d === "undefined" ) ? 1 : d;
}

module.exports = { degreeToSemitone, scaleIntervals, keyToSemitone, parseChordSymbol, parseDuration, parseNoteName }

