import { Command } from "commander";
import chalk from "chalk";
import {
  getSavedCommand,
  setSavedCommand,
  removeSavedCommand,
  getAllSavedCommands,
} from "../config.js";
import { parseJsonOpt, executeRun, executeDeploy } from "../execute.js";
import { outputJson, outputTable, outputKeyValue } from "../output.js";
import { handleError, PdcError } from "../errors.js";
import type { GlobalOpts, SavedCommand, SavedCommandType } from "../types.js";

export function savedCommand(): Command {
  const cmd = new Command("saved")
    .description("Manage saved command templates")
    .action(async () => {
      try {
        const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
        listSaved(globalOpts);
      } catch (err) {
        handleError(err);
      }
    });

  cmd
    .command("create <name>")
    .description("Save a named command template")
    .requiredOption("--command <type>", "Command type: run or deploy")
    .requiredOption("--action <key>", "Action or trigger component key")
    .option("--account <id>", "Account ID or alias")
    .option("--props <json>", "Configured props as JSON")
    .option("--dynamic-props-id <id>", "Dynamic props ID")
    .option("--webhook-url <url>", "Webhook URL (deploy only)")
    .option("--workflow-id <id>", "Workflow ID (deploy only)")
    .option("--description <text>", "Description of this saved command")
    .action(async (name, opts) => {
      try {
        const commandType = opts.command as string;
        if (commandType !== "run" && commandType !== "deploy") {
          throw new PdcError("--command must be 'run' or 'deploy'");
        }

        const saved: SavedCommand = {
          command: commandType as SavedCommandType,
          componentKey: opts.action,
          createdAt: new Date().toISOString(),
        };

        if (opts.account) saved.account = opts.account;
        if (opts.props) saved.props = parseJsonOpt(opts.props);
        if (opts.dynamicPropsId) saved.dynamicPropsId = opts.dynamicPropsId;
        if (opts.webhookUrl) saved.webhookUrl = opts.webhookUrl;
        if (opts.workflowId) saved.workflowId = opts.workflowId;
        if (opts.description) saved.description = opts.description;

        setSavedCommand(name, saved);
        process.stdout.write(chalk.green(`Saved command '${name}' created.\n`));
      } catch (err) {
        handleError(err);
      }
    });

  cmd
    .command("show <name>")
    .description("Show details of a saved command")
    .action(async (name) => {
      try {
        const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
        const saved = getSavedCommand(name);
        if (!saved) {
          throw new PdcError(`Saved command '${name}' not found.`);
        }

        const display: Record<string, unknown> = {
          name,
          command: saved.command,
          componentKey: saved.componentKey,
          account: saved.account,
          props: saved.props,
          dynamicPropsId: saved.dynamicPropsId,
          description: saved.description,
          createdAt: saved.createdAt,
        };

        if (saved.command === "deploy") {
          display.webhookUrl = saved.webhookUrl;
          display.workflowId = saved.workflowId;
        }

        if (globalOpts.json) {
          outputJson(display);
          return;
        }

        outputKeyValue(display);
      } catch (err) {
        handleError(err);
      }
    });

  cmd
    .command("run <name>")
    .description("Execute a saved command")
    .option("--account <id>", "Override account ID or alias")
    .option("--props <json>", "Override/merge props as JSON")
    .option("--dynamic-props-id <id>", "Override dynamic props ID")
    .option("--webhook-url <url>", "Override webhook URL (deploy only)")
    .option("--workflow-id <id>", "Override workflow ID (deploy only)")
    .action(async (name, opts) => {
      try {
        const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
        const saved = getSavedCommand(name);
        if (!saved) {
          throw new PdcError(`Saved command '${name}' not found.`);
        }

        const runtimeProps = opts.props ? parseJsonOpt(opts.props) : {};
        const mergedProps = { ...saved.props, ...runtimeProps };

        const account = opts.account ?? saved.account;
        const dynamicPropsId = opts.dynamicPropsId ?? saved.dynamicPropsId;

        if (saved.command === "run") {
          await executeRun(globalOpts, {
            actionKey: saved.componentKey,
            account,
            props: mergedProps,
            dynamicPropsId,
          });
        } else {
          const webhookUrl = opts.webhookUrl ?? saved.webhookUrl;
          const workflowId = opts.workflowId ?? saved.workflowId;

          await executeDeploy(globalOpts, {
            triggerKey: saved.componentKey,
            account,
            props: mergedProps,
            dynamicPropsId,
            webhookUrl,
            workflowId,
          });
        }
      } catch (err) {
        handleError(err);
      }
    });

  cmd
    .command("delete <name>")
    .description("Delete a saved command")
    .action(async (name) => {
      try {
        const removed = removeSavedCommand(name);
        if (!removed) {
          throw new PdcError(`Saved command '${name}' not found.`);
        }
        process.stdout.write(chalk.green(`Saved command '${name}' deleted.\n`));
      } catch (err) {
        handleError(err);
      }
    });

  return cmd;
}

function listSaved(globalOpts: GlobalOpts): void {
  const all = getAllSavedCommands();
  const entries = Object.entries(all);

  if (entries.length === 0) {
    process.stdout.write(chalk.dim("No saved commands.\n"));
    return;
  }

  if (globalOpts.json) {
    outputJson(all);
    return;
  }

  const rows = entries.map(([name, s]) => ({
    name,
    command: s.command,
    componentKey: s.componentKey,
    account: s.account ?? "",
    description: s.description ?? "",
  }));

  outputTable(rows, [
    { key: "name", header: "Name" },
    { key: "command", header: "Command" },
    { key: "componentKey", header: "Component" },
    { key: "account", header: "Account" },
    { key: "description", header: "Description" },
  ]);
}
