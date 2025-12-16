import { Routes, Route, Navigate } from 'react-router-dom'
import { GlobalStateProvider } from '@/providers/GlobalStateProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Shell } from '@/components/layouts/Shell'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Home } from '@/pages/home/Home'
import { Event } from '@/pages/Event'
import { NewSite } from '@/pages/sites/NewSite'
import { SiteSettings } from '@/pages/sites/SiteSettings'
import { Profile } from '@/pages/Profile'
import { Products } from '@/pages/products/Products'
import { NewProduct } from '@/pages/products/NewProduct'
import { ProductDetail } from '@/pages/products/ProductDetail'
import { Clients } from '@/pages/clients/Clients'
import { WaitingList } from '@/pages/waiting-list/WaitingList'
import { ServiceProviders } from '@/pages/ServiceProviders'
import { ServiceProviderDetail } from '@/pages/service-providers/ServiceProviderDetail'
import { ServiceCategories } from '@/pages/ServiceCategories'
import { FloorPlans } from '@/pages/floor-plans/FloorPlans'
import { FloorPlanDetail } from '@/pages/floor-plans/FloorPlanDetail'
import { ComponentTypes } from '@/pages/floor-plans/ComponentTypes'
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
            <Route path="/sites/settings" element={<SiteSettings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<NewProduct />} />
            <Route path="/products/:productId" element={<ProductDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/waiting-list" element={<WaitingList />} />
            <Route path="/service-providers" element={<ServiceProviders />} />
            <Route path="/service-providers/:providerId" element={<ServiceProviderDetail />} />
            <Route path="/service-categories" element={<ServiceCategories />} />
            <Route path="/floor-plans" element={<FloorPlans />} />
            <Route path="/floor-plans/:floorPlanId" element={<FloorPlanDetail />} />
            <Route path="/component-types" element={<ComponentTypes />} />
          </Route>
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GlobalStateProvider>
  )
}

export default App
