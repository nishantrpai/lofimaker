"use client"

import { useEffect, useState, useRef, MutableRefObject } from "react"
import { Disc3, Play, Square, Volume2, AudioWaveformIcon as Waveform, Mic, Save, Download, Plus, Scissors, Music, SkipForward, Trash2, Headphones, Copy } from "lucide-react"
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
    playChordNow?: (instrument: number, pitches: number[], duration: number) => void;
    setInstrumentVolume?: (instrument: number, volume: number) => void;
    setEchoLevel?: (value: number) => void;
    getEchoLevel?: () => number;
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
  isRecorded?: boolean;  // Add flag for recorded tracks
  recordedPattern?: boolean[];  // Store recorded pattern
}

// Define Audio Track type for FL Studio-like multitrack editor
interface AudioTrack {
  id: number;
  name: string;
  audioBuffer: AudioBuffer | null;
  audioUrl: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  startTime: number; // Start time in seconds
  endTime: number | null; // End time in seconds (null = use full audio)
  loop: boolean;
  color: string; // CSS color for track display
  isPlaying: boolean;
  duration: number;
}

// Define audio track sequence for final track
interface AudioTrackSequence {
  id: number;
  trackId: number; // Reference to original audio track
  startTime: number; // Start time in the final sequence (seconds)
  clipStartTime: number; // Start time in the audio clip (seconds)
  clipEndTime: number; // End time in the audio clip (seconds)
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

// Interface for recording state
interface RecordingState {
  isRecording: boolean;
  recordingTrack: number | null;
  recordedSteps: boolean[];
  quantize: boolean;
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
  
  // Audio track state
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [audioTrackSequence, setAudioTrackSequence] = useState<AudioTrackSequence[]>([])
  const [currentAudioTime, setCurrentAudioTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(30) // Default 30 seconds for final track
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | null>(null)
  const [isMasterPlaying, setIsMasterPlaying] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1) // Zoom level for the timeline
  const [displayMode, setDisplayMode] = useState<'timeline' | 'master'>('timeline')
  
  // Audio contexts and refs
  const audioCtx = useRef<AudioContext | null>(null)
  const audioSources = useRef<Map<number, AudioBufferSourceNode>>(new Map())
  // const masterTrackRef = useRef<AudioBuffer | null>(null)
  const audioNextIdRef = useRef(1)
  const audioFileInputRef = useRef<HTMLInputElement | null>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Get currently used instruments to filter the available instruments list
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([])
  
