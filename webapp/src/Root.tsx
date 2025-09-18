import { BrowserRouter } from 'react-router-dom'
import { DirectionProvider } from './contexts/DirectionContext'
import { TRPCProvider } from './providers/TRPCProvider'
import App from './App'

export function Root() {
  return (
    <BrowserRouter>
      <TRPCProvider>
        <DirectionProvider>
          <App />
        </DirectionProvider>
      </TRPCProvider>
    </BrowserRouter>
  )
}