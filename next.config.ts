import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The Codex SDK spawns the Codex CLI binary from its own package folder, so
  // both must be loaded from node_modules at runtime rather than bundled.
  serverExternalPackages: ["@openai/codex-sdk", "@openai/codex"],
};

export default nextConfig;
