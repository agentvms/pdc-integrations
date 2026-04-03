import { Command } from "commander";
import { getClient } from "../client.js";
import { outputJson, outputTable, outputKeyValue } from "../output.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";

export function actionsCommand(): Command {
  const actions = new Command("actions").description("Browse available actions");

  actions
    .command("list", { isDefault: true })
    .description("List available actions")
    .option("--app <slug>", "Filter by app slug")
    .option("--query <q>", "Search query")
    .option("--limit <n>", "Max results", parseInt)
    .option("--after <cursor>", "Pagination cursor")
    .action(async (cmdOpts) => {
      try {
        const globalOpts = actions.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const resp = await client.getComponents({
          app: cmdOpts.app,
          q: cmdOpts.query,
          limit: cmdOpts.limit,
          after: cmdOpts.after,
          componentType: "action",
        });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputTable(
          resp.data as unknown as Record<string, unknown>[],
          [
            { key: "key", header: "Key", width: 35 },
            { key: "name", header: "Name", width: 30 },
            { key: "version", header: "Version", width: 10 },
            {
              key: "description",
              header: "Description",
              width: 40,
              formatter: (v) => {
                const s = String(v ?? "");
                return s.length > 80 ? s.slice(0, 77) + "..." : s;
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

  actions
    .command("get")
    .description("Get details for a specific action")
    .argument("<action-key>", "Action component key")
    .action(async (actionKey) => {
      try {
        const globalOpts = actions.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const resp = await client.getComponent({ key: actionKey });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        const data = resp.data;
        outputKeyValue({
          key: data.key,
          name: data.name,
          version: data.version,
          description: data.description,
        });
        if (data.configurable_props?.length) {
          process.stdout.write("\nConfigurable Props:\n");
          for (const prop of data.configurable_props) {
            if (prop.hidden) continue;
            const opt = prop.optional ? " (optional)" : " (required)";
            process.stdout.write(
              `  ${prop.name} [${prop.type}]${opt}${prop.description ? " — " + prop.description : ""}\n`,
            );
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  return actions;
}
