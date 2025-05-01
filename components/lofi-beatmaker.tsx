"use client"

import { useEffect, useState, useRef } from "react"
import { Disc3, Play, Square, Volume2, AudioWaveformIcon as Waveform, Mic } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import StepSequencer from "@/components/step-sequencer"
import SamplePads from "@/components/sample-pads"
import MixerControls from "@/components/mixer-controls"
import VinylEffect from "@/components/vinyl-effect"
import dynamic from "next/dynamic"

// Import MIDISounds dynamically with no SSR
const MIDISounds = dynamic(() => import("midi-sounds-react"), {
  ssr: false,
})

// Lo-fi drum kit instrument numbers
const DRUM_INSTRUMENTS = {
  KICK: 5,
  SNARE: 38,
  HIHAT: 42,
  PERC: 60,
  RIM: 37,
  TOM: 47,
  CLAP: 39,
  SHAKER: 70,
}

// Define Track type
interface Track {
  id: number;
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  instrument: number;
  isRecorded?: boolean;
  recordedPattern?: boolean[];
}

// Interface for recording state
interface RecordingState {
  isRecording: boolean;
  recordingTrack: number | null;
  recordedSteps: boolean[];
  quantize: boolean;
}

// Available instruments to add
const AVAILABLE_INSTRUMENTS = [
  { name: "Kick", id: DRUM_INSTRUMENTS.KICK },
  { name: "Snare", id: DRUM_INSTRUMENTS.SNARE },
  { name: "Hi-hat", id: DRUM_INSTRUMENTS.HIHAT },
  { name: "Perc", id: DRUM_INSTRUMENTS.PERC },
  { name: "Rim", id: DRUM_INSTRUMENTS.RIM },
  { name: "Tom", id: DRUM_INSTRUMENTS.TOM },
  { name: "Clap", id: DRUM_INSTRUMENTS.CLAP },
  { name: "Shaker", id: DRUM_INSTRUMENTS.SHAKER },
]

