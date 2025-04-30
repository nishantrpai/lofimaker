"use client"

import { createContext, useContext, useRef, useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Import MIDISounds dynamically with no SSR
const MIDISounds = dynamic(() => import("midi-sounds-react"), {
  ssr: false,
})

// Create context
const MIDISoundsContext = createContext(null)

export function useMIDISounds() {
  return useContext(MIDISoundsContext)
}

export function MIDISoundsProvider({ children }) {
  const midiSounds = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (midiSounds.current) {
      setIsReady(true)
    }
  }, [midiSounds.current])

  return (
    <MIDISoundsContext.Provider value={{ midiSounds: midiSounds.current, isReady }}>
      <div ref={containerRef} id="midi-sounds-app">
        {children}

        {/* Hidden MIDISounds component */}
        <div style={{ display: "none" }}>
          {typeof window !== "undefined" && (
            <MIDISounds
              ref={midiSounds}
              appElementName="midi-sounds-app"
              instruments={[]}
              drums={[5, 38, 42, 60, 128]} // Pre-load our drum instruments
            />
          )}
        </div>
      </div>
    </MIDISoundsContext.Provider>
  )
}
