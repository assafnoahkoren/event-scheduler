import { Routes, Route, Navigate } from 'react-router-dom'
import { GlobalStateProvider } from '@/providers/GlobalStateProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Home } from '@/pages/home/Home'

function App() {
  return (
    <GlobalStateProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GlobalStateProvider>
  )
}

export default App
