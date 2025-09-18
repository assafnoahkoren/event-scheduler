import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { DirectionToggle } from '@/components/DirectionToggle'
import { LogOut, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CreateFirstSite } from './CreateFirstSite'

export function Home() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Event Scheduler</h1>
          </div>

          <div className="flex items-center gap-4">
            <DirectionToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 me-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <CreateFirstSite />
      </main>
    </div>
  )
}