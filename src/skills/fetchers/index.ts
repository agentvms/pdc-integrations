import type { BackendClient } from "@pipedream/sdk";
import type { SkillSource } from "../../types.js";
import { fetchGraphQLSchema } from "./graphql.js";
import { fetchOpenAPISchema } from "./openapi.js";

export type FetchSchemaOptions = {
  source: SkillSource;
  client?: BackendClient;
  externalUserId?: string;
  accountId?: string;
};

export async function fetchSchema(opts: FetchSchemaOptions): Promise<unknown> {
  const { source } = opts;

  switch (source.type) {
    case "graphql":
      return fetchGraphQLSchema({
        source,
        client: opts.client,
        externalUserId: opts.externalUserId,
        accountId: opts.accountId,
      });

    case "openapi":
      return fetchOpenAPISchema({ source });

    case "manual":
      throw new Error("Manual skills do not support automatic schema fetching. Place schema.json in the skill directory manually.");
  }
}
