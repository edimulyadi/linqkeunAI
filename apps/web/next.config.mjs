/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@linqkeun/database", "@prisma/client"],
  },
};

export default nextConfig;
