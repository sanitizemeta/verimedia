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
        imageConverter: resolve(__dirname, 'image-converter/index.html'),
        imageConverterSuccess: resolve(__dirname, 'image-converter/success/index.html'),
        quietBrowsing: resolve(__dirname, 'quietbrowsing/index.html'),
        quietBrowsingBuy: resolve(__dirname, 'quietbrowsing/buy/index.html'),
        quietBrowsingSuccess: resolve(__dirname, 'quietbrowsing/success/index.html'),
        // Spanish
        esAiOptOut: resolve(__dirname, 'es/ai-opt-out-metadata/index.html'),
        esRemoveExif: resolve(__dirname, 'es/remove-exif-from-photos/index.html'),
        esRemovePdf: resolve(__dirname, 'es/remove-pdf-metadata/index.html'),
        esKnowledge: resolve(__dirname, 'es/knowledge/index.html'),
        esPrivacy: resolve(__dirname, 'es/privacy/index.html'),
        esTerms: resolve(__dirname, 'es/terms/index.html'),
        esRefund: resolve(__dirname, 'es/refund/index.html'),
        es404: resolve(__dirname, 'es/404.html'),
        // French
        frAiOptOut: resolve(__dirname, 'fr/ai-opt-out-metadata/index.html'),
        frRemoveExif: resolve(__dirname, 'fr/remove-exif-from-photos/index.html'),
        frRemovePdf: resolve(__dirname, 'fr/remove-pdf-metadata/index.html'),
        frKnowledge: resolve(__dirname, 'fr/knowledge/index.html'),
        frPrivacy: resolve(__dirname, 'fr/privacy/index.html'),
        frTerms: resolve(__dirname, 'fr/terms/index.html'),
        frRefund: resolve(__dirname, 'fr/refund/index.html'),
        fr404: resolve(__dirname, 'fr/404.html'),
        // German
        deAiOptOut: resolve(__dirname, 'de/ai-opt-out-metadata/index.html'),
        deRemoveExif: resolve(__dirname, 'de/remove-exif-from-photos/index.html'),
        deRemovePdf: resolve(__dirname, 'de/remove-pdf-metadata/index.html'),
        deKnowledge: resolve(__dirname, 'de/knowledge/index.html'),
        dePrivacy: resolve(__dirname, 'de/privacy/index.html'),
        deTerms: resolve(__dirname, 'de/terms/index.html'),
        deRefund: resolve(__dirname, 'de/refund/index.html'),
        de404: resolve(__dirname, 'de/404.html'),
      }
    }
  }
});
