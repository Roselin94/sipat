import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo_sipat.png', 'pwa-icon.svg'],
      manifest: {
        name: 'SIPAT - République du Congo',
        short_name: 'SIPAT Congo',
        description: 'Système Intégré de Pilotage de l’Aménagement du Territoire',
        theme_color: '#007A3D', // Vert du drapeau national de la République du Congo
        background_color: '#F4F6F8',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sipat-map-tiles-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 jours
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replace(/\\/g, '/');
          if (modulePath.includes('/node_modules/leaflet/')) return 'vendor-map';
          if (
            modulePath.includes('/node_modules/react/') ||
            modulePath.includes('/node_modules/react-dom/') ||
            modulePath.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
