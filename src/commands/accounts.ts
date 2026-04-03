import { Command } from "commander";
import { getClient } from "../client.js";
import { getOrCreateExternalUserId, setAlias, removeAlias, getAliases, resolveAccount } from "../config.js";
import { outputJson, outputTable, outputKeyValue } from "../output.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";
import chalk from "chalk";

export function accountsCommand(): Command {
  const accounts = new Command("accounts").description(
    "Manage connected accounts",
  );

  accounts
    .command("list", { isDefault: true })
    .description("List your connected accounts")
    .option("--app <slug>", "Filter by app slug")
    .option("--include-credentials", "Include account credentials")
    .option("--limit <n>", "Max results", parseInt)
    .option("--after <cursor>", "Pagination cursor")
    .action(async (cmdOpts) => {
      try {
        const globalOpts = accounts.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

        const resp = await client.getAccounts({
          app: cmdOpts.app,
          external_user_id: externalUserId,
          include_credentials: cmdOpts.includeCredentials,
          limit: cmdOpts.limit,
          after: cmdOpts.after,
        });

        // Build a reverse lookup: accountId -> alias name
        const aliases = getAliases();
        const aliasById: Record<string, string> = {};
        for (const [name, id] of Object.entries(aliases)) {
          aliasById[id] = name;
        }

        if (globalOpts.json) {
          const data = resp.data.map((a) => ({
            ...a,
            ...(aliasById[a.id] ? { alias: aliasById[a.id] } : {}),
          }));
          outputJson({ ...resp, data });
          return;
        }

        // Inject alias into row data for display
        const rows = resp.data.map((a) => ({
          ...(a as unknown as Record<string, unknown>),
          alias: aliasById[a.id] ?? "",
        }));

        outputTable(
          rows,
          [
            { key: "id", header: "ID", width: 15 },
            { key: "alias", header: "Alias", width: 18, formatter: (v) => v ? chalk.cyan(String(v)) : chalk.dim("—") },
            { key: "name", header: "Name", width: 20 },
            {
              key: "app",
              header: "App",
              width: 15,
              formatter: (v: unknown) => {
                const app = v as Record<string, unknown> | null;
                return app?.name_slug ? String(app.name_slug) : "—";
              },
            },
            {
              key: "healthy",
              header: "Healthy",
              width: 10,
              formatter: (v) => (v ? chalk.green("yes") : chalk.red("no")),
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

  accounts
    .command("get")
    .description("Get details for a specific account")
    .argument("<account-id>", "Account ID or alias")
    .option("--include-credentials", "Include account credentials")
    .action(async (accountIdOrAlias, cmdOpts) => {
      try {
        const globalOpts = accounts.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const accountId = resolveAccount(accountIdOrAlias);
        const resp = await client.getAccountById(accountId, {
          include_credentials: cmdOpts.includeCredentials,
        });

        if (globalOpts.json) {
          outputJson(resp);
          return;
        }

        outputKeyValue(resp as unknown as Record<string, unknown>, [
          "id",
          "name",
          "external_id",
          "healthy",
          "dead",
          "created_at",
          "updated_at",
        ]);
      } catch (err) {
        handleError(err);
      }
    });

  accounts
    .command("delete")
    .description("Delete a connected account")
    .argument("<account-id>", "Account ID or alias")
    .action(async (accountIdOrAlias) => {
      try {
        const globalOpts = accounts.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const accountId = resolveAccount(accountIdOrAlias);
        await client.deleteAccount(accountId);

        if (globalOpts.json) {
          outputJson({ deleted: true, id: accountId });
          return;
        }

        process.stdout.write(chalk.green(`Account ${accountId} deleted.\n`));
      } catch (err) {
        handleError(err);
      }
    });

  accounts
    .command("alias")
    .description("Give an account a nickname")
    .argument("<name>", "Alias name (e.g. work-gmail)")
    .argument("<account-id>", "Account ID (e.g. apn_xxx)")
    .action(async (name, accountId) => {
      try {
        const globalOpts = accounts.optsWithGlobals<GlobalOpts>();
        setAlias(name, accountId);

        if (globalOpts.json) {
          outputJson({ alias: name, account_id: accountId });
          return;
        }

        process.stdout.write(
          chalk.green(`Alias ${chalk.cyan(name)} -> ${accountId}\n`),
        );
      } catch (err) {
        handleError(err);
      }
    });

  accounts
    .command("unalias")
    .description("Remove an account nickname")
    .argument("<name>", "Alias name to remove")
    .action(async (name) => {
      try {
        const globalOpts = accounts.optsWithGlobals<GlobalOpts>();
        const removed = removeAlias(name);

        if (globalOpts.json) {
          outputJson({ removed, alias: name });
          return;
        }

        if (removed) {
          process.stdout.write(chalk.green(`Alias ${chalk.cyan(name)} removed.\n`));
        } else {
          process.stdout.write(chalk.yellow(`Alias "${name}" not found.\n`));
        }
      } catch (err) {
        handleError(err);
      }
    });

  return accounts;
}
