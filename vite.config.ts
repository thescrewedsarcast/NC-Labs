import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-static-registry-assets',
        closeBundle() {
          try {
            if (fs.existsSync('projects.json')) {
              fs.copyFileSync('projects.json', path.resolve('dist', 'projects.json'));
            }
            if (fs.existsSync('assets')) {
              fs.cpSync('assets', path.resolve('dist', 'assets'), { recursive: true });
            }
          } catch (e) {
            console.error('Failed to copy static files to dist:', e);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
