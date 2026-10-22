import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages deploys to /<repo-name>/ — read base from env set by the CI workflow.
  // Locally (or on a custom domain root) this is just '/'.
  base: process.env.VITE_BASE_URL ?? '/',
  // Required for wllama WebAssembly binaries (AI Trainer feature)
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@wllama/wllama'],
  },
  plugins: [tailwindcss(), ...(process.env.VITEST ? [] : [mkcert()]), react(), VitePWA({
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
      background_color: '#0e0e0e',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone'],
      protocol_handlers: [
        {
          protocol: 'web+localift',
          url: '/?protocol=%s',
        },
      ],
      share_target: {
        action: '/share-target',
        method: 'POST',
        enctype: 'multipart/form-data',
        params: {
          files: [{ name: 'file', accept: ['application/json', '.localift'] }],
        },
      },

      screenshots: [
        {
          src: 'pwa-screenshot-desktop.png',
          sizes: '1280x720',
          type: 'image/png',
          form_factor: 'wide',
        },
        {
          src: 'pwa-screenshot-mobile.png',
          sizes: '540x720',
          type: 'image/png',
        },
      ],

      icons: [
        {
          src: 'pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png',
        },
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },

    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    },

    devOptions: {
      enabled: true,
      navigateFallback: 'index.html',
      suppressWarnings: false,
      type: 'module',
    },

    includeAssets: ['favicon.ico'],
  })],

  test: {
    setupFiles: ['./src/test-setup.ts'],
  },

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },

  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})