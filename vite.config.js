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
        aiOptOut: resolve(__dirname, 'ai-opt-out-metadata/index.html'),
        removeExif: resolve(__dirname, 'remove-exif-from-photos/index.html'),
        removePdf: resolve(__dirname, 'remove-pdf-metadata/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
        refund: resolve(__dirname, 'refund/index.html'),
        notFound: resolve(__dirname, '404.html'),
        support: resolve(__dirname, 'support/index.html'),
        knowledge: resolve(__dirname, 'knowledge/index.html'),
        imageConverter: resolve(__dirname, 'image-converter/index.html'),
        imageConverterSuccess: resolve(__dirname, 'image-converter/success/index.html'),
        vanishAi: resolve(__dirname, 'vanishai/index.html'),
        quietBrowsing: resolve(__dirname, 'quietbrowsing/index.html'),
        quietBrowsingBuy: resolve(__dirname, 'quietbrowsing/buy/index.html'),
        quietBrowsingSuccess: resolve(__dirname, 'quietbrowsing/success/index.html'),
        removeUtmParameters: resolve(__dirname, 'remove-utm-parameters/index.html'),
        cleanTrackingLinks: resolve(__dirname, 'clean-tracking-links/index.html'),
        seeRealUrl: resolve(__dirname, 'see-real-url-behind-redirect/index.html'),
        convertHeicToJpg: resolve(__dirname, 'convert-heic-to-jpg/index.html'),
        compressImages: resolve(__dirname, 'compress-images-without-losing-quality/index.html'),
        turnOffAiOverviews: resolve(__dirname, 'turn-off-google-ai-overviews/index.html'),
        googleUdm14: resolve(__dirname, 'google-udm-14/index.html'),
      }
    }
  }
});
