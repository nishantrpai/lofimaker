"use client"

import dynamic from "next/dynamic"

// Import components with no SSR to avoid hydration issues
const LofiBeatmaker = dynamic(() => import("@/components/lofi-beatmaker"), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <LofiBeatmaker />
    </main>
  )
}
