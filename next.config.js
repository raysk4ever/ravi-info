/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com']
  },
  compiler: {
    styledComponents: true,
    reactStrictMode: true
  },
}

module.exports = nextConfig
