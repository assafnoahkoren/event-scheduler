import { Routes, Route, Navigate } from 'react-router-dom'
import { GlobalStateProvider } from '@/providers/GlobalStateProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Shell } from '@/components/layouts/Shell'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Home } from '@/pages/home/Home'
import { Event } from '@/pages/Event'
import { NewSite } from '@/pages/sites/NewSite'
import '@/styles/swiper-custom.css'

function App() {
  return (
    <GlobalStateProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/event/:eventId" element={<Event />} />
            <Route path="/sites/new" element={<NewSite />} />
          </Route>
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GlobalStateProvider>
  )
}

export default App
