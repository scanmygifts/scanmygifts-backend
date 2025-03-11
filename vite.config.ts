import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        server: './src/server/index.ts',
      },
      output: {
        dir: 'dist',
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'server' ? 'server/[name].js' : 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
