import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'A M World School - Recruitment Tracker',
        short_name: 'AM Recruit',
        description: 'Complete recruitment management system for A M World School',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: 'icon-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: 'icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Dashboard Mobile'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.vercel\.app\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001'
    }
  }
})
