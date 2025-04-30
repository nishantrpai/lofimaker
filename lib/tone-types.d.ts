declare module "tone" {
  export function start(): Promise<void>
  export function getContext(): any
  export const Transport: any
  export const Destination: any
  export class Gain {
    constructor()
    toDestination(): this
    connect(node: any): this
    dispose(): this
    gain: { value: number }
  }
  export class Sampler {
    constructor(options: any)
    toDestination(): this
    triggerAttackRelease(note: string, duration: string, time?: any): this
    dispose(): this
    volume: { value: number }
    pan: { value: number }
  }
  export class Sequence {
    constructor(callback: (time: number, step: number) => void, events: any[], subdivision: string)
    start(time?: number): this
    stop(time?: number): this
    dispose(): this
  }
  export class Noise {
    constructor(type: string)
    start(): this
    stop(): this
    connect(node: any): this
    dispose(): this
  }
  export class Filter {
    constructor(frequency: number, type: string)
    connect(node: any): this
    dispose(): this
  }
  export function gainToDb(gain: number): number
  export function dbToGain(db: number): number
}
