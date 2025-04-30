"use client"

interface SamplePadsProps {
  tracks: any[]
  onTriggerSample: (trackIndex: number) => void
}

export default function SamplePads({ tracks, onTriggerSample }: SamplePadsProps) {
  const padColors = [
    "bg-amber-100 hover:bg-amber-200 border-amber-200 active:bg-amber-300",
    "bg-rose-100 hover:bg-rose-200 border-rose-200 active:bg-rose-300",
    "bg-cyan-100 hover:bg-cyan-200 border-cyan-200 active:bg-cyan-300",
    "bg-violet-100 hover:bg-violet-200 border-violet-200 active:bg-violet-300",
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {tracks.map((track, index) => (
        <button
          key={track.id}
          className={`h-20 rounded-lg border-2 transition-all ${padColors[index % padColors.length]} ${track.mute ? "opacity-50" : ""}`}
          onClick={() => onTriggerSample(index)}
        >
          <span className="font-medium text-sm">{track.name}</span>
        </button>
      ))}
    </div>
  )
}
