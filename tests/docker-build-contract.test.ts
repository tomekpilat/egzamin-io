import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");
const dockerignore = readFileSync(join(process.cwd(), ".dockerignore"), "utf8");
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

  it("keeps large CKE media outside Vite and restores it in the runtime image", () => {
    expect(dockerfile).toContain("FROM node:24-alpine AS cke-assets");
    expect(dockerfile).toContain("COPY public/cke ./cke");
    expect(dockerfile).toContain("FROM cke-assets AS cke-placeholders");
    expect(dockerfile).toContain("COPY --from=cke-placeholders /placeholders ./public/cke");
    expect(dockerfile).toContain("COPY --from=cke-assets --chown=node:node /assets/cke ./dist/client/cke");
    expect(dockerfile).not.toContain("COPY . .");
    expect(dockerignore).toContain("content\n");
    expect(dockerignore).toContain("tests\n");
  });

  it("copies every favicon referenced by the root metadata into the image", () => {
    expect(dockerfile).toContain("COPY public/favicon.svg ./public/favicon.svg");
    expect(dockerfile).toContain("COPY public/favicon-16.svg ./public/favicon-16.svg");
    expect(dockerfile).toContain("COPY public/apple-touch-icon.svg ./public/apple-touch-icon.svg");
  });
});
