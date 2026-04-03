import { Command } from "commander";
import { getClient } from "../client.js";
import { getOrCreateExternalUserId } from "../config.js";
import { outputJson, outputTable, outputKeyValue } from "../output.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";
import chalk from "chalk";

export function triggersCommand(): Command {
  const triggers = new Command("triggers").description(
    "Manage deployed triggers",
  );

  // Default action: list deployed triggers
  triggers
    .command("list", { isDefault: true })
    .description("List your deployed triggers")
    .option("--limit <n>", "Max results", parseInt)
    .option("--after <cursor>", "Pagination cursor")
    .action(async (cmdOpts) => {
      try {
        const globalOpts = triggers.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

        const resp = await client.getTriggers({
          externalUserId,
          limit: cmdOpts.limit,
          after: cmdOpts.after,
        });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputTable(
          resp.data as unknown as Record<string, unknown>[],
          [
            { key: "id", header: "ID", width: 15 },
            { key: "name", header: "Name", width: 25 },
            {
              key: "active",
              header: "Active",
              width: 10,
              formatter: (v) => (v ? chalk.green("yes") : chalk.red("no")),
            },
            {
              key: "created_at",
              header: "Created",
              width: 20,
              formatter: (v) => {
                if (typeof v === "number") return new Date(v).toISOString();
                return String(v ?? "");
              },
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

  triggers
    .command("get")
    .description("Get details for a deployed trigger")
    .argument("<id>", "Deployed trigger ID")
    .action(async (id) => {
      try {
        const globalOpts = triggers.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

        const resp = await client.getTrigger({
          id,
          externalUserId,
        });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputKeyValue(resp.data as unknown as Record<string, unknown>, [
          "id",
          "name",
          "active",
          "component_id",
          "created_at",
          "updated_at",
          "endpoint_url",
        ]);
      } catch (err) {
        handleError(err);
      }
    });

  triggers
    .command("update")
    .description("Update a deployed trigger")
    .argument("<id>", "Deployed trigger ID")
    .option("--active <bool>", "Set active state", (v) => v === "true")
    .option("--name <name>", "New name")
    .action(async (id, cmdOpts) => {
      try {
        const globalOpts = triggers.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

        const resp = await client.updateTrigger({
          id,
          externalUserId,
          ...(cmdOpts.active !== undefined ? { active: cmdOpts.active } : {}),
          ...(cmdOpts.name ? { name: cmdOpts.name } : {}),
        });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputKeyValue(resp.data as unknown as Record<string, unknown>, [
          "id",
          "name",
          "active",
          "updated_at",
        ]);
      } catch (err) {
        handleError(err);
      }
    });

  triggers
    .command("delete")
    .description("Delete a deployed trigger")
    .argument("<id>", "Deployed trigger ID")
    .option("--force", "Ignore hook errors during deletion")
    .action(async (id, cmdOpts) => {
      try {
        const globalOpts = triggers.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

        await client.deleteTrigger({
          id,
          externalUserId,
          ...(cmdOpts.force ? { ignoreHookErrors: true } : {}),
        });

        if (globalOpts.json) {
          outputJson({ deleted: true, id });
          return;
        }

        process.stdout.write(
          chalk.green(`Trigger ${id} deleted.\n`),
        );
      } catch (err) {
        handleError(err);
      }
    });

  return triggers;
}
