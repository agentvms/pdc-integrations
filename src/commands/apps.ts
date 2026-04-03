import { Command } from "commander";
import { getClient } from "../client.js";
import { outputJson, outputTable, outputKeyValue } from "../output.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";

export function appsCommand(): Command {
  const apps = new Command("apps").description("Browse available apps");

  apps
    .command("list", { isDefault: true })
    .description("List available apps")
    .option("--query <q>", "Search query")
    .option("--limit <n>", "Max results", parseInt)
    .option("--after <cursor>", "Pagination cursor")
    .option("--has-actions", "Only apps with actions")
    .option("--has-triggers", "Only apps with triggers")
    .action(async (cmdOpts) => {
      try {
        const globalOpts = apps.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const resp = await client.getApps({
          q: cmdOpts.query,
          limit: cmdOpts.limit,
          after: cmdOpts.after,
          hasActions: cmdOpts.hasActions,
          hasTriggers: cmdOpts.hasTriggers,
        });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputTable(
          resp.data as unknown as Record<string, unknown>[],
          [
            { key: "name_slug", header: "Slug", width: 25 },
            { key: "name", header: "Name", width: 25 },
            { key: "auth_type", header: "Auth", width: 10 },
            {
              key: "categories",
              header: "Categories",
              width: 30,
              formatter: (v) =>
                Array.isArray(v) ? v.join(", ") : String(v ?? ""),
            },
          ],
          {
            count: resp.page_info.count,
            total: resp.page_info.total_count,
            endCursor: resp.page_info.end_cursor,
          },
        );
      } catch (err) {
        handleError(err);
      }
    });

  apps
    .command("get")
    .description("Get details for a specific app")
    .argument("<app-slug>", "App name slug (e.g. slack, github)")
    .action(async (appSlug) => {
      try {
        const globalOpts = apps.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const resp = await client.getApp(appSlug);

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputKeyValue(resp.data as unknown as Record<string, unknown>, [
          "name_slug",
          "name",
          "description",
          "auth_type",
          "categories",
          "img_src",
        ]);
      } catch (err) {
        handleError(err);
      }
    });

  return apps;
}
