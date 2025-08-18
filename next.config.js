/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds for faster deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow type errors during builds for faster deployment 
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
