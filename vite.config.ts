import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { apiDevServer } from './vite.api-dev.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make server-side env vars (GOOGLE_PLACES_API_KEY, …) visible to /api handlers in dev.
  // Only VITE_* vars are ever exposed to the browser bundle.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), apiDevServer()],
  }
})
