import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on 0.0.0.0 so dev tunnels and local network can access
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443, // Required for HTTPS Dev Tunnels websocket reload
    }
  }
})
