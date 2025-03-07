import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'handle-netlify-redirects',
      async writeBundle() {
        // Create _redirects file in the dist directory
        const redirectsContent = '/*    /index.html   200';
        await fs.writeFile(path.resolve(__dirname, 'dist', '_redirects'), redirectsContent);
        console.log('Created _redirects file in dist directory');
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});