/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence ESLint circular reference warning during builds
  // (caused by FlatCompat + Next.js config interaction)
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingIncludes: {
    "/api/preview/[token]": ["./client-previews/**/*"],
  },
};

export default nextConfig;
