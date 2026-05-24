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
        // Spanish
        esAiOptOut: resolve(__dirname, 'es/ai-opt-out-metadata/index.html'),
        esRemoveExif: resolve(__dirname, 'es/remove-exif-from-photos/index.html'),
        esRemovePdf: resolve(__dirname, 'es/remove-pdf-metadata/index.html'),
        esKnowledge: resolve(__dirname, 'es/knowledge/index.html'),
        // French
        frAiOptOut: resolve(__dirname, 'fr/ai-opt-out-metadata/index.html'),
        frRemoveExif: resolve(__dirname, 'fr/remove-exif-from-photos/index.html'),
        frRemovePdf: resolve(__dirname, 'fr/remove-pdf-metadata/index.html'),
        frKnowledge: resolve(__dirname, 'fr/knowledge/index.html'),
        // German
        deAiOptOut: resolve(__dirname, 'de/ai-opt-out-metadata/index.html'),
        deRemoveExif: resolve(__dirname, 'de/remove-exif-from-photos/index.html'),
        deRemovePdf: resolve(__dirname, 'de/remove-pdf-metadata/index.html'),
        deKnowledge: resolve(__dirname, 'de/knowledge/index.html'),
      }
    }
  }
});
