/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["cesium"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
