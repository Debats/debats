const { withPlausibleProxy } = require('next-plausible')
const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/subjects/:slug',
        destination: '/s/:slug',
        permanent: true,
      },
    ]
  },
  rewrites() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:64321'
    return [
      {
        source: '/avatars/:path*',
        destination: `${supabaseUrl}/storage/v1/object/public/avatars/:path*`,
      },
    ]
  },
}

module.exports = withSentryConfig(withPlausibleProxy()(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
