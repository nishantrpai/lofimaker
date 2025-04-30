"use client"

import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface VinylEffectProps {
  effect: {
    enabled: boolean
    amount: number
    age: number
  }
  onChange: (effect: any) => void
}

export default function VinylEffect({ effect, onChange }: VinylEffectProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="vinyl-toggle"
          checked={effect.enabled}
          onCheckedChange={(checked) => onChange({ ...effect, enabled: checked })}
        />
        <Label htmlFor="vinyl-toggle">Enable vinyl effect</Label>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="crackle-amount" className="text-xs">
            Crackle
          </Label>
          <span className="text-xs font-mono">{Math.round(effect.amount * 100)}%</span>
        </div>
        <Slider
          id="crackle-amount"
          min={0}
          max={1}
          step={0.01}
          value={[effect.amount]}
          onValueChange={(value) => onChange({ ...effect, amount: value[0] })}
          disabled={!effect.enabled}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="vinyl-age" className="text-xs">
            Age
          </Label>
          <span className="text-xs font-mono">{Math.round(effect.age * 100)}%</span>
        </div>
        <Slider
          id="vinyl-age"
          min={0}
          max={1}
          step={0.01}
          value={[effect.age]}
          onValueChange={(value) => onChange({ ...effect, age: value[0] })}
          disabled={!effect.enabled}
        />
      </div>
    </div>
  )
}
