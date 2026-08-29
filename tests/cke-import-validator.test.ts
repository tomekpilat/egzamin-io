import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalJson, prepareManifest, sha256, stageManifest, validateManifest } from "@/scripts/cke-import.mjs";

const template = JSON.parse(readFileSync(join(process.cwd(), "content/cke/manual-import.template.json"), "utf8"));

afterEach(() => vi.unstubAllGlobals());

describe("manual CKE import validator", () => {
  it("accepts a complete manifest with closed, open, MathJax, image and table content", () => {
    expect(validateManifest(template)).toEqual({ valid: true, errors: [] });
  });

  it("detects inconsistent counts and duplicate identifiers", () => {
    const invalid = structuredClone(template);
    invalid.paper.question_count = 3;
    invalid.questions[1].id = invalid.questions[0].id;
    invalid.questions[1].number = invalid.questions[0].number;
    const result = validateManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("zadeklarowano 3, znaleziono 2");
    expect(result.errors.join(" ")).toContain("duplikat identyfikatora");
    expect(result.errors.join(" ")).toContain("duplikat numeru zadania");
  });

  it("requires source pages, valid answer keys and resolvable accessible assets", () => {
    const invalid = structuredClone(template);
    invalid.questions[0].source_pages = [];
    invalid.questions[0].answer_key.correct_index = 4;
    invalid.questions[0].assets[0].alt = "";
    invalid.questions[0].content_blocks[2].asset_id = "missing-asset";
    const errors = validateManifest(invalid).errors.join(" ");
    expect(errors).toContain("source_pages");
    expect(errors).toContain("correct_index");
    expect(errors).toContain("tekst alternatywny");
    expect(errors).toContain("brak odpowiadającego zasobu");
  });

  it("rejects NUL characters before PostgreSQL staging", () => {
    const invalid = structuredClone(template);
    invalid.questions[0].prompt = "Treść przed znakiem\u0000treść po znaku";
    const result = validateManifest(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("manifest.questions[0].prompt: znak NUL (\\u0000) nie może zostać zapisany w PostgreSQL");
  });

  it("allows official CKE media URLs and rejects other remote assets", () => {
    const official = structuredClone(template);
    official.questions[0].assets[0].path = "https://cke.gov.pl/images/example.mp3";
    expect(validateManifest(official).valid).toBe(true);

    const external = structuredClone(template);
    external.questions[0].assets[0].path = "https://example.com/tracker.mp3";
    expect(validateManifest(external).errors.join(" ")).toContain("oficjalny adres HTTPS CKE");
  });

  it("generates deterministic per-question and manifest checksums", () => {
    const first = prepareManifest(template);
    const second = prepareManifest(structuredClone(template));
    expect(first.checksum).toBe(second.checksum);
    expect(first.manifest.questions[0].source_checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256(canonicalJson({ b: 2, a: 1 }))).toBe(sha256(canonicalJson({ a: 1, b: 2 })));
    const changed = structuredClone(template);
    changed.questions[0].prompt += " poprawka";
    expect(prepareManifest(changed).checksum).not.toBe(first.checksum);
  });

  it("sends a validated, checksummed manifest only to the staging RPC", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify([{ import_result: "staged" }]) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await stageManifest(template, { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "secret" });
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://project.supabase.co/rest/v1/rpc/stage_cke_import");
    expect(request.headers.Authorization).toBe("Bearer secret");
    const body = JSON.parse(request.body);
    expect(body.import_manifest.questions[0].source_checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
