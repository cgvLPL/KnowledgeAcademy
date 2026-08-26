import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/KnowledgeAcademy";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  assetPrefix: isGitHubPages ? publicBasePath : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: isGitHubPages,
  },
};

export default nextConfig;
