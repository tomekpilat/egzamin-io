import type { NextConfig } from "next";

// Vinext's standalone emitter copies the whole public directory a second time.
// The CKE asset library is already present in dist/client, so doing that inside
// a Docker build adds hundreds of megabytes of synchronous I/O and can make a
// small Coolify host look stuck after the actual compilation has finished.
const isDockerBuild = process.env.EGZAMINIO_DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  output: isDockerBuild ? undefined : "standalone",
  enablePrerenderSourceMaps: false,
};

export default nextConfig;
