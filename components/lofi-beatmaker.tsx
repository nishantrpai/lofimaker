"use client"

import { useEffect, useState, useRef, MutableRefObject } from "react"
import { Disc3, Play, Square, Volume2, AudioWaveformIcon as Waveform } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import StepSequencer from "@/components/step-sequencer"
import SamplePads from "@/components/sample-pads"
import MixerControls from "@/components/mixer-controls"
import VinylEffect from "@/components/vinyl-effect"
import dynamic from "next/dynamic"

// Add TypeScript declaration for midi-sounds-react
declare module 'midi-sounds-react' {
  export interface MidiSounds {
    cacheInstrument?: (instrumentId: number) => void;
    setDrumVolume?: (instrumentId: number, volume: number) => void;
    playDrumsNow?: (instruments: number[]) => void;
  }
  // Default export
  export default function MIDISounds(props: {
    appElementName: string;
    instruments: number[];
    drums: number[];
    ref?: any;
  }): JSX.Element;
}

// Import MIDISounds dynamically with no SSR to avoid React Modal issues
const MIDISounds = dynamic(() => import("midi-sounds-react"), {
  ssr: false,
})

// Lo-fi drum kit instrument numbers
const DRUM_INSTRUMENTS = {
  KICK: 5, // Acoustic Bass Drum
  SNARE: 38, // Acoustic Snare
  HIHAT: 42, // Closed Hi-hat
  PERC: 60, // Hi Bongo
  RIM: 37, // Side Stick
  TOM: 47, // Low-Mid Tom
  CLAP: 39, // Hand Clap
  SHAKER: 70, // Maracas
  COWBELL: 56, // Cowbell
  TAMBOURINE: 54, // Tambourine
  CONGA: 64, // Low Conga
  CABASA: 69, // Cabasa
  GUIRO: 73, // Short Guiro
  VIBRASLAP: 58, // Vibraslap
  CUICA: 78, // Mute Cuica
  TRIANGLE: 80, // Mute Triangle
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
  { name: "Cowbell", id: DRUM_INSTRUMENTS.COWBELL },
  { name: "Tambourine", id: DRUM_INSTRUMENTS.TAMBOURINE },
  { name: "Conga", id: DRUM_INSTRUMENTS.CONGA },
  { name: "Cabasa", id: DRUM_INSTRUMENTS.CABASA },
  { name: "Guiro", id: DRUM_INSTRUMENTS.GUIRO },
  { name: "Vibraslap", id: DRUM_INSTRUMENTS.VIBRASLAP },
  { name: "Cuica", id: DRUM_INSTRUMENTS.CUICA },
  { name: "Triangle", id: DRUM_INSTRUMENTS.TRIANGLE },
]

