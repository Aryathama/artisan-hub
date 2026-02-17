import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons/*.svg'],
            workbox: {
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
            },
            manifest: {
                name: 'The Artisan Content Hub',
                short_name: 'Artisan Hub',
                description: 'Dashboard multi-tools untuk kreator konten bisnis kriya handmade',
                theme_color: '#1a1a2e',
                background_color: '#1a1a2e',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    {
                        src: '/icons/icon-192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: '/icons/icon-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ]
});
