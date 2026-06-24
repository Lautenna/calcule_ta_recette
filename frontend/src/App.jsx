import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { CalculateurPage } from './components/calculateur/CalculateurPage'
import { MetabolismePage } from './components/metabolisme/MetabolismePage'
import { AccueilPage } from './pages/AccueilPage'
import { ProfilPage } from './pages/ProfilPage'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/calculateur" replace />} />
          <Route path="/accueil" element={<AccueilPage />} />
          <Route path="/calculateur" element={<CalculateurPage />} />
          <Route path="/metabolisme" element={<MetabolismePage />} />
          <Route path="/profil" element={<ProfilPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
