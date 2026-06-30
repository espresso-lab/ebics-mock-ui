import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
const apiTarget = process.env.VITE_API_BASE || 'http://localhost:8088'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/ebicsweb': { target: apiTarget, changeOrigin: true },
    },
  },
})
