import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
// import { VoiceAssistant } from '@/components/VoiceAssistant'

export function Shell() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {/* <VoiceAssistant /> */}
    </div>
  )
}