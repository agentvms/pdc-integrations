import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { getConfigDir } from "../config.js";
import type { SkillManifest } from "../types.js";

const SKILLS_DIR_NAME = "skills";

export function getSkillsDir(): string {
  return join(getConfigDir(), SKILLS_DIR_NAME);
}

export function getSkillDir(name: string): string {
  return join(getSkillsDir(), name);
}

function getManifestPath(name: string): string {
  return join(getSkillDir(name), "skill.json");
}

function getSchemaPath(name: string): string {
  return join(getSkillDir(name), "schema.json");
}

export function skillExists(name: string): boolean {
  return existsSync(getManifestPath(name));
}

export function readManifest(name: string): SkillManifest | null {
  const path = getManifestPath(name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function writeManifest(name: string, manifest: SkillManifest): void {
  const dir = getSkillDir(name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(getManifestPath(name), JSON.stringify(manifest, null, 2) + "\n");
}

export function readSchema(name: string): unknown | null {
  const path = getSchemaPath(name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function writeSchema(name: string, schema: unknown): { sizeBytes: number; checksum: string } {
  const dir = getSkillDir(name);
  mkdirSync(dir, { recursive: true });
  const content = JSON.stringify(schema, null, 2) + "\n";
  writeFileSync(getSchemaPath(name), content);
  const sizeBytes = Buffer.byteLength(content, "utf-8");
  const checksum = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return { sizeBytes, checksum };
}

export function removeSkill(name: string): boolean {
  const dir = getSkillDir(name);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}

export function listInstalledSkills(): SkillManifest[] {
  const dir = getSkillsDir();
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const manifests: SkillManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifest = readManifest(entry.name);
    if (manifest) manifests.push(manifest);
  }
  return manifests;
}
