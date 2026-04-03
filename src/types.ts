export type GlobalOpts = {
  json?: boolean;
  interactive?: boolean;
  profile?: string;
};

export type PdcConfig = {
  clientId?: string;
  clientSecret?: string;
  projectId?: string;
  apiHost?: string;
};

export type ConfigProfile = {
  [key: string]: string;
};

export type SavedCommandType = "run" | "deploy";

export type SavedCommand = {
  command: SavedCommandType;
  componentKey: string;
  account?: string;
  props?: Record<string, unknown>;
  dynamicPropsId?: string;
  webhookUrl?: string;
  workflowId?: string;
  description?: string;
  createdAt: string;
};

export type ConfigFile = {
  defaultProfile?: string;
  profiles?: Record<string, ConfigProfile>;
  aliases?: Record<string, string>;
  saved?: Record<string, SavedCommand>;
};

// --- Skill types ---

export type SkillApiType = "graphql" | "openapi" | "manual";

export type GraphQLSource = {
  type: "graphql";
  endpoint: string;
  headers?: Record<string, string>;
};

export type OpenAPISource = {
  type: "openapi";
  specUrl?: string;
  specPath?: string;
};

export type ManualSource = {
  type: "manual";
  instructions?: string;
};

export type SkillSource = GraphQLSource | OpenAPISource | ManualSource;

export type SkillManifest = {
  name: string;
  appSlug: string;
  version: string;
  description?: string;
  apiType: SkillApiType;
  source: SkillSource;
  account?: string;
  schema?: {
    fetchedAt: string;
    sizeBytes: number;
    endpointCount: number;
    checksum: string;
  };
  installedAt: string;
  updatedAt: string;
};

export type SkillRegistryEntry = {
  name: string;
  appSlug: string;
  description: string;
  apiType: SkillApiType;
  source: SkillSource;
};
