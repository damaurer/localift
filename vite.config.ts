import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages deploys to /<repo-name>/ — read base from env set by the CI workflow.
  // Locally (or on a custom domain root) this is just '/'.
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [tailwindcss(), react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    registerType: 'prompt',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'localift',
      short_name: 'localift',
      description: 'This training app is a local-first Progressive Web App (PWA) built for people who want full control over their workout data.',
      theme_color: '#212121',
    },

    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})