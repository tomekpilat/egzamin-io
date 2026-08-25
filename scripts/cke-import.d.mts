export type ImportQuestion = Record<string, unknown> & { source_checksum?: string };
export type ImportManifest = Record<string, unknown> & { questions: ImportQuestion[] };
export function canonicalJson(value: unknown): string;
export function sha256(value: string | Uint8Array): string;
export function prepareManifest(input: ImportManifest): { manifest: ImportManifest; checksum: string };
export function validateManifest(input: unknown): { valid: boolean; errors: string[] };
export function stageManifest(input: ImportManifest, env?: Record<string, string | undefined>): Promise<{ checksum: string; result: unknown }>;
