
//-------------------------------------------------------------------
//  Part generation
//-------------------------------------------------------------------

const evt    = require("./evt")
const common = require("./common")
const theory = require("./theory")
const util   = require("node:util")

function generate( song, section, inst, startTick )
{
        const part = {
                ...inst,
                events     : [],
                lastTick   : 0,
                thisTick   : startTick || 0,
                chordIndex : 0,
                prevRest   : false,
                intrvls    : theory.findIntervals( song, section ),
                timings    : theory.parseDuration( inst.duration ),
                minMidi    : theory.parseNoteName( inst.range[0] ),
                maxMidi    : theory.parseNoteName( inst.range[1] ),
                chords     : section.chords || song.chords,
                keyRoot    : song.keyRoot
        }

        if ( song.loglevel >= 1 )
        {
                console.log( "----------------------------------------------------------------------" )
                console.log( "song spec =", util.inspect( song, common.inspectOptions ))
                console.log( "part spec =", util.inspect( part, common.inspectOptions ))
        }

        for ( let m = 0; m < section.nMeasures; m++ )
        {
                part.thisBeat = 0
                part.measure  = m
                part.lastTick = part.thisTick + (song.meter.numerator * song.ppqn)

                if ( song.loglevel >= 3 )
                {
                        console.log( "----------------------------------------------------------------------" )
                        console.log( "We are on measure #", part.measure, "; lastTick =" , part.lastTick )
                }

                for ( part.thisBeat = 0; part.thisBeat < song.meter.numerator; part.thisBeat++ )
                {
                        if ( song.loglevel >= 3 )
                                console.log( common.PAD4, "Beat", part.thisBeat, "lastTick", part.lastTick )

                        while ( part.thisTick < part.lastTick )
                        {
                                if ( song.loglevel >= 3 )
                                        console.log( common.PAD4, "thisTick =", part.thisTick, "lastTick =", part.lastTick )
                                evt.generate( song, part )
                        }
                }
        }

        part.events.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )
        return part.events;
}

module.exports = { generate }