// Define Instrument type
interface Instrument {
  name: string;
  id: number;
}

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
  
  // Get currently used instruments to filter the available instruments list
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([])
  
  // Track highest ID to ensure unique IDs for new tracks
  const nextIdRef = useRef(Math.max(...tracks.map(track => track.id)) + 1)

  // Reference to the MIDISounds component
  const midiSounds = useRef<any>(null)
  const sequencerInterval = useRef<NodeJS.Timeout | null>(null)
  const vinylNoiseInterval = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  // Update available instruments whenever tracks change
  useEffect(() => {
    const usedInstrumentIds = tracks.map(track => track.instrument)
    setAvailableInstruments(
      AVAILABLE_INSTRUMENTS.filter(instrument => !usedInstrumentIds.includes(instrument.id))
    )
  }, [tracks])

  // Initialize MIDI sounds
  useEffect(() => {
    // We'll initialize the drum instruments when the component mounts
    if (midiSounds.current) {
      try {
        // Load all drum instruments
        const allInstruments = Object.values(DRUM_INSTRUMENTS)
        
        allInstruments.forEach(instrumentId => {
          if (midiSounds.current?.cacheInstrument) {
            midiSounds.current.cacheInstrument(instrumentId)
          }
        })

        // Set initial volumes
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

    // Clean up intervals on unmount
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
        // Set drum volume
        if (midiSounds.current?.setDrumVolume) {
          midiSounds.current.setDrumVolume(track.instrument, track.mute ? 0 : track.volume)
        }
      })
    }
  }, [tracks, isInitialized])

  // Handle vinyl effect
  useEffect(() => {
    // Clear any existing vinyl noise interval
    if (vinylNoiseInterval.current) {
      clearInterval(vinylNoiseInterval.current)
      vinylNoiseInterval.current = null;
    }

    // If vinyl effect is enabled, create a subtle noise at random intervals
    if (vinylEffect.enabled && midiSounds.current && isInitialized) {
      // Use a percussion sound with very low volume to simulate vinyl crackle
      const crackleSound = 128 // Hi-hat (pedal) - works well for subtle crackle

      try {
        if (midiSounds.current?.cacheInstrument) {
          midiSounds.current.cacheInstrument(crackleSound)
        }

        vinylNoiseInterval.current = setInterval(
          () => {
            // Additional check to make sure the effect is still enabled when the interval fires
            if (midiSounds.current && midiSounds.current?.playDrumsNow) {
              // Randomize the volume based on the vinyl age and amount
              const randomVolume = Math.random() * vinylEffect.amount * 0.05 * vinylEffect.age
              if (midiSounds.current?.setDrumVolume) {
                midiSounds.current.setDrumVolume(crackleSound, randomVolume)
              }
              midiSounds.current.playDrumsNow([crackleSound])
            }
          },
          500 + Math.random() * 1000,
        ) // Random interval for more natural crackle
      } catch (error) {
        console.error("Error setting up vinyl effect:", error)
      }
    }

    return () => {
      if (vinylNoiseInterval.current) {
        clearInterval(vinylNoiseInterval.current)
        vinylNoiseInterval.current = null;
      }
    }
  }, [vinylEffect, isInitialized])

  // Start/stop sequencer
  useEffect(() => {
    if (sequencerInterval.current) {
      clearInterval(sequencerInterval.current)
    }

    if (isPlaying && midiSounds.current && isInitialized) {
      const stepDuration = ((60 / bpm) * 1000) / 4 // Duration of a 16th note in ms
      
      // Store the current step in a ref so it persists across effect reruns
      let step = currentStep;

      try {
        sequencerInterval.current = setInterval(() => {
          // Update current step
          setCurrentStep(step)

          // Play sounds for this step
          sequence.forEach((trackSequence, trackIndex) => {
            if (
              trackIndex < tracks.length && // Make sure trackIndex is valid
              trackSequence[step] &&
              !tracks[trackIndex].mute &&
              midiSounds.current &&
              midiSounds.current?.playDrumsNow
            ) {
              midiSounds.current.playDrumsNow([tracks[trackIndex].instrument])
            }
          })

          // Move to next step
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
  }, [isPlaying, sequence, tracks, bpm, isInitialized, currentStep])

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
    // Ensure this track exists in sequence
    if (trackIndex >= newSequence.length) {
      // Add empty tracks to sequence if needed
      while (trackIndex >= newSequence.length) {
        newSequence.push(Array(16).fill(false))
      }
    }
    
    newSequence[trackIndex] = [...newSequence[trackIndex]]
    newSequence[trackIndex][stepIndex] = !newSequence[trackIndex][stepIndex]
    setSequence(newSequence)
  }
  
  // Function to remove a track
  const removeTrack = (trackId: number) => {
    // Find index of track to remove
    const trackIndex = tracks.findIndex(track => track.id === trackId)
    
    // Don't allow removing the last track
    if (tracks.length <= 1) return
    
    // Update tracks state
    setTracks(tracks.filter(track => track.id !== trackId))
    
    // Update sequence state by removing the track's pattern
    setSequence(prevSequence => {
      const newSequence = [...prevSequence]
      if (trackIndex !== -1) {
        newSequence.splice(trackIndex, 1)
      }
      return newSequence
    })
  }
  
  // Function to add a new track
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
    
    // Add new track to tracks state
    setTracks([...tracks, newTrack])
    
    // Update sequence state by adding an empty pattern
    setSequence(prevSequence => {
      const newSequence = [...prevSequence]
      newSequence.push(Array(16).fill(false))
      return newSequence
    })
    
    // Make sure the instrument is cached for playback
    if (midiSounds.current && midiSounds.current?.cacheInstrument) {
      midiSounds.current.cacheInstrument(instrumentId)
    }
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
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Sample Pads</h2>
            <SamplePads 
              tracks={tracks} 
              onTriggerSample={triggerSample} 
              onRemoveTrack={removeTrack}
              onAddTrack={addTrack}
              availableInstruments={availableInstruments}
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

      {/* MIDISounds component with proper configuration */}
      <div style={{ display: "none" }}>
        {typeof window !== "undefined" && (
          <MIDISounds
            appElementName="lofi-beatmaker-app"
            instruments={[]}
            drums={[
              // Load all possible drums
              ...Object.values(DRUM_INSTRUMENTS),
              128, // For vinyl effect
            ]}
            ref={midiSounds}
          />
        )}
      </div>
    </div>
  )
}
