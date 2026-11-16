import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Injects the AdSense <script> into <head> at build time, only when
// VITE_ADSENSE_CLIENT is set (so dev / unconfigured builds stay clean).
function adsensePlugin(client) {
  return {
    name: 'batify-adsense',
    transformIndexHtml() {
      if (!client) return []
      return [
        {
          tag: 'script',
          attrs: {
            async: true,
            crossorigin: 'anonymous',
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
          },
          injectTo: 'head',
        },
      ]
    },
  }
}

// Adds absolute og:image tags when VITE_SITE_URL is set (crawlers need absolute URLs).
function socialImagePlugin(siteUrl) {
  return {
    name: 'batify-social-image',
    transformIndexHtml(html) {
      const url = (siteUrl || '').replace(/\/$/, '')
      const tags = url
        ? `<meta property="og:image" content="${url}/og.png" />\n    <meta property="og:url" content="${url}" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:image" content="${url}/og.png" />`
        : '<meta name="twitter:card" content="summary" />'
      return html.replace('<!--SOCIAL_IMAGE-->', tags)
    },
  }
}

function phpString(value) {
  return `'${String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function infinityFreePreviewConfigPlugin(env) {
  return {
    name: 'batify-infinityfree-preview-config',
    apply: 'build',
    async closeBundle() {
      const config = `<?php\nreturn [\n  'site_url' => ${phpString(env.VITE_SITE_URL)},\n  'supabase_url' => ${phpString(env.VITE_SUPABASE_URL)},\n  'supabase_anon_key' => ${phpString(env.VITE_SUPABASE_ANON_KEY)},\n];\n`
      await writeFile(resolve(process.cwd(), 'dist/preview-config.php'), config, { mode: 0o644 })
    },
  }
}

function devManifestLinkPlugin() {
  return {
    name: 'batify-dev-manifest-link',
    apply: 'serve',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s*<link rel="manifest" href="\/manifest\.webmanifest"\s*\/>/, '')
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_secret_')) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must be a Supabase publishable/anon key. Secret keys must never be used in VITE_* variables.'
    )
  }
  return {
    test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'], css: false },
    plugins: [
      react(),
      adsensePlugin(env.VITE_ADSENSE_CLIENT),
      socialImagePlugin(env.VITE_SITE_URL),
      infinityFreePreviewConfigPlugin(env),
      devManifestLinkPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // we register manually in main.jsx (PROD only)
        includeAssets: ['favicon.svg', 'icons/192.png', 'icons/512.png'],
        manifest: {
          name: 'Batify: birthday letters, wishes and gifts',
          short_name: 'Batify',
          description: 'Write one birthday letter, share one link, unwrap every wish. Free, no account.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#FAFAF6',
          theme_color: '#F7C531',
          icons: [
            { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          importScripts: ['/push-sw.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /\/audio\/[^/]+$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'batify-audio',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
            {
              urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'batify-media',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'batify-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})
