const withPWA = require('@ducanh2912/next-pwa').default({
  dest:        'public',
  disable:     process.env.NODE_ENV === 'development',
  register:    true,
  skipWaiting: true,

  runtimeCaching: [
    {
      // App pages — try network first, fall back to cache (5s timeout)
      urlPattern: ({ url }) => url.pathname.startsWith('/'),
      handler:    'NetworkFirst',
      options: {
        cacheName: 'sms-pages-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries:    60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      // Static assets (JS, CSS, fonts, images) — cache first for speed
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/,
      handler:    'CacheFirst',
      options: {
        cacheName: 'sms-static-assets',
        expiration: {
          maxEntries:    120,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Supabase REST API — NetworkFirst with fallback so read ops work offline
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler:    'NetworkFirst',
      options: {
        cacheName: 'sms-supabase-api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries:    200,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
};
module.exports = withPWA(nextConfig)


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "fahad-dev-l5",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
