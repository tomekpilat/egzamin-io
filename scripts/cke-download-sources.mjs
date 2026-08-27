#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_PAGE = "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2026-2/";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUBJECTS = new Set([
  "Język polski",
  "Matematyka",
  "Język angielski",
  "Język francuski",
  "Język hiszpański",
  "Język niemiecki",
  "Język rosyjski",
  "Język włoski",
]);

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;|&#038;/gi, "&")
    .replace(/&quot;|&#034;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value, pageUrl) {
  const url = new URL(decodeHtml(value), pageUrl);
  if (url.protocol === "http:" && url.hostname === "cke.gov.pl") url.protocol = "https:";
  return url.href;
}

function subjectSlug(url) {
  const match = new URL(url).pathname.match(/\/2026\/([^/]+)\//);
  return match?.[1] ?? "pozostale";
}

export function parseCkePage(html, pageUrl = DEFAULT_PAGE) {
  const files = new Map();
  let subject = null;
  let audience = null;
  let variantCode = null;
  const tokens = html.match(/<p\b[^>]*>[\s\S]*?<\/p>|<a\b[^>]*href=(?:"[^"]*"|'[^']*')[^>]*>[\s\S]*?<\/a>/gi) ?? [];

  for (const token of tokens) {
    if (/^<p\b/i.test(token)) {
      const text = decodeHtml(token);
      const detectedSubject = [...SUBJECTS].find((name) => text === name);
      if (detectedSubject) {
        subject = detectedSubject;
        audience = null;
        variantCode = null;
        continue;
      }
      if (/^Arkusz egzaminacyjny/i.test(text)) {
        audience = text;
        variantCode = text.match(/\(([^()]+)\)\s*$/)?.[1] ?? null;
      }
      continue;
    }

    const href = token.match(/href=(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find(Boolean);
    if (!href || !subject || !audience || !variantCode) continue;
    const url = normalizeUrl(href, pageUrl);
    if (!url.includes("/Arkusze-egzaminacyjne/2026/")) continue;
    const label = decodeHtml(token);
    const usage = { subject, variant_code: variantCode, audience, label };
    const existing = files.get(url);
    if (existing) {
      if (!existing.usages.some((item) => JSON.stringify(item) === JSON.stringify(usage))) existing.usages.push(usage);
      continue;
    }
    files.set(url, {
      url,
      subject_directory: subjectSlug(url),
      file_name: basename(new URL(url).pathname),
      extension: extname(new URL(url).pathname).slice(1).toLowerCase(),
      usages: [usage],
    });
  }

  return [...files.values()].sort((a, b) => a.url.localeCompare(b.url, "pl"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "egzaminio-cke-archiver/1.0 (+https://egzamin.io)" },
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function downloadFile(file, outputRoot) {
  const target = join(outputRoot, file.subject_directory, file.file_name);
  await mkdir(dirname(target), { recursive: true });
  const existing = await readFile(target).catch(() => null);
  if (existing) return { ...file, path: target.slice(ROOT.length + 1), bytes: existing.byteLength, sha256: sha256(existing), status: "existing" };

  const response = await fetchWithRetry(file.url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  if (/text\/html/i.test(contentType)) throw new Error(`${file.url}: zamiast dokumentu zwrócono HTML`);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, buffer);
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return { ...file, path: target.slice(ROOT.length + 1), bytes: buffer.byteLength, sha256: sha256(buffer), content_type: contentType, status: "downloaded" };
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

function parseArguments(args) {
  const options = { page: DEFAULT_PAGE, year: 2026, concurrency: 4 };
  for (const argument of args) {
    if (argument.startsWith("--page=")) options.page = argument.slice("--page=".length);
    else if (argument.startsWith("--year=")) options.year = Number(argument.slice("--year=".length));
    else if (argument.startsWith("--concurrency=")) options.concurrency = Number(argument.slice("--concurrency=".length));
    else throw new Error(`Nieznany argument: ${argument}`);
  }
  if (!Number.isInteger(options.year) || options.year < 2019) throw new Error("Niepoprawny rok.");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) throw new Error("Concurrency musi mieścić się w zakresie 1–8.");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const response = await fetchWithRetry(options.page);
  const html = await response.text();
  const files = parseCkePage(html, options.page);
  if (!files.length) throw new Error("Nie znaleziono dokumentów CKE — struktura strony mogła się zmienić.");

  const outputRoot = join(ROOT, "content", "cke", "sources", String(options.year));
  const catalogPath = join(ROOT, "content", "cke", `source-catalog-${options.year}.json`);
  let completed = 0;
  const downloaded = await runPool(files, options.concurrency, async (file) => {
    const result = await downloadFile(file, outputRoot);
    completed += 1;
    console.log(`[${completed}/${files.length}] ${result.status}: ${result.path}`);
    return result;
  });
  const catalog = {
    schema_version: 1,
    exam_year: options.year,
    source_page: options.page,
    generated_at: new Date().toISOString(),
    unique_files: downloaded.length,
    total_bytes: downloaded.reduce((sum, file) => sum + file.bytes, 0),
    formats: Object.fromEntries([...new Set(downloaded.map((file) => file.extension))].sort().map((extension) => [extension, downloaded.filter((file) => file.extension === extension).length])),
    subjects: [...new Set(downloaded.flatMap((file) => file.usages.map((usage) => usage.subject)))],
    files: downloaded,
  };
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, catalog: catalogPath.slice(ROOT.length + 1), files: catalog.unique_files, bytes: catalog.total_bytes, formats: catalog.formats }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
