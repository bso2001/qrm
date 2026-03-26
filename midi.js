
//-------------------------------------------------------------------
//   MIDI helpers
//-------------------------------------------------------------------

const fs = require("fs")

function _writeVLQ( value )
{
	const bytes = []
	let buffer = value & 0x7F

	while ( value >>= 7 )
	{
		buffer <<= 8
		buffer |= ( (value & 0x7F) | 0x80 )
	}

	while ( true )
	{
		bytes.push( buffer & 0xFF )
		if ( buffer & 0x80 )
			buffer >>= 8
		else
			break
	}

	return bytes
}

function _encodeEvent( evt )
{
	const evtData = []
	evtData.push( ..._writeVLQ(evt.delta) )

	switch ( evt.type )
	{
		case "note_on":
			evtData.push( 0x90 | evt.channel, evt.note & 0x7F, evt.velocity & 0x7F )
			break
		case "note_off":
			evtData.push( 0x80 | evt.channel, evt.note & 0x7F, evt.velocity & 0x7F )
			break
		case "program_change":
			evtData.push( 0xC0 | evt.channel, evt.program & 0x7F )
			break
		case "meta":
			evtData.push( 0xFF )

			if ( evt.meta_type === "end_of_track" )
				evtData.push( 0x2F, 0x00 )

			else if ( evt.meta_type === "tempo" )
			{
				evtData.push(
					0x51, 0x03,
					(evt.tempo >> 16) & 0xFF,
					(evt.tempo >> 8) & 0xFF,
					evt.tempo & 0xFF
				)
			}

			else if ( evt.meta_type === "time_signature" )
			{
				evtData.push(
					0x58, 0x04,
					evt.numerator,
					Math.log2(evt.denominator),
					evt.metronome,
					evt.thirtyseconds
				)
			}

			break
	}

	return evtData
}

function writeEvents( events, ticks, outputPath )
{
	let trackData = []
	for ( const evt of events )
		trackData.push( ..._encodeEvent(evt) )

	const hasEOT = events.some( e => e.type === "meta" && e.meta_type === "end_of_track" )
	if ( !hasEOT )
		trackData.push( ..._writeVLQ(0), 0xFF, 0x2F, 0x00 )

	const header = Buffer.alloc( 14 )
	header.write( "MThd", 0 )
	header.writeUInt32BE( 6, 4 )
	header.writeUInt16BE( 0, 8 )	// format always 0
	header.writeUInt16BE( 1, 10 )
	header.writeUInt16BE( ticks, 12 )

	const trackHeader = Buffer.alloc( 8 )
	trackHeader.write( "MTrk", 0 )
	trackHeader.writeUInt32BE( trackData.length, 4 )

	const trackBody = Buffer.from( trackData )

	const full = Buffer.concat( [header, trackHeader, trackBody] )
	fs.writeFileSync( outputPath, full )
}

module.exports = { writeEvents }

