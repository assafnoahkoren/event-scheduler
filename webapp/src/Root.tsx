import { BrowserRouter } from 'react-router-dom'
import { TRPCProvider } from './providers/TRPCProvider'
import App from './App'
import './i18n/index' // Initialize i18n

export function Root() {
  return (
    <BrowserRouter>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </BrowserRouter>
  )
}