export default function LofiBeatmaker() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(85)
  const [currentStep, setCurrentStep] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, name: "Kick", volume: 0.8, pan: 0, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.KICK },
    { id: 2, name: "Snare", volume: 0.7, pan: 0, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.SNARE },
    { id: 3, name: "Hi-hat", volume: 0.6, pan: 0.2, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.HIHAT },
    { id: 4, name: "Perc", volume: 0.5, pan: -0.3, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.PERC },
    { id: 5, name: "Rim", volume: 0.6, pan: 0.3, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.RIM },
    { id: 6, name: "Tom", volume: 0.7, pan: -0.2, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.TOM },
    { id: 7, name: "Clap", volume: 0.65, pan: 0.1, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.CLAP },
    { id: 8, name: "Shaker", volume: 0.55, pan: -0.1, mute: false, solo: false, instrument: DRUM_INSTRUMENTS.SHAKER },
  ])
  const [vinylEffect, setVinylEffect] = useState({
    enabled: true,
    amount: 0.3,
    age: 0.5,
  })
  const [sequence, setSequence] = useState(
    Array(8)
      .fill(0)
      .map(() => Array(16).fill(false)),
  )
  
  const [availableInstruments, setAvailableInstruments] = useState<{ name: string; id: number }[]>([])
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    recordingTrack: null,
    recordedSteps: Array(16).fill(false),
    quantize: true
  })

  // References
  const midiSounds = useRef<any>(null)
  const sequencerInterval = useRef<NodeJS.Timeout | null>(null)
  const vinylNoiseInterval = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const nextIdRef = useRef(Math.max(...tracks.map(track => track.id)) + 1)

  // Update available instruments whenever tracks change
  useEffect(() => {
    const usedInstrumentIds = tracks.map(track => track.instrument)
    setAvailableInstruments(
      AVAILABLE_INSTRUMENTS.filter(instrument => !usedInstrumentIds.includes(instrument.id))
    )
  }, [tracks])

  // Initialize MIDI sounds
  useEffect(() => {
    if (midiSounds.current) {
      try {
        const allInstruments = Object.values(DRUM_INSTRUMENTS)
        allInstruments.forEach(instrumentId => {
          if (midiSounds.current?.cacheInstrument) {
            midiSounds.current.cacheInstrument(instrumentId)
          }
        })

        tracks.forEach((track) => {
          if (midiSounds.current?.setDrumVolume) {
            midiSounds.current.setDrumVolume(track.instrument, track.volume)
          }
        })

        setIsInitialized(true)
      } catch (error) {
        console.error("Error initializing MIDI sounds:", error)
      }
    }

    return () => {
      if (sequencerInterval.current) {
        clearInterval(sequencerInterval.current)
      }
      if (vinylNoiseInterval.current) {
        clearInterval(vinylNoiseInterval.current)
      }
    }
  }, [midiSounds.current])

  // Update track volumes and panning when changed
  useEffect(() => {
    if (midiSounds.current && isInitialized) {
      tracks.forEach((track) => {
        if (midiSounds.current?.setDrumVolume) {
          midiSounds.current.setDrumVolume(track.instrument, track.mute ? 0 : track.volume)
        }
      })
    }
  }, [tracks, isInitialized])

  // Handle vinyl effect
  useEffect(() => {
    if (vinylNoiseInterval.current) {
      clearInterval(vinylNoiseInterval.current)
    }

    if (vinylEffect.enabled && midiSounds.current && isInitialized) {
      const crackleSound = 0

      try {
        if (midiSounds.current?.cacheInstrument) {
          midiSounds.current.cacheInstrument(crackleSound)
        }

        vinylNoiseInterval.current = setInterval(
          () => {
            if (midiSounds.current && midiSounds.current?.playDrumsNow) {
              const randomVolume = Math.random() * vinylEffect.amount * 0.05 * vinylEffect.age
              if (midiSounds.current?.setDrumVolume) {
                midiSounds.current.setDrumVolume(crackleSound, randomVolume)
              }
              midiSounds.current.playDrumsNow([crackleSound])
            }
          },
          500 + Math.random() * 1000,
        )
      } catch (error) {
        console.error("Error setting up vinyl effect:", error)
      }
    }

    return () => {
      if (vinylNoiseInterval.current) {
        clearInterval(vinylNoiseInterval.current)
      }
    }
  }, [vinylEffect, isInitialized])

  // Start/stop sequencer
  useEffect(() => {
    if (sequencerInterval.current) {
      clearInterval(sequencerInterval.current)
    }

    if (isPlaying && midiSounds.current && isInitialized) {
      const stepDuration = ((60 / bpm) * 1000) / 4
      let step = currentStep

      try {
        sequencerInterval.current = setInterval(() => {
          setCurrentStep(step)

          sequence.forEach((trackSequence, trackIndex) => {
            if (
              trackIndex < tracks.length &&
              trackSequence[step] &&
              !tracks[trackIndex].mute &&
              midiSounds.current?.playDrumsNow
            ) {
              midiSounds.current.playDrumsNow([tracks[trackIndex].instrument])
            }
          })

          step = (step + 1) % 16
        }, stepDuration)
      } catch (error) {
        console.error("Error starting sequencer:", error)
        setIsPlaying(false)
      }
    }

    return () => {
      if (sequencerInterval.current) {
        clearInterval(sequencerInterval.current)
      }
    }
  }, [isPlaying, sequence, tracks, bpm, isInitialized])

  const togglePlay = () => {
    if (!isInitialized) return
    setIsPlaying(!isPlaying)
  }

  const triggerSample = (trackIndex: number) => {
    if (midiSounds.current && isInitialized && !tracks[trackIndex].mute && midiSounds.current?.playDrumsNow) {
      try {
        midiSounds.current.playDrumsNow([tracks[trackIndex].instrument])
      } catch (error) {
        console.error("Error triggering sample:", error)
      }
    }
  }

  const updateTrackSetting = (trackId: number, setting: string, value: any) => {
    setTracks(tracks.map((track) => (track.id === trackId ? { ...track, [setting]: value } : track)))
  }

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    const newSequence = [...sequence]
    if (trackIndex >= newSequence.length) {
      while (trackIndex >= newSequence.length) {
        newSequence.push(Array(16).fill(false))
      }
    }
    
    newSequence[trackIndex] = [...newSequence[trackIndex]]
    newSequence[trackIndex][stepIndex] = !newSequence[trackIndex][stepIndex]
    setSequence(newSequence)
  }

  const removeTrack = (trackId: number) => {
    const trackIndex = tracks.findIndex(track => track.id === trackId)
    if (tracks.length <= 1) return
    
    setTracks(tracks.filter(track => track.id !== trackId))
    setSequence(prevSequence => {
      const newSequence = [...prevSequence]
      if (trackIndex !== -1) {
        newSequence.splice(trackIndex, 1)
      }
      return newSequence
    })
  }

  const addTrack = (instrumentName: string, instrumentId: number) => {
    const newTrackId = nextIdRef.current
    nextIdRef.current = nextIdRef.current + 1
    
    const newTrack: Track = {
      id: newTrackId,
      name: instrumentName,
      volume: 0.7,
      pan: 0,
      mute: false,
      solo: false,
      instrument: instrumentId
    }
    
    setTracks([...tracks, newTrack])
    setSequence(prevSequence => {
      const newSequence = [...prevSequence]
      newSequence.push(Array(16).fill(false))
      return newSequence
    })
  }

  const startRecording = (trackIndex: number) => {
    if (!isInitialized) return
    
    setRecording({
      ...recording,
      isRecording: true,
      recordingTrack: trackIndex,
      recordedSteps: Array(16).fill(false)
    })
    
    if (!isPlaying) {
      setIsPlaying(true)
    }
  }

  const stopRecording = () => {
    if (recording.recordingTrack !== null) {
      setSequence(prevSequence => {
        const newSequence = [...prevSequence]
        if (recording.recordingTrack !== null && recording.recordingTrack < newSequence.length) {
          newSequence[recording.recordingTrack] = [...recording.recordedSteps]
        }
        return newSequence
      })
    }
    
    setRecording({
      ...recording,
      isRecording: false,
      recordingTrack: null
    })
  }

  const recordHit = (trackIndex: number) => {
    if (!recording.isRecording || recording.recordingTrack !== trackIndex || !isPlaying) return
    
    if (recording.quantize) {
      setRecording(prev => {
        const newRecordedSteps = [...prev.recordedSteps]
        newRecordedSteps[currentStep] = true
        return {
          ...prev,
          recordedSteps: newRecordedSteps
        }
      })
    } else {
      setRecording(prev => {
        const newRecordedSteps = [...prev.recordedSteps]
        newRecordedSteps[currentStep] = true
        return {
          ...prev,
          recordedSteps: newRecordedSteps
        }
      })
    }
    
    triggerSample(trackIndex)
  }

  return (
    <div
      className="w-full max-w-4xl bg-white dark:bg-black rounded-xl shadow-lg p-6 space-y-6 transition-colors"
      ref={containerRef}
      id="lofi-beatmaker-app"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">Lo-Fi Beatmaker</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="bpm" className="text-sm font-medium dark:text-zinc-300">
              BPM
            </Label>
            <div className="w-24">
              <Slider id="bpm" min={60} max={140} step={1} value={[bpm]} onValueChange={(value) => setBpm(value[0])} />
            </div>
            <span className="text-sm font-mono dark:text-zinc-300">{bpm}</span>
          </div>
          <Button
            onClick={togglePlay}
            variant="outline"
            size="icon"
            className={
              isPlaying
                ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
            }
            disabled={!isInitialized}
          >
            {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center">
              <Waveform className="h-4 w-4 mr-1" /> Step Sequencer
            </h2>
            <StepSequencer sequence={sequence} currentStep={currentStep} tracks={tracks} onToggleStep={toggleStep} />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center">
              <Volume2 className="h-4 w-4 mr-1" /> Mixer
            </h2>
            <MixerControls tracks={tracks} onUpdateTrack={updateTrackSetting} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sample Pads</h2>
              {recording.isRecording ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={stopRecording} 
                  className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                >
                  <Square className="h-3 w-3 mr-1" /> Stop Recording
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRecording(prev => ({ ...prev, quantize: !prev.quantize }))}
                    className={recording.quantize 
                      ? "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" 
                      : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    }
                  >
                    {recording.quantize ? "Quantize: On" : "Quantize: Off"}
                  </Button>
                </div>
              )}
            </div>
            <SamplePads 
              tracks={tracks} 
              onTriggerSample={(trackIndex) => {
                if (recording.isRecording && recording.recordingTrack === trackIndex) {
                  recordHit(trackIndex);
                } else {
                  triggerSample(trackIndex);
                }
              }}
              onRemoveTrack={removeTrack}
              onAddTrack={addTrack}
              availableInstruments={availableInstruments}
              isRecording={recording.isRecording}
              recordingTrack={recording.recordingTrack}
              onStartRecording={startRecording}
            />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center">
              <Disc3 className="h-4 w-4 mr-1" /> Vinyl Effect
            </h2>
            <VinylEffect effect={vinylEffect} onChange={setVinylEffect} />
          </div>
        </div>
      </div>

      <div style={{ display: "none" }}>
        {typeof window !== "undefined" && (
          <MIDISounds
            appElementName="lofi-beatmaker-app"
            instruments={[]}
            drums={[
              ...Object.values(DRUM_INSTRUMENTS),
              128,
            ]}
            ref={midiSounds}
          />
        )}
      </div>
    </div>
  )
}
