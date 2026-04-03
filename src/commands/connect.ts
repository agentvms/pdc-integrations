import { Command } from "commander";
import { getClient } from "../client.js";
import { getOrCreateExternalUserId, setAlias } from "../config.js";
import { outputJson, outputKeyValue } from "../output.js";
import { handleError, PdcError } from "../errors.js";
import type { GlobalOpts } from "../types.js";
import chalk from "chalk";

export function connectCommand(): Command {
  const cmd = new Command("connect")
    .description("Connect an app account (OAuth) — prints a URL to open in your browser")
    .argument("[app-slug]", "App to connect (interactive picker if omitted)")
    .option("--name <alias>", "Give this account a nickname for easy reference")
    .option("--timeout <seconds>", "Max time to wait for connection", (v: string) => parseInt(v, 10), 300)
    .option("--poll-interval <seconds>", "Polling interval", (v: string) => parseInt(v, 10), 3)
    .action(async (appSlug, cmdOpts) => {
      try {
        const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
        const client = getClient(globalOpts);
        const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

        // If no app slug, use interactive picker
        if (!appSlug) {
          const { pickApp } = await import("../interactive/app-picker.js");
          appSlug = await pickApp(client);
        }

        // Snapshot existing accounts for this user+app
        const before = await client.getAccounts({
          external_user_id: externalUserId,
          app: appSlug,
        });
        const existingIds = new Set(before.data.map((a) => a.id));

        // Create connect token
        const tokenResp = await client.createConnectToken({
          external_user_id: externalUserId,
        });

        // Append app slug so the connect link goes directly to the right OAuth flow
        const baseUrl = tokenResp.connect_link_url;
        const connectUrl = appSlug
          ? `${baseUrl}&app=${encodeURIComponent(appSlug)}`
          : baseUrl;

        if (globalOpts.json) {
          outputJson({
            connect_link_url: connectUrl,
            token: tokenResp.token,
            expires_at: tokenResp.expires_at,
            external_user_id: externalUserId,
          });
        }

        process.stdout.write(
          `\nConnect your ${chalk.bold(appSlug)} account:\n\n` +
            `  ${chalk.cyan.underline(connectUrl)}\n\n` +
            chalk.dim(`Waiting up to ${cmdOpts.timeout}s for connection...\n\n`),
        );

        // Poll for new account
        const deadline = Date.now() + cmdOpts.timeout * 1000;
        const interval = cmdOpts.pollInterval * 1000;

        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, interval));

          const after = await client.getAccounts({
            external_user_id: externalUserId,
            app: appSlug,
          });

          const newAccount = after.data.find((a) => !existingIds.has(a.id));

          if (newAccount) {
            // Save alias if --name was provided
            if (cmdOpts.name) {
              setAlias(cmdOpts.name, newAccount.id);
            }

            if (globalOpts.json) {
              outputJson({
                ...newAccount,
                ...(cmdOpts.name ? { alias: cmdOpts.name } : {}),
              });
              return;
            }

            process.stdout.write(chalk.green("Account connected!\n\n"));
            const display: Record<string, unknown> = {
              ...(newAccount as unknown as Record<string, unknown>),
            };
            const displayKeys = ["id", "name", "external_id", "healthy", "created_at"];
            if (cmdOpts.name) {
              display.alias = cmdOpts.name;
              displayKeys.unshift("alias");
            }
            outputKeyValue(display, displayKeys);
            return;
          }
        }

        throw new PdcError(
          `Timed out after ${cmdOpts.timeout}s waiting for account connection. ` +
            `You can still complete the flow at: ${connectUrl}`,
        );
      } catch (err) {
        handleError(err);
      }
    });

  return cmd;
}
