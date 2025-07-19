/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com']
  },
  typescript: {
    ignoreBuildErrors: true
  },
  compiler: {
    styledComponents: true,
    reactStrictMode: true
  },
}

module.exports = nextConfig
