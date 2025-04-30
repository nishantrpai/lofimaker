"use client"

import { cn } from "@/lib/utils"

interface StepSequencerProps {
  sequence: boolean[][]
  currentStep: number
  tracks: any[]
  onToggleStep: (trackIndex: number, stepIndex: number) => void
}

export default function StepSequencer({ sequence, currentStep, tracks, onToggleStep }: StepSequencerProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-16 gap-1 mb-1">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="h-6 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-400">{i + 1}</span>
            </div>
          ))}
        </div>

        {sequence.map((trackSequence, trackIndex) => (
          <div key={trackIndex} className="grid grid-cols-16 gap-1 mb-1">
            {trackSequence.map((isActive, stepIndex) => (
              <button
                key={stepIndex}
                className={cn(
                  "h-10 rounded-md border transition-all",
                  isActive
                    ? "bg-amber-200 border-amber-300 hover:bg-amber-300"
                    : "bg-white border-zinc-200 hover:bg-zinc-100",
                  currentStep === stepIndex && "ring-2 ring-offset-1",
                  currentStep === stepIndex && isActive ? "ring-amber-500" : "ring-zinc-300",
                  tracks[trackIndex].mute && "opacity-50",
                )}
                onClick={() => onToggleStep(trackIndex, stepIndex)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
