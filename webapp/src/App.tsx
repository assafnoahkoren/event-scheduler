import { trpc } from './utils/trpc'
import { Button } from '@/components/ui/button'
import { DirectionToggle } from '@/components/DirectionToggle'
import { useDirection } from '@/contexts/DirectionContext'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'

function App() {
  const pingQuery = trpc.ping.useQuery()
  const helloQuery = trpc.hello.useQuery({ name: 'tRPC' })
  const { direction } = useDirection()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Event Scheduler</h1>
          <DirectionToggle />
        </header>

        <div className="grid gap-6">
          <section className="border rounded-lg p-6 bg-card">
            <h2 className="text-2xl font-semibold mb-4">Direction Test</h2>
            <div className="flex gap-4 items-center mb-4">
              <p className="text-muted-foreground">
                Current direction: <strong>{direction.toUpperCase()}</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="default">
                {direction === 'ltr' ? <ArrowRight className="me-2" /> : <ArrowLeft className="me-2" />}
                Primary Button
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </section>

          <section className="border rounded-lg p-6 bg-card">
            <h2 className="text-2xl font-semibold mb-4">Server Connection</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {pingQuery.isLoading ? (
                  <div className="text-muted-foreground">Loading ping...</div>
                ) : pingQuery.error ? (
                  <div className="text-destructive">Error: {pingQuery.error.message}</div>
                ) : (
                  <>
                    <CheckCircle className="text-green-500 mt-1" />
                    <div>
                      <p className="font-medium">Ping successful: {pingQuery.data?.message}</p>
                      <p className="text-sm text-muted-foreground">{pingQuery.data?.timestamp}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-start gap-3">
                {helloQuery.isLoading ? (
                  <div className="text-muted-foreground">Loading hello...</div>
                ) : helloQuery.error ? (
                  <div className="text-destructive">Error: {helloQuery.error.message}</div>
                ) : (
                  <>
                    <CheckCircle className="text-green-500 mt-1" />
                    <p className="font-medium">{helloQuery.data?.message}</p>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="border rounded-lg p-6 bg-card">
            <h2 className="text-2xl font-semibold mb-4">RTL Support Test</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 bg-primary rounded-full"></span>
                <p className="text-foreground">This text adapts to text direction</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 bg-secondary rounded-full"></span>
                <p className="text-foreground">Icons and layout flip automatically</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 bg-accent rounded-full"></span>
                <p className="text-foreground">Padding and margins use logical properties</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default App
