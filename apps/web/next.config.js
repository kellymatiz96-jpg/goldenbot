/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite llamar al API en Railway desde Vercel sin problemas de CORS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
