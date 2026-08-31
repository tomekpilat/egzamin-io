import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");
const server = readFileSync(join(process.cwd(), "server.mjs"), "utf8");

describe("Coolify Docker build", () => {
  it("skips Vinext standalone duplication only inside Docker", () => {
    expect(nextConfig).toContain('process.env.EGZAMINIO_DOCKER_BUILD === "1"');
    expect(nextConfig).toContain('output: isDockerBuild ? undefined : "standalone"');
    expect(dockerfile).toContain("ENV EGZAMINIO_DOCKER_BUILD=1");
    expect(dockerfile).not.toContain("/app/dist/standalone");
  });

  it("runs the regular build output through the production server", () => {
    expect(dockerfile).toContain("/app/dist ./dist");
    expect(dockerfile).toContain('CMD ["node", "server.mjs"]');
    expect(server).toContain('from "vinext/server/prod-server"');
    expect(server).toContain('new URL("./dist", import.meta.url)');
  });
});
