import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vercel serves the app from the domain root, so no base path is needed
// (previously this was '/hokenn/' for the GitHub Pages subpath deployment).
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
})
