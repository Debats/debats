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
      // The addresses these pages answered at before they were shortened: links to them still lead somewhere
      { source: '/arguments', destination: '/a', permanent: true },
      { source: '/arguments/:slug', destination: '/a/:slug', permanent: true },
      { source: '/prises-de-position', destination: '/pdp', permanent: true },
      { source: '/nouvelle-prise-de-position', destination: '/pdp/ajouter', permanent: true },
      {
        source: '/prise-de-position/:statementId/modifier',
        destination: '/pdp/:statementId/modifier',
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
      {
        source: '/logos/:path*',
        destination: `${supabaseUrl}/storage/v1/object/public/logos/:path*`,
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
