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
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">{i + 1}</span>
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
                    ? "bg-amber-200 border-amber-300 hover:bg-amber-300 dark:bg-amber-900 dark:border-amber-800 dark:hover:bg-amber-800"
                    : "bg-white border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800",
                  currentStep === stepIndex && "ring-2 ring-offset-1 dark:ring-offset-black",
                  currentStep === stepIndex && isActive 
                    ? "ring-amber-500 dark:ring-amber-600" 
                    : "ring-zinc-300 dark:ring-zinc-700",
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
