import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { GamePage } from '@/pages/GamePage'
import { ComparativePage } from '@/pages/ComparativePage'
import { PredictionsPage } from '@/pages/PredictionsPage'
import { LoginPage } from '@/pages/LoginPage'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { LandingPage } from '@/pages/LandingPage'
import { HelpPage } from '@/pages/HelpPage'
import { TopCombosPage } from '@/pages/TopCombosPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <Toaster position="bottom-right" richColors closeButton duration={3000} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="game/:id" element={<GamePage />} />
                <Route path="comparative" element={<ComparativePage />} />
                <Route path="predicciones" element={<PredictionsPage />} />
                <Route path="ayuda" element={<HelpPage />} />
                <Route path="mejores" element={<TopCombosPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="admin" element={<AdminDashboard />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
