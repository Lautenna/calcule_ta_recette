import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Le serveur Symfony local sert en HTTPS (et redirige le HTTP vers HTTPS),
        // donc on cible https. secure:false accepte le certificat auto-signé local.
        target: 'https://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Sert les photos de profil uploadées (public/uploads/... côté Symfony)
      '/uploads': {
        target: 'https://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
