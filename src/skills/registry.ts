import type { SkillRegistryEntry } from "../types.js";

export const SKILL_REGISTRY: Record<string, SkillRegistryEntry> = {
  linear: {
    name: "linear",
    appSlug: "linear_app",
    description: "Linear project management — GraphQL API with issues, projects, teams, cycles",
    apiType: "graphql",
    source: {
      type: "graphql",
      endpoint: "https://api.linear.app/graphql",
    },
  },
  github: {
    name: "github",
    appSlug: "github",
    description: "GitHub — REST API for repos, issues, PRs, actions, and more",
    apiType: "openapi",
    source: {
      type: "openapi",
      specUrl: "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
    },
  },
  slack: {
    name: "slack",
    appSlug: "slack",
    description: "Slack — Web API for messaging, channels, users, and workspace management",
    apiType: "openapi",
    source: {
      type: "openapi",
      specUrl: "https://raw.githubusercontent.com/slackapi/slack-api-specs/master/web-api/slack_web_openapi_v2.json",
    },
  },
};

export function getRegistryEntry(name: string): SkillRegistryEntry | undefined {
  return SKILL_REGISTRY[name];
}

export function listRegistryEntries(): SkillRegistryEntry[] {
  return Object.values(SKILL_REGISTRY);
}
