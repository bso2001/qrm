
//---------------------------------------------------------------------------------------
//   Theory helpers
//---------------------------------------------------------------------------------------

const library = require("./lib")

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

const MINOR = [ 0, 2, 3, 5, 7, 8, 10 ]
const MAJOR = [ 0, 2, 4, 5, 7, 9, 11 ]
const ROMAN = { I:0, II:2, III:3, IV:4, V:5, VI:6, VII:7 }

function _degreeToSemitone( degreeStr, keyRoot )
{
	let accidental = 0
	let offset = 0
	let degree = degreeStr

	if ( degreeStr.startsWith("b") )
	{
		accidental = -1
		degree = degreeStr.slice( 1 )
	}
	else if ( degreeStr.startsWith("#") )
	{
		accidental = 1
		degree = degreeStr.slice( 1 )
	}

	if ( ROMAN[degree] !== undefined )
		offset = ROMAN[degree]
	else
	{
		const n = parseInt( degree, 10 )
		offset = n - 1
	}

	return keyRoot + offset + accidental
}

function findIntervals( song, part )
{
	if ( part.passingNotes && part.passingNotes.length > 0 ) {
		const pni = []

		for ( pn of part.passingNotes ) {
			const nn = _degreeToSemitone( pn, song.keyRoot )
			pni.push( nn )
		}

		return pni
	}

	if ( song.key.mode === "minor" )
		return MINOR
	if ( song.key.mode === "major" )
		return MAJOR

	throw new Error( "Unsupported mode: " + song.key.mode )
}

function keyToSemitone( key )
{
	const m = key.match( /^([A-G][b#]?)/i )
	if ( !m )
		throw new Error( "Bad key: " + key )

	return NOTE_BASES[ m[1] ]
}

function parseChordSymbol( sym )
{
	let overBass = null

	if ( sym.includes("/") )
	{
		const [main, bass] = sym.split("/")
		sym = main
		overBass = NOTE_BASES[bass]
	}

	const m = sym.match(/^([A-G][b#]?)(.*)$/)
	if ( !m )
		throw new Error( "Bad chord: " + sym )

	const rootName = m[1]
	const qual = m[2].toLowerCase()
	const root = (overBass !== null) ? overBass : NOTE_BASES[rootName]

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
		notes: chordIntervals[qual] || chordIntervals[""],
		root : root
	}
}
	
	// "duration": [ "1/16c", "1/8d", "1/4b", "1/2a" ]

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

	const timings = []

	for ( dspec of nd )
	{
		const dslen = dspec.length
		const lastchar = dspec.charAt( dslen-1 )
		let   multiplier, nlen

		if ( ! library.isAlpha( lastchar ))
		{
			multiplier = 1
			nlen = dslen
		}
		else 
		{
			multiplier = 1 + "abcdefghijklmnopqrstuvwxyz".indexOf( lastchar ) 
			nlen = dslen - 1
		}

		const note = dspec.substring( 0, nlen )
		const dval = ndDivisors[ note ]

		if ( !dval || dval === "undefined" )
			continue

		for ( let i = 0; i < multiplier; i++ )
			timings.push( dval )
	}

	return timings
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

module.exports = { findIntervals, keyToSemitone, parseChordSymbol, parseDuration, parseNoteName }

