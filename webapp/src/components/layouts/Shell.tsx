import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'

export function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pb-8">
        <Outlet />
      </main>
    </div>
  )
}