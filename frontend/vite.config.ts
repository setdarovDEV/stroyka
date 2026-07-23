import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['isidioid-overventurous-rita.ngrok-free.dev', 'dd35-188-113-210-117.ngrok-free.app'],
    proxy: {
      '^/(auth|users|projects|estimates|estimate-lines|warehouse|warehouse-transactions|material-requests|brigades|work-logs|machines|machine-logs|dashboard|alerts|reports|zones|audit-log)': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2021',
    minify: 'esbuild',
    sourcemap: true,
  },
  envPrefix: ['VITE_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
