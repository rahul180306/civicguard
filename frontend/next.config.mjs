const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, webpack }) => {
    if (dev) {
      // Disable filesystem cache to avoid ENOENT pack.gz flakiness on Windows
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
