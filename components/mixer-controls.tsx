"use client"

import { Slider } from "@/components/ui/slider"
import { Volume2, VolumeX } from "lucide-react"

interface MixerControlsProps {
  tracks: any[]
  onUpdateTrack: (trackId: number, setting: string, value: any) => void
}

export default function MixerControls({ tracks, onUpdateTrack }: MixerControlsProps) {
  return (
    <div className="space-y-3">
      {tracks.map((track) => (
        <div key={track.id} className="flex items-center space-x-3">
          <div className="w-16 text-sm font-medium truncate dark:text-zinc-300">{track.name}</div>

          <button
            className={`p-1 rounded-md ${
              track.mute 
                ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400" 
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
            onClick={() => onUpdateTrack(track.id, "mute", !track.mute)}
          >
            {track.mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <div className="flex-1">
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[track.volume]}
              onValueChange={(value) => onUpdateTrack(track.id, "volume", value[0])}
              disabled={track.mute}
              className="dark:bg-zinc-800"
            />
          </div>

          <div className="w-20">
            <Slider
              min={-1}
              max={1}
              step={0.1}
              value={[track.pan]}
              onValueChange={(value) => onUpdateTrack(track.id, "pan", value[0])}
              disabled={track.mute}
              className="dark:bg-zinc-800"
            />
          </div>

          <div className="text-xs font-mono w-8 text-right dark:text-zinc-300">
            {track.pan > 0
              ? `R${Math.round(track.pan * 10)}`
              : track.pan < 0
                ? `L${Math.abs(Math.round(track.pan * 10))}`
                : "C"}
          </div>
        </div>
      ))}
    </div>
  )
}
