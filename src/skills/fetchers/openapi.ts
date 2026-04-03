import type { OpenAPISource } from "../../types.js";

export type OpenAPIFetchOptions = {
  source: OpenAPISource;
};

export async function fetchOpenAPISchema(opts: OpenAPIFetchOptions): Promise<unknown> {
  const { source } = opts;

  if (!source.specUrl) {
    throw new Error("OpenAPI source requires a specUrl");
  }

  const resp = await fetch(source.specUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${resp.status} ${resp.statusText}`);
  }

  return resp.json();
}
