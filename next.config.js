/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
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

module.exports = nextConfig