  // Recording state
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    recordingTrack: null,
    recordedSteps: Array(16).fill(false),
    quantize: true
  })
  
  // Preview state
  const [previewPattern, setPreviewPattern] = useState<boolean[]>(Array(16).fill(false))
  const [previewInstrument, setPreviewInstrument] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  
  // Track highest ID to ensure unique IDs for new tracks
  const nextIdRef = useRef(Math.max(...tracks.map(track => track.id)) + 1)

  // References
  const midiSounds = useRef<any>(null)
  const sequencerInterval = useRef<NodeJS.Timeout | null>(null)
  const vinylNoiseInterval = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  // Cropping functionality state
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<number | null>(null);
  const [cropEnd, setCropEnd] = useState<number | null>(null);
  const [dragMode, setDragMode] = useState<'none' | 'start' | 'end'>('none');
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Master track ref for drag and drop operations
  const masterTrackRef = useRef<HTMLDivElement | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Handle master track drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!masterTrackRef.current || draggedItem === null) return;
    
    const rect = masterTrackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPos = x / (100 * zoomLevel);
    
    if (!isNaN(newPos) && newPos >= 0) {
      updateSequenceItem(draggedItem, newPos);
      setDraggedItem(null);
    }
  };
  
  // Helper function to get track vertical position based on available space
  const getTrackVerticalPosition = (index: number) => {
    // Calculate rows based on available space
    const trackHeight = 60; // Height for each track
    const padding = 10;
    const rowCount = Math.floor((200 - padding) / trackHeight) || 1; // Use available height
    
    // Calculate row and column
    const row = index % rowCount;
    
    return row * trackHeight + padding;
  };

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
      const crackleSound = 0 // Hi-hat (pedal) - works well for subtle crackle

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
  
  // Start recording for a particular track
  const startRecording = (trackIndex: number) => {
    if (!isInitialized) return
    
    // Reset recorded steps
    setRecording({
      ...recording,
      isRecording: true,
      recordingTrack: trackIndex,
      recordedSteps: Array(16).fill(false)
    })
    
    // Start playback if not already playing
    if (!isPlaying) {
      setIsPlaying(true)
    }
  }
  
  // Stop recording
  const stopRecording = () => {
    if (recording.recordingTrack !== null) {
      // Apply recorded pattern to sequence
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
  
  // Record a hit on the current step
  const recordHit = (trackIndex: number) => {
    if (!recording.isRecording || recording.recordingTrack !== trackIndex || !isPlaying) return
    
    if (recording.quantize) {
      // With quantize on, we mark the current step
      setRecording(prev => {
        const newRecordedSteps = [...prev.recordedSteps]
        newRecordedSteps[currentStep] = true
        return {
          ...prev,
          recordedSteps: newRecordedSteps
        }
      })
    } else {
      // Without quantize, we'd need more complex timing logic
      // This is a simplified version
      setRecording(prev => {
        const newRecordedSteps = [...prev.recordedSteps]
        newRecordedSteps[currentStep] = true
        return {
          ...prev,
          recordedSteps: newRecordedSteps
        }
      })
    }
    
    // Trigger the sample 
    triggerSample(trackIndex)
  }
  
  // Function to create a new track from recorded preview
  const addRecordedTrack = (instrumentName: string, instrumentId: number, pattern: boolean[]) => {
    const newTrackId = nextIdRef.current
    nextIdRef.current = nextIdRef.current + 1
    
    const newTrack: Track = {
      id: newTrackId,
      name: instrumentName,
      volume: 0.7,
      pan: 0,
      mute: false,
      solo: false,
      instrument: instrumentId,
      isRecorded: true,
      recordedPattern: [...pattern]
    }
    
    // Add new track to tracks state
    setTracks([...tracks, newTrack])
    
    // Update sequence state by adding the recorded pattern
    setSequence(prevSequence => {
      const newSequence = [...prevSequence]
      newSequence.push([...pattern])
      return newSequence
    })
    
    // Reset preview
    setShowPreview(false)
    setPreviewPattern(Array(16).fill(false))
    
    // Make sure the instrument is cached for playback
    if (midiSounds.current && midiSounds.current?.cacheInstrument) {
      midiSounds.current.cacheInstrument(instrumentId)
    }
  }
  
  // Function to preview a recorded beat
  const previewRecording = (instrumentId: number) => {
    if (!midiSounds.current || !isInitialized) return
    
    setPreviewInstrument(instrumentId)
    setShowPreview(true)
    
    // Find the instrument name
    const instrumentInfo = AVAILABLE_INSTRUMENTS.find(inst => inst.id === instrumentId)
    if (instrumentInfo) {
      // Cache the instrument for preview
      if (midiSounds.current?.cacheInstrument) {
        midiSounds.current.cacheInstrument(instrumentId)
      }
    }
  }
  
  // Play the preview
  const playPreview = () => {
    if (!previewInstrument || !midiSounds.current?.playDrumsNow) return
    
    midiSounds.current.playDrumsNow([previewInstrument])
  }
  
  // Toggle a step in the preview pattern
  const togglePreviewStep = (stepIndex: number) => {
    setPreviewPattern(prev => {
      const newPattern = [...prev]
      newPattern[stepIndex] = !newPattern[stepIndex]
      return newPattern
    })
  }

  // Initialize audio context
  useEffect(() => {
    // Create AudioContext when needed (on first audio upload)
    if (!audioCtx.current && typeof window !== 'undefined') {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return () => {
      // Stop and cleanup all audio sources when component unmounts
      audioSources.current.forEach((source) => {
        try {
          source.stop();
        } catch (e) {
          // Source might already be stopped
        }
      });
      audioSources.current.clear();
      
      // Close audio context when unmounting
      if (audioCtx.current && audioCtx.current.state !== 'closed') {
        audioCtx.current.close();
      }
    };
  }, []);
  
  // Update the waveform visualization
  useEffect(() => {
    if (!waveformCanvasRef.current || selectedAudioTrack === null || !canvasContainerRef.current) return;
    
    const track = audioTracks.find(t => t.id === selectedAudioTrack);
    if (!track || !track.audioBuffer) return;
    
    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match container size for better resolution
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = 100;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    ctx.fillStyle = track.color;
    ctx.strokeStyle = track.color;
    ctx.lineWidth = 1;
    
    const buffer = track.audioBuffer;
    const data = buffer.getChannelData(0); // Use first channel for visualization
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    
    ctx.beginPath();
    ctx.moveTo(0, amp);
    
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.stroke();
    
    // Draw crop markers if in cropping mode
    if (isCropping && track.audioBuffer) {
      const totalDuration = track.audioBuffer.duration;
      
      // Calculate start and end positions based on current track state or crop state
      const currentStartPos = cropStart !== null ? cropStart : (track.startTime / totalDuration) * canvas.width;
      const currentEndPos = cropEnd !== null ? cropEnd : ((track.endTime || totalDuration) / totalDuration) * canvas.width;
      
      // Draw partially transparent overlay for areas outside selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      
      // Left side overlay (before start marker)
      ctx.fillRect(0, 0, currentStartPos, canvas.height);
      
      // Right side overlay (after end marker)
      ctx.fillRect(currentEndPos, 0, canvas.width - currentEndPos, canvas.height);
      
      // Draw start marker
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(currentStartPos - 2, 0, 4, canvas.height);
      
      // Draw end marker
      ctx.fillRect(currentEndPos - 2, 0, 4, canvas.height);
      
      // Display time indicators
      const startTime = (currentStartPos / canvas.width) * totalDuration;
      const endTime = (currentEndPos / canvas.width) * totalDuration;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px monospace';
      ctx.fillText(`${startTime.toFixed(2)}s`, currentStartPos + 6, 12);
      ctx.fillText(`${endTime.toFixed(2)}s`, currentEndPos - 50, 12);
    }
    
  }, [selectedAudioTrack, audioTracks, isCropping, cropStart, cropEnd]);
  
  // Handle mouse events for visual cropping
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !waveformCanvasRef.current || selectedAudioTrack === null) return;
    
    const track = audioTracks.find(t => t.id === selectedAudioTrack);
    if (!track || !track.audioBuffer) return;
    
    const canvas = waveformCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const totalDuration = track.audioBuffer.duration;
    const startPos = cropStart !== null ? cropStart : (track.startTime / totalDuration) * canvas.width;
    const endPos = cropEnd !== null ? cropEnd : ((track.endTime || totalDuration) / totalDuration) * canvas.width;
    
    // Determine if we're grabbing the start handle, end handle, or neither
    const handleSize = 10; // Size of the grab area around each handle
    
    if (Math.abs(x - startPos) <= handleSize) {
      setDragMode('start');
    } else if (Math.abs(x - endPos) <= handleSize) {
      setDragMode('end');
    } else {
      setDragMode('none');
    }
  };
  
  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || dragMode === 'none' || !waveformCanvasRef.current || selectedAudioTrack === null) return;
    
    const track = audioTracks.find(t => t.id === selectedAudioTrack);
    if (!track || !track.audioBuffer) return;
    
    const canvas = waveformCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    
    const totalDuration = track.audioBuffer.duration;
    const newPos = (x / canvas.width) * totalDuration;
    
    if (dragMode === 'start') {
      // Ensure start doesn't go beyond end
      const endTime = cropEnd !== null 
        ? (cropEnd / canvas.width) * totalDuration 
        : (track.endTime || totalDuration);
        
      if (newPos < endTime) {
        setCropStart(x);
      }
    } else if (dragMode === 'end') {
      // Ensure end doesn't go before start
      const startTime = cropStart !== null 
        ? (cropStart / canvas.width) * totalDuration 
        : track.startTime;
        
      if (newPos > startTime) {
        setCropEnd(x);
      }
    }
  };
  
  const handleCropMouseUp = () => {
    if (dragMode !== 'none') {
      setDragMode('none');
    }
  };
  
  const applyCrop = () => {
    if (!isCropping || !waveformCanvasRef.current || selectedAudioTrack === null) return;
    
    const track = audioTracks.find(t => t.id === selectedAudioTrack);
    if (!track || !track.audioBuffer) return;
    
    const canvas = waveformCanvasRef.current;
    const totalDuration = track.audioBuffer.duration;
    
    // Calculate crop times based on canvas positions
    let startTime = track.startTime;
    let endTime = track.endTime || totalDuration;
    
    if (cropStart !== null) {
      startTime = (cropStart / canvas.width) * totalDuration;
    }
    
    if (cropEnd !== null) {
      endTime = (cropEnd / canvas.width) * totalDuration;
    }
    
    // Apply the crop
    cropAudioTrack(track.id, startTime, endTime);
    
    // Reset cropping state
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };
  
  const cancelCrop = () => {
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
  };

  // Handle file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    // Ensure Audio Context is initialized
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (!e.target || !e.target.result || !audioCtx.current) return;
        
        const audioData = e.target.result as ArrayBuffer;
        const audioBuffer = await audioCtx.current.decodeAudioData(audioData);
        
        // Generate a random color for the track
        const colors = [
          '#4C51BF', '#3182CE', '#38B2AC', '#48BB78', 
          '#ECC94B', '#ED8936', '#ED64A6', '#9F7AEA'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const newTrack: AudioTrack = {
          id: audioNextIdRef.current++,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          audioBuffer,
          audioUrl: URL.createObjectURL(file),
          volume: 0.7,
          pan: 0,
          mute: false,
          solo: false,
          startTime: 0,
          endTime: null,
          loop: false,
          color: randomColor,
          isPlaying: false,
          duration: audioBuffer.duration
        };
        
        setAudioTracks(prev => [...prev, newTrack]);
        
        // Select the newly added track
        setSelectedAudioTrack(newTrack.id);
        
        // Reset file input
        if (audioFileInputRef.current) {
          audioFileInputRef.current.value = '';
        }
        
      } catch (error) {
        console.error('Error decoding audio data:', error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Play a specific audio track
  const playAudioTrack = (trackId: number) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Ensure the audio context is running (needed for Chrome's autoplay policy)
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
    
    // Stop any currently playing sources for this track
    const existingSource = audioSources.current.get(trackId);
    if (existingSource) {
      try {
        existingSource.stop();
      } catch (e) {
        // Source might already be stopped
      }
      audioSources.current.delete(trackId);
    }
    
    const track = audioTracks.find(t => t.id === trackId);
    if (!track || !track.audioBuffer || !audioCtx.current) return;
    
    // Create new source
    const source = audioCtx.current.createBufferSource();
    source.buffer = track.audioBuffer;
    
    // Create gain node for volume control
    const gainNode = audioCtx.current.createGain();
    gainNode.gain.value = track.volume;
    
    // Create stereo panner for pan control if supported
    let panNode;
    if (audioCtx.current.createStereoPanner) {
      panNode = audioCtx.current.createStereoPanner();
      panNode.pan.value = track.pan;
      source.connect(panNode);
      panNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }
    
    gainNode.connect(audioCtx.current.destination);
    
    // Set loop if enabled
    source.loop = track.loop;
    
    // Calculate start and end times
    const startTime = track.startTime || 0;
    const endTime = track.endTime || track.audioBuffer.duration;
    
    // Save source for later reference
    audioSources.current.set(trackId, source);
    
    // Start playback
    source.start(0, startTime, endTime - startTime);
    
    // Update UI state
    setAudioTracks(tracks => 
      tracks.map(t => 
        t.id === trackId ? { ...t, isPlaying: true } : t
      )
    );
    
    // Set up an event for when playback ends
    source.onended = () => {
      setAudioTracks(tracks => 
        tracks.map(t => 
          t.id === trackId ? { ...t, isPlaying: false } : t
        )
      );
      audioSources.current.delete(trackId);
    };
  };
  
  // Stop a specific audio track
  const stopAudioTrack = (trackId: number) => {
    const source = audioSources.current.get(trackId);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
      audioSources.current.delete(trackId);
      
      // Update UI state
      setAudioTracks(tracks => 
        tracks.map(t => 
          t.id === trackId ? { ...t, isPlaying: false } : t
        )
      );
    }
  };
  
  // Update audio track settings
  const updateAudioTrack = (trackId: number, property: string, value: any) => {
    setAudioTracks(tracks => 
      tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, [property]: value };
        }
        return track;
      })
    );
    
    // Apply changes to active sources if needed
    const source = audioSources.current.get(trackId);
    if (source && audioCtx.current) {
      // Handle volume changes for active tracks
      if (property === 'volume') {
        const gainNode = audioCtx.current.createGain();
        gainNode.gain.value = value;
        source.connect(gainNode);
        gainNode.connect(audioCtx.current.destination);
      }
      
      // Handle mute for active tracks
      if (property === 'mute' && value === true) {
        stopAudioTrack(trackId);
      }
    }
  };
  
  // Delete an audio track
  const deleteAudioTrack = (trackId: number) => {
    // Stop playback if active
    stopAudioTrack(trackId);
    
    // Remove from audioTracks state
    setAudioTracks(tracks => tracks.filter(track => track.id !== trackId));
    
    // Remove from sequence if present
    setAudioTrackSequence(seq => seq.filter(item => item.trackId !== trackId));
    
    // If this was the selected track, clear selection
    if (selectedAudioTrack === trackId) {
      setSelectedAudioTrack(null);
    }
  };
  
  // Crop audio track
  const cropAudioTrack = (trackId: number, startTime: number, endTime: number) => {
    setAudioTracks(tracks => 
      tracks.map(track => {
        if (track.id === trackId) {
          return { 
            ...track, 
            startTime: Math.max(0, startTime), 
            endTime: Math.min(endTime, track.audioBuffer ? track.audioBuffer.duration : endTime)
          };
        }
        return track;
      })
    );
  };
  
  // Add track to the final sequence
  const addToMasterTrack = (trackId: number) => {
    const track = audioTracks.find(t => t.id === trackId);
    if (!track) return;
    
    const startTime = track.startTime || 0;
    const endTime = track.endTime || (track.audioBuffer ? track.audioBuffer.duration : 0);
    
    const newSequenceItem: AudioTrackSequence = {
      id: Date.now(),
      trackId,
      startTime: 0, // Default to start of master track
      clipStartTime: startTime,
      clipEndTime: endTime
    };
    
    setAudioTrackSequence([...audioTrackSequence, newSequenceItem]);
  };
  
  // Update position of a track in the final sequence
  const updateSequenceItem = (itemId: number, startTime: number) => {
    setAudioTrackSequence(seq => 
      seq.map(item => {
        if (item.id === itemId) {
          return { ...item, startTime: Math.max(0, startTime) };
        }
        return item;
      })
    );
  };
  
  // Remove an item from the final sequence
  const removeFromSequence = (itemId: number) => {
    setAudioTrackSequence(seq => seq.filter(item => item.id !== itemId));
  };
  
  // Play the master track (final sequence)
  const playMasterTrack = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Stop any currently playing tracks
    audioSources.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
    });
    audioSources.current.clear();
    
    // Set playing state
    setIsMasterPlaying(true);
    
    // Schedule all audio clips in the sequence
    audioTrackSequence.forEach(item => {
      const track = audioTracks.find(t => t.id === item.trackId);
      if (!track || !track.audioBuffer || !audioCtx.current) return;
      
      const source = audioCtx.current.createBufferSource();
      source.buffer = track.audioBuffer;
      
      // Create gain node for volume
      const gainNode = audioCtx.current.createGain();
      gainNode.gain.value = track.volume;
      
      // Create stereo panner for pan control if supported
      let panNode;
      if (audioCtx.current.createStereoPanner) {
        panNode = audioCtx.current.createStereoPanner();
        panNode.pan.value = track.pan;
        source.connect(panNode);
        panNode.connect(gainNode);
      } else {
        source.connect(gainNode);
      }
      
      gainNode.connect(audioCtx.current.destination);
      
      // Calculate start and end times within the buffer
      const clipDuration = item.clipEndTime - item.clipStartTime;
      
      // Store the source for stopping later
      audioSources.current.set(item.id, source);
      
      // Schedule the playback
      const startTime = audioCtx.current.currentTime + item.startTime;
      source.start(startTime, item.clipStartTime, clipDuration);
    });
    
    // Set up a timeout to update the playing state when all clips finish
    const maxDuration = audioTrackSequence.reduce((max, item) => {
      const endTime = item.startTime + (item.clipEndTime - item.clipStartTime);
      return Math.max(max, endTime);
    }, 0);
    
    setTimeout(() => {
      setIsMasterPlaying(false);
    }, maxDuration * 1000);
  };
  
  // Stop the master track playback
  const stopMasterTrack = () => {
    audioSources.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
    });
    audioSources.current.clear();
    setIsMasterPlaying(false);
  };
  
  // Export the master track as a wav file
  const exportMasterTrack = async () => {
    if (!audioCtx.current || audioTrackSequence.length === 0) return;
    
    try {
      // Create an offline audio context for rendering
      const maxDuration = audioTrackSequence.reduce((max, item) => {
        const endTime = item.startTime + (item.clipEndTime - item.clipStartTime);
        return Math.max(max, endTime);
      }, 0);
      
      const offlineCtx = new OfflineAudioContext(
        2, // Stereo
        44100 * maxDuration, // Sample rate * duration
        44100 // Sample rate
      );
      
      // Schedule all audio clips in the sequence
      const renderPromises = audioTrackSequence.map(async (item) => {
        const track = audioTracks.find(t => t.id === item.trackId);
        if (!track || !track.audioBuffer) return;
        
        const source = offlineCtx.createBufferSource();
        source.buffer = track.audioBuffer;
        
        // Create gain node for volume
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = track.volume;
        
        // Create stereo panner for pan control if supported
        let panNode;
        if (offlineCtx.createStereoPanner) {
          panNode = offlineCtx.createStereoPanner();
          panNode.pan.value = track.pan;
          source.connect(panNode);
          panNode.connect(gainNode);
        } else {
          source.connect(gainNode);
        }
        
        gainNode.connect(offlineCtx.destination);
        
        // Calculate start and end times within the buffer
        const clipDuration = item.clipEndTime - item.clipStartTime;
        
        // Schedule the playback
        source.start(item.startTime, item.clipStartTime, clipDuration);
      });
      
      // Wait for all sources to be scheduled
      await Promise.all(renderPromises);
      
      // Render the audio
      const renderedBuffer = await offlineCtx.startRendering();
      
      // Save the rendered buffer to masterTrackRef
      masterTrackRef.current = renderedBuffer;
      
      // Convert to WAV format and initiate download
      const audioBlob = bufferToWav(renderedBuffer);
      const url = URL.createObjectURL(audioBlob);
      
      // Create download link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lofi-beat-' + new Date().toISOString() + '.wav';
      a.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
    } catch (error) {
      console.error('Error exporting master track:', error);
    }
  };
  
  // Helper function to convert AudioBuffer to WAV
  const bufferToWav = (buffer: AudioBuffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    // Extract raw audio data
    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
      channelData.push(buffer.getChannelData(i));
    }
    
    // Create the wav file
    const dataLength = channelData[0].length * numChannels * (bitDepth / 8);
    const buffer8 = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer8);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // format chunk size
    view.setUint16(20, format, true); // format type
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // byte rate
    view.setUint16(32, numChannels * (bitDepth / 8), true); // block align
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const offset = 44;
    const stride = 2; // 16-bit
    let index = 0;
    
    for (let i = 0; i < channelData[0].length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset + index, int16, true);
        index += stride;
      }
    }
    
    return new Blob([buffer8], { type: 'audio/wav' });
  };
  
  // Helper function to write strings to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Play a specific audio clip from the master track
  const playAudioClip = (item: AudioTrackSequence) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Ensure the audio context is running (needed for Chrome's autoplay policy)
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
    
    const track = audioTracks.find(t => t.id === item.trackId);
    if (!track || !track.audioBuffer || !audioCtx.current) return;
    
    // Create new source
    const source = audioCtx.current.createBufferSource();
    source.buffer = track.audioBuffer;
    
    // Create gain node for volume control
    const gainNode = audioCtx.current.createGain();
    gainNode.gain.value = track.volume;
    
    // Create stereo panner if supported
    let panNode;
    if (audioCtx.current.createStereoPanner) {
      panNode = audioCtx.current.createStereoPanner();
      panNode.pan.value = track.pan;
      source.connect(panNode);
      panNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }
    
    gainNode.connect(audioCtx.current.destination);
    
    // Play just the clip section
    const clipDuration = item.clipEndTime - item.clipStartTime;
    source.start(0, item.clipStartTime, clipDuration);
    
    // Store for later reference
    audioSources.current.set(Date.now(), source);
  };

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

          {/* Audio Track Workspace moved up here */}
          <div className="border-t dark:border-zinc-700 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center">
                <Music className="h-5 w-5 mr-2" /> Audio Track Workspace
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => audioFileInputRef.current?.click()}
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Audio Track
                </Button>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  ref={audioFileInputRef}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayMode(displayMode === 'timeline' ? 'master' : 'timeline')}
                  className="bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  {displayMode === 'timeline' ? 'Show Master Track' : 'Show Timeline'}
                </Button>
              </div>
            </div>

            {/* Zoom control for timeline */}
            <div className="flex items-center mb-4">
              <Label htmlFor="zoom" className="text-sm font-medium dark:text-zinc-300 mr-2">
                Zoom
              </Label>
              <div className="w-36">
                <Slider 
                  id="zoom" 
                  min={0.5} 
                  max={4} 
                  step={0.1} 
                  value={[zoomLevel]} 
                  onValueChange={(value) => setZoomLevel(value[0])} 
                />
              </div>
              <span className="text-sm font-mono dark:text-zinc-300 ml-2">{Math.round(zoomLevel * 100)}%</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
              {displayMode === 'timeline' ? (
                /* Timeline view */
                <div className="space-y-4">
                  {audioTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-400 dark:text-zinc-500">
                      <Music className="h-12 w-12 mb-2 opacity-50" />
                      <p>No audio tracks added yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="mt-4"
                      >
                        Add Audio Track
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Audio track list */}
                      {audioTracks.map((track) => (
                        <div 
                          key={track.id} 
                          className={`bg-white dark:bg-zinc-900 p-3 rounded-md border-2 transition-all ${
                            selectedAudioTrack === track.id 
                              ? `border-${track.color.replace('#', '')} dark:border-opacity-70` 
                              : 'border-transparent'
                          }`}
                          onClick={() => setSelectedAudioTrack(track.id)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-12 rounded-sm mr-2" 
                                style={{ backgroundColor: track.color }} 
                              />
                              <div>
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{track.name}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {track.audioBuffer ? `${track.audioBuffer.duration.toFixed(2)}s • ${track.audioBuffer.numberOfChannels} ch • ${track.audioBuffer.sampleRate}Hz` : 'Loading...'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  track.isPlaying ? stopAudioTrack(track.id) : playAudioTrack(track.id);
                                }}
                                className={
                                  track.isPlaying
                                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                                    : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300"
                                }
                              >
                                {track.isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToMasterTrack(track.id);
                                }}
                                className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300"
                                title="Add to master track"
                              >
                                <SkipForward className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAudioTrack(track.id);
                                }}
                                className="text-zinc-500 hover:text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Audio waveform visualization */}
                          {selectedAudioTrack === track.id && (
                            <div className="mt-3 border dark:border-zinc-700 rounded-md">
                              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 flex justify-between items-center rounded-t-md">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateAudioTrack(track.id, 'loop', !track.loop);
                                    }}
                                    className={`h-7 text-xs ${track.loop ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}
                                  >
                                    Loop
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsCropping(!isCropping);
                                    }}
                                    className={`h-7 text-xs ${isCropping ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'text-zinc-500'}`}
                                  >
                                    <Scissors className="h-3 w-3 mr-1" /> Crop
                                  </Button>
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {track.startTime.toFixed(2)}s - {track.endTime ? track.endTime.toFixed(2) : track.audioBuffer?.duration.toFixed(2)}s
                                </div>
                              </div>
                              <div 
                                ref={canvasContainerRef} 
                                className="relative w-full bg-zinc-50 dark:bg-zinc-900 rounded-b-md"
                              >
                                <canvas 
                                  ref={waveformCanvasRef} 
                                  width="800" 
                                  height="100" 
                                  className="w-full cursor-crosshair"
                                  onMouseDown={handleCropMouseDown}
                                  onMouseMove={handleCropMouseMove}
                                  onMouseUp={handleCropMouseUp}
                                  onMouseLeave={handleCropMouseUp}
                                />
                                {isCropping && (
                                  <div className="absolute bottom-2 right-2 flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={applyCrop}
                                      className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                    >
                                      Apply Crop
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelCrop}
                                      className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                                {isCropping && (
                                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-1 rounded">
                                    Drag the white markers to crop the audio
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Track controls */}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs w-16">Volume</Label>
                              <Slider
                                min={0}
                                max={1}
                                step={0.01}
                                value={[track.volume]}
                                onValueChange={(value) => updateAudioTrack(track.id, 'volume', value[0])}
                                className="w-full"
                              />
                              <span className="text-xs font-mono w-8 text-right">{Math.round(track.volume * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs w-16">Pan</Label>
                              <Slider
                                min={-1}
                                max={1}
                                step={0.1}
                                value={[track.pan]}
                                onValueChange={(value) => updateAudioTrack(track.id, 'pan', value[0])}
                                className="w-full"
                              />
                              <span className="text-xs font-mono w-8 text-right">
                                {track.pan > 0
                                  ? `R${Math.round(track.pan * 10)}`
                                  : track.pan < 0
                                    ? `L${Math.abs(Math.round(track.pan * 10))}`
                                    : "C"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                /* Master track view */
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center">
                      <Headphones className="h-4 w-4 mr-1" /> Final Track Sequence
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isMasterPlaying ? stopMasterTrack : playMasterTrack}
                        disabled={audioTrackSequence.length === 0}
                        className={
                          isMasterPlaying
                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                            : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                        }
                      >
                        {isMasterPlaying ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        {isMasterPlaying ? 'Stop' : 'Play'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportMasterTrack}
                        disabled={audioTrackSequence.length === 0}
                        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export MP3
                      </Button>
                    </div>
                  </div>

                  {audioTrackSequence.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-400 dark:text-zinc-500">
                      <Headphones className="h-12 w-12 mb-2 opacity-50" />
                      <p>No audio clips added to the master track</p>
                      <p className="text-sm mt-1">Add clips from the timeline view</p>
                    </div>
                  ) : (
                    <div 
                      className="relative w-full h-[200px] bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-300 dark:border-zinc-700 overflow-x-auto"
                      ref={masterTrackRef}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      {/* Time markers */}
                      <div className="absolute top-0 left-0 right-0 h-6 bg-zinc-200 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 flex">
                        {Array.from({ length: Math.ceil(trackDuration) }).map((_, second) => (
                          <div
                            key={second}
                            className="flex-none border-r border-zinc-300 dark:border-zinc-700 flex items-center justify-center"
                            style={{ width: `${100 * zoomLevel}px` }}
                          >
                            <span className="text-xs font-mono text-zinc-500">{second}s</span>
                          </div>
                        ))}
                      </div>

                      {/* Guide lines for time markers */}
                      <div className="absolute top-6 left-0 right-0 bottom-0">
                        {Array.from({ length: Math.ceil(trackDuration) }).map((_, second) => (
                          <div
                            key={second}
                            className="absolute h-full border-r border-zinc-300/30 dark:border-zinc-700/30"
                            style={{ left: `${second * 100 * zoomLevel}px`, width: '1px' }}
                          />
                        ))}
                      </div>

                      {/* Clip tracks */}
                      <div className="absolute top-6 left-0 right-0 bottom-0 p-2">
                        {audioTrackSequence.map((item, index) => {
                          const track = audioTracks.find(t => t.id === item.trackId);
                          if (!track) return null;
                          
                          const clipDuration = item.clipEndTime - item.clipStartTime;
                          const startPos = item.startTime * 100 * zoomLevel;
                          const width = clipDuration * 100 * zoomLevel;
                          const verticalPos = getTrackVerticalPosition(index);
                          
                          return (
                            <div
                              key={item.id}
                              className={`absolute h-16 rounded-md border-2 cursor-move flex flex-col transition-all ${
                                draggedItem === item.id ? 'ring-2 ring-white/50 dark:ring-zinc-400/50' : ''
                              }`}
                              style={{
                                left: `${startPos}px`,
                                width: `${width}px`,
                                backgroundColor: track.color + '80', // Add transparency
                                borderColor: track.color,
                                top: `${verticalPos}px`,
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', item.id.toString());
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedItem(item.id);
                              }}
                              onDragEnd={(e) => {
                                // Calculate new position
                                if (masterTrackRef.current) {
                                  const rect = masterTrackRef.current.getBoundingClientRect();
                                  const x = e.clientX - rect.left;
                                  const newPos = x / (100 * zoomLevel);
                                  
                                  if (!isNaN(newPos) && newPos >= 0) {
                                    updateSequenceItem(item.id, newPos);
                                  }
                                }
                                setDraggedItem(null);
                              }}
                              title="Drag to position, click and hold to adjust clip"
                            >
                              <div className="flex justify-between items-center p-1 bg-black bg-opacity-20 text-white text-xs">
                                <span className="truncate">{track.name}</span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => playAudioClip(item)}
                                    className="text-white hover:text-emerald-200 px-1"
                                    title="Preview clip"
                                  >
                                    <Play className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromSequence(item.id);
                                    }}
                                    className="text-white hover:text-red-200 px-1"
                                    title="Remove clip"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 p-1 text-[10px] text-white">
                                {item.clipStartTime.toFixed(1)}s - {item.clipEndTime.toFixed(1)}s
                              </div>
                              <div 
                                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/10 rounded-md"
                              >
                                <div className="w-full h-full flex items-center justify-center text-xs text-white">
                                  Drag to reposition
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center">
              <Volume2 className="h-4 w-4 mr-1" /> Mixer
            </h2>
            <MixerControls tracks={tracks} onUpdateTrack={updateTrackSetting} />
          </div>
          
          {/* Recording Preview Section */}
          {showPreview && previewInstrument !== null && (
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border-2 border-amber-300 dark:border-amber-700">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center">
                  <Mic className="h-4 w-4 mr-1 text-amber-500" /> Preview Beat
                </h2>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={playPreview}
                    className="h-8 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                  >
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                    onClick={() => {
                      const instrumentInfo = AVAILABLE_INSTRUMENTS.find(inst => inst.id === previewInstrument)
                      if (instrumentInfo) {
                        addRecordedTrack(instrumentInfo.name, previewInstrument, previewPattern)
                      }
                    }}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save To Track
                  </Button>
                </div>
              </div>
              
              {/* Simple step sequencer for preview */}
              <div className="grid grid-cols-16 gap-1 mb-1">
                {Array.from({ length: 16 }, (_, i) => (
                  <div key={i} className="h-6 flex items-center justify-center">
                    <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-16 gap-1">
                {previewPattern.map((isActive, stepIndex) => (
                  <button
                    key={stepIndex}
                    className={`h-10 rounded-md border transition-all ${
                      isActive
                        ? "bg-amber-200 border-amber-300 hover:bg-amber-300 dark:bg-amber-900 dark:border-amber-800 dark:hover:bg-amber-800"
                        : "bg-white border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    } ${
                      currentStep === stepIndex && "ring-2 ring-offset-1 dark:ring-offset-black"
                    } ${
                      currentStep === stepIndex && isActive 
                        ? "ring-amber-500 dark:ring-amber-600" 
                        : "ring-zinc-300 dark:ring-zinc-700"
                    }`}
                    onClick={() => togglePreviewStep(stepIndex)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sample Pads</h2>
              {/* Recording Controls */}
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
          
          {/* Beat Library Section */}
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center">
              <Download className="h-4 w-4 mr-1" /> Create New Beat
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {availableInstruments.slice(0, 6).map((instrument) => (
                <Button
                  key={instrument.id}
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  onClick={() => previewRecording(instrument.id)}
                >
                  <span className="text-xs">{instrument.name}</span>
                  <Mic className="h-4 w-4 text-zinc-400" />
                </Button>
              ))}
            </div>
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
