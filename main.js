
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

        const song = JSON.parse( fsys.readFileSync( inputFile, "utf8" ) )
        song.keyRoot = song.key ? theory.keyToSemitone( song.key.tonic ) : 0

        if ( !song.ppqn || song.ppqn === "undefined" )
                song.ppqn = 480

        for ( const section of song.sections )
        {
                if ( !section.parts ) continue;
                for ( const p of section.parts )
                {
                        const pEvents = part.generate( song, section, p, 0 )

                        if ( ! pEvents || pEvents.length === 0 ) {
                                console.error( "Error: no events generated for", p.name )
                        } else {
                                pEvents.sort( (a, b) => a.time - b.time || (a.type === "note_off" ? -1 : 1) )

                                let evts  = []
                                let ptime = 0

                                evts.push(
                                {
                                        delta: 0,
                                        type: "meta",
                                        meta_type: "tempo",
                                        tempo: Math.round( 60000000 / song.tempo )
                                })

                                evts.push(
                                {
                                        delta: 0,
                                        type: "meta",
                                        meta_type: "time_signature",
                                        numerator: song.meter.numerator,
                                        denominator: song.meter.denominator,
                                        metronome: 24,
                                        thirtyseconds: 8
                                })

                                for ( const e of pEvents )
                                {
                                        const dlta = e.time - ptime
                                        ptime = e.time

                                        evts.push({ delta: dlta, type: e.type, channel: e.channel, note: e.note, velocity: e.velocity })
                                }

                                evts.push({ delta: 0, type: "meta", meta_type: "end_of_track" })

                                midi.writeEvents( evts, song.ppqn, 
                                                (song.outputDir ? song.outputDir : ".") + "/" + p.file )
                        }
                }
        }
}
