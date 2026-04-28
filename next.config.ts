import type { NextConfig } from "next";
import { execSync } from "child_process";

const sha = execSync("git rev-parse --short HEAD").toString().trim();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: sha,
  },
};

export default nextConfig;
