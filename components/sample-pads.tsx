"use client"

import { X, Plus, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface SamplePadsProps {
  tracks: any[]
  onTriggerSample: (trackIndex: number) => void
  onRemoveTrack?: (trackId: number) => void
  onAddTrack?: (instrumentName: string, instrumentId: number) => void
  availableInstruments?: { name: string; id: number }[]
  isRecording?: boolean
  recordingTrack?: number | null
  onStartRecording?: (trackIndex: number) => void
}

export default function SamplePads({ 
  tracks, 
  onTriggerSample, 
  onRemoveTrack,
  onAddTrack,
  availableInstruments = [],
  isRecording = false,
  recordingTrack = null,
  onStartRecording
}: SamplePadsProps) {
  const padColors = [
    "bg-amber-100 hover:bg-amber-200 border-amber-200 active:bg-amber-300 dark:bg-amber-950 dark:hover:bg-amber-900 dark:border-amber-800 dark:active:bg-amber-800",
    "bg-rose-100 hover:bg-rose-200 border-rose-200 active:bg-rose-300 dark:bg-rose-950 dark:hover:bg-rose-900 dark:border-rose-800 dark:active:bg-rose-800",
    "bg-cyan-100 hover:bg-cyan-200 border-cyan-200 active:bg-cyan-300 dark:bg-cyan-950 dark:hover:bg-cyan-900 dark:border-cyan-800 dark:active:bg-cyan-800",
    "bg-violet-100 hover:bg-violet-200 border-violet-200 active:bg-violet-300 dark:bg-violet-950 dark:hover:bg-violet-900 dark:border-violet-800 dark:active:bg-violet-800",
    "bg-emerald-100 hover:bg-emerald-200 border-emerald-200 active:bg-emerald-300 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-800 dark:active:bg-emerald-800",
    "bg-blue-100 hover:bg-blue-200 border-blue-200 active:bg-blue-300 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800 dark:active:bg-blue-800",
    "bg-orange-100 hover:bg-orange-200 border-orange-200 active:bg-orange-300 dark:bg-orange-950 dark:hover:bg-orange-900 dark:border-orange-800 dark:active:bg-orange-800",
    "bg-pink-100 hover:bg-pink-200 border-pink-200 active:bg-pink-300 dark:bg-pink-950 dark:hover:bg-pink-900 dark:border-pink-800 dark:active:bg-pink-800",
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {tracks.map((track, index) => (
        <div key={track.id} className="relative group">
          <button
            className={cn(
              `h-20 w-full rounded-lg border-2 transition-all ${padColors[index % padColors.length]} ${track.mute ? "opacity-50" : ""} dark:text-gray-200`,
              recordingTrack === index && "ring-2 ring-rose-500 dark:ring-rose-600 ring-offset-1 dark:ring-offset-black"
            )}
            onClick={() => onTriggerSample(index)}
          >
            <span className="font-medium text-sm">{track.name}</span>
            {track.isRecorded && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-zinc-500 dark:text-zinc-400">
                <Mic className="h-3 w-3 inline mr-1" />
                <span>Recorded</span>
              </div>
            )}
          </button>
          <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onStartRecording && !isRecording && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-rose-100/60 hover:bg-rose-200/70 dark:bg-rose-900/40 dark:hover:bg-rose-800/60"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRecording(index);
                }}
              >
                <Mic className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                <span className="sr-only">Record</span>
              </Button>
            )}
            {onRemoveTrack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-zinc-100/60 hover:bg-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/70"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTrack(track.id);
                }}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
          {isRecording && recordingTrack === index && (
            <span className="absolute top-1 left-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          )}
        </div>
      ))}
      
      {onAddTrack && availableInstruments.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="h-20 w-full border-dashed flex flex-col items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Add Pad</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Add Instrument</DropdownMenuLabel>
            {availableInstruments.map((instrument) => (
              <DropdownMenuItem 
                key={instrument.id}
                onClick={() => onAddTrack(instrument.name, instrument.id)}
              >
                {instrument.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
