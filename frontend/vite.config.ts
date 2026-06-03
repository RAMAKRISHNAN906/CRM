import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || '/';
  const apiPrefix = `${base.replace(/\/?$/, '/') }api/`;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'NexusCRM - Customer Relationship Management',
          short_name: 'NexusCRM',
          description: 'Premium CRM platform for modern teams',
          theme_color: '#7c3aed',
          background_color: '#0a0a0b',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: base,
          start_url: base,
          id: 'nexuscrm-v1',
          icons: [
            { src: `${base}pwa-64x64.png`, sizes: '64x64', type: 'image/png' },
            { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: `${base}maskable-icon-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          categories: ['business', 'productivity'],
          lang: 'en',
          dir: 'ltr',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^${apiPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`, 'i'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages-cache',
                networkTimeoutSeconds: 3,
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      },
    },
  };
});
