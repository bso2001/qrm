
function isAlpha( ch )
{
	return /^[A-Z]$/i.test( ch )
}

function noteOff( tick, note )
{
	return {
		time: tick,
		type: "note_off",
		channel: 0,
		note: note,
		velocity: 0
	}
}

function noteOn( tick, note, vel )
{
	return {
		time: tick,
		type: "note_on",
		channel: 0,
		note: note,
		velocity: vel
	}
}

function parseValue( val )
{
	if ( Array.isArray(val) )
		return randomChoice(val)

	return val
}

function probabilityHit( prob )
{
	return Math.random() < prob
}

function randomChoice( arr )
{
	return arr[ Math.floor( Math.random() * arr.length )]
}

function randomInRange( [lo, hi] )
{
	return Math.floor( Math.random() * (hi - lo + 1) ) + lo
}

const PAD2 = '  '
const PAD4 = (PAD2 + PAD2)
const PAD8 = (PAD4 + PAD4)

module.exports = { isAlpha, noteOff, noteOn, parseValue, probabilityHit, randomChoice, randomInRange, PAD4, PAD8 }

