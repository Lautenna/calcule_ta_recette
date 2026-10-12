import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:lan` : site accessible depuis le téléphone sur le réseau local.
// HTTPS obligatoire, sinon le navigateur mobile bloque la caméra (scan).
const lan = process.env.LAN === '1'

export default defineConfig({
  plugins: [react(), ...(lan ? [basicSsl()] : [])],
  server: {
    port: 5173,
    host: lan ? true : undefined,
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
