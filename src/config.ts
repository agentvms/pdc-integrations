import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import { ConfigError } from "./errors.js";
import type { PdcConfig, ConfigFile, GlobalOpts, SavedCommand } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "pdc");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

function readConfigFile(): ConfigFile {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function writeConfigFile(config: ConfigFile): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

function getProfileConfig(profileName?: string): Record<string, string> {
  const file = readConfigFile();
  const name = profileName || file.defaultProfile || "default";
  return file.profiles?.[name] ?? {};
}

export function resolveConfig(opts: GlobalOpts): PdcConfig {
  const profile = getProfileConfig(opts.profile);

  const clientId =
    process.env.PIPEDREAM_CLIENT_ID || profile.clientId;
  const clientSecret =
    process.env.PIPEDREAM_CLIENT_SECRET || profile.clientSecret;
  const projectId =
    process.env.PIPEDREAM_PROJECT_ID || profile.projectId;
  const apiHost =
    process.env.PIPEDREAM_API_HOST || profile.apiHost;

  return { clientId, clientSecret, projectId, apiHost };
}

export function requireConfig(opts: GlobalOpts): Required<Pick<PdcConfig, "clientId" | "clientSecret" | "projectId">> & PdcConfig {
  const config = resolveConfig(opts);

  if (!config.clientId) {
    throw new ConfigError(
      "Missing PIPEDREAM_CLIENT_ID. Set it in .env, environment, or run 'pdc config init'.",
    );
  }
  if (!config.clientSecret) {
    throw new ConfigError(
      "Missing PIPEDREAM_CLIENT_SECRET. Set it in .env, environment, or run 'pdc config init'.",
    );
  }
  if (!config.projectId) {
    throw new ConfigError(
      "Missing PIPEDREAM_PROJECT_ID. Set it in .env, environment, or run 'pdc config init'.",
    );
  }

  return config as Required<Pick<PdcConfig, "clientId" | "clientSecret" | "projectId">> & PdcConfig;
}

// --- External User ID management ---

export function getOrCreateExternalUserId(profileName?: string): string {
  const profile = getProfileConfig(profileName);
  if (profile.externalUserId) {
    return profile.externalUserId;
  }

  // Auto-generate and persist
  const id = `pdc-${randomUUID()}`;
  setConfigValue("externalUserId", id, profileName);
  return id;
}

export function getExternalUserId(profileName?: string): string | undefined {
  const profile = getProfileConfig(profileName);
  return profile.externalUserId;
}

// --- Config file helpers ---

export function getConfigFileRaw(): ConfigFile {
  return readConfigFile();
}

export function setConfigValue(key: string, value: string, profileName?: string): void {
  const file = readConfigFile();
  const name = profileName || file.defaultProfile || "default";
  if (!file.profiles) file.profiles = {};
  if (!file.profiles[name]) file.profiles[name] = {};
  file.profiles[name][key] = value;
  writeConfigFile(file);
}

export function getConfigValue(key: string, profileName?: string): string | undefined {
  const profile = getProfileConfig(profileName);
  return profile[key];
}

// --- Account alias management ---

export function setAlias(name: string, accountId: string): void {
  const file = readConfigFile();
  if (!file.aliases) file.aliases = {};
  file.aliases[name] = accountId;
  writeConfigFile(file);
}

export function removeAlias(name: string): boolean {
  const file = readConfigFile();
  if (!file.aliases || !(name in file.aliases)) return false;
  delete file.aliases[name];
  writeConfigFile(file);
  return true;
}

export function getAliases(): Record<string, string> {
  const file = readConfigFile();
  return file.aliases ?? {};
}

export function resolveAccount(nameOrId: string): string {
  const file = readConfigFile();
  return file.aliases?.[nameOrId] ?? nameOrId;
}

// --- Saved command management ---

export function setSavedCommand(name: string, command: SavedCommand): void {
  const file = readConfigFile();
  if (!file.saved) file.saved = {};
  file.saved[name] = command;
  writeConfigFile(file);
}

export function getSavedCommand(name: string): SavedCommand | undefined {
  const file = readConfigFile();
  return file.saved?.[name];
}

export function removeSavedCommand(name: string): boolean {
  const file = readConfigFile();
  if (!file.saved || !(name in file.saved)) return false;
  delete file.saved[name];
  writeConfigFile(file);
  return true;
}

export function getAllSavedCommands(): Record<string, SavedCommand> {
  const file = readConfigFile();
  return file.saved ?? {};
}
