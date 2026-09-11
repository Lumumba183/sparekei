import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // Complies with the Vercel/Supabase/Clerk deployment guide: accepts
  // the guide's NEXT_PUBLIC_* variable names as well as VITE_*.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
