import { createBackendClient, type BackendClient } from "@pipedream/sdk";
import { requireConfig } from "./config.js";
import type { GlobalOpts } from "./types.js";

let cachedClient: BackendClient | null = null;

export function getClient(opts: GlobalOpts): BackendClient {
  if (cachedClient) return cachedClient;

  const config = requireConfig(opts);

  cachedClient = createBackendClient({
    credentials: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    },
    projectId: config.projectId,
    environment: "development",
    ...(config.apiHost ? { apiHost: config.apiHost } : {}),
  });

  return cachedClient;
}

export function resetClient(): void {
  cachedClient = null;
}
