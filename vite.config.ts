import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * IPv4-only loopback helps keep development stable with a Windows VPN.
 * Always open http://127.0.0.1:5173/ (not localhost).
 * This app has no MSW, service worker or remote API on startup.
 */
const HOST = '127.0.0.1';
const PORT = 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    host: HOST,
    port: PORT,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: HOST,
      clientPort: PORT,
    },
  },
  preview: {
    host: HOST,
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
