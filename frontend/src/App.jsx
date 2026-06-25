import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { Navbar } from './components/layout/Navbar'
import { CalculateurPage } from './components/calculateur/CalculateurPage'
import { MetabolismePage } from './components/metabolisme/MetabolismePage'
import { AccueilPage } from './pages/AccueilPage'
import { ProfilPage } from './pages/ProfilPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ConfirmationPage } from './pages/ConfirmationPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/calculateur" replace />} />
            <Route path="/accueil" element={<AccueilPage />} />
            <Route path="/calculateur" element={<CalculateurPage />} />
            <Route path="/metabolisme" element={<MetabolismePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/confirmation" element={<ConfirmationPage />} />
            <Route
              path="/profil"
              element={
                <PrivateRoute>
                  <ProfilPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
