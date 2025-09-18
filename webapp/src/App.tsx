import { trpc } from './utils/trpc'
import './App.css'

function App() {
  const pingQuery = trpc.ping.useQuery()
  const helloQuery = trpc.hello.useQuery({ name: 'tRPC' })

  return (
    <div className="app">
      <h1>Event Scheduler</h1>

      <div style={{ marginTop: '2rem' }}>
        <h2>Server Connection Test</h2>

        <div style={{ marginTop: '1rem' }}>
          <h3>Ping Test:</h3>
          {pingQuery.isLoading && <p>Loading...</p>}
          {pingQuery.error && <p style={{ color: 'red' }}>Error: {pingQuery.error.message}</p>}
          {pingQuery.data && (
            <div>
              <p>✅ {pingQuery.data.message}</p>
              <p>Timestamp: {pingQuery.data.timestamp}</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h3>Hello Test:</h3>
          {helloQuery.isLoading && <p>Loading...</p>}
          {helloQuery.error && <p style={{ color: 'red' }}>Error: {helloQuery.error.message}</p>}
          {helloQuery.data && <p>✅ {helloQuery.data.message}</p>}
        </div>
      </div>
    </div>
  )
}

export default App
