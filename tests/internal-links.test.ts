import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appRoot = join(root, "app");

function collectTsx(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectTsx(path) : entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function routeSource(pathname: string) {
  const route = pathname === "/" ? appRoot : join(appRoot, pathname.slice(1));
  const page = join(route, "page.tsx");
  const handler = join(route, "route.ts");
  return existsSync(page) ? page : existsSync(handler) ? handler : null;
}

describe("static internal navigation", () => {
  const files = collectTsx(appRoot);

  it("points every static internal href at an existing route", () => {
    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/href=["']([^"']+)["']/g)) {
        const href = match[1];
        if (!href.startsWith("/") || href.startsWith("//")) continue;
        const pathname = href.split(/[?#]/)[0] || "/";
        if (!routeSource(pathname)) missing.push(`${relative(root, file)} → ${href}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("points homepage hash links at existing section ids", () => {
    const source = readFileSync(join(appRoot, "page.tsx"), "utf8");
    const ids = new Set([...source.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
    const fragments = [...source.matchAll(/href=["']#([^"']+)["']/g)].map((match) => match[1]);
    expect(fragments.length).toBeGreaterThan(0);
    expect(fragments.filter((fragment) => !ids.has(fragment))).toEqual([]);
  });

  it("contains no decorative step numbers", () => {
    const source = readFileSync(join(appRoot, "page.tsx"), "utf8");
    expect(source).not.toMatch(/step-number|>\s*0[123]\s*</);
  });

  it("does not present permanently disabled landing or dashboard actions", () => {
    const sources = [join(appRoot, "page.tsx"), join(appRoot, "panel", "page.tsx")].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).not.toMatch(/<Button[^>]*\sdisabled(?:\s|>)/);
  });

  it("links the parent experience to the child-safety route", () => {
    const sources = [join(appRoot, "page.tsx"), join(appRoot, "panel", "page.tsx")].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).toContain('href="/bezpieczenstwo-dzieci-ai"');
    expect(routeSource("/bezpieczenstwo-dzieci-ai")).not.toBeNull();
  });
});
