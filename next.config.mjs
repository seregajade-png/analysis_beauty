/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    serverComponentsExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
