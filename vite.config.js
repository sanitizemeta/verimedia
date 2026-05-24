import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        es: resolve(__dirname, 'es/index.html'),
        fr: resolve(__dirname, 'fr/index.html'),
        de: resolve(__dirname, 'de/index.html'),
        aiOptOut: resolve(__dirname, 'ai-opt-out-metadata/index.html'),
        removeExif: resolve(__dirname, 'remove-exif-from-photos/index.html'),
        removePdf: resolve(__dirname, 'remove-pdf-metadata/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
        refund: resolve(__dirname, 'refund/index.html'),
        notFound: resolve(__dirname, '404.html'),
        knowledge: resolve(__dirname, 'knowledge/index.html'),
      }
    }
  }
});
