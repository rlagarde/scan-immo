import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config so Next.js 16 doesn't error when falling back to webpack
  turbopack: {},
  // Use webpack instead of Turbopack (DuckDB-WASM needs webpack config)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    // Exclude duckdb-wasm from being bundled - we'll load it from CDN
    return config;
  },
  // Headers for SharedArrayBuffer (needed by DuckDB-WASM for best perf)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
