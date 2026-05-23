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
        aiOptOut: resolve(__dirname, 'ai-opt-out-metadata.html'),
        removeExif: resolve(__dirname, 'remove-exif-from-photos.html'),
        removePdf: resolve(__dirname, 'remove-pdf-metadata.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        refund: resolve(__dirname, 'refund.html'),
      }
    }
  }
});
