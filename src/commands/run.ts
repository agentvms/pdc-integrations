import { Command } from "commander";
import { parseJsonOpt, executeRun } from "../execute.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";

export function runCommand(): Command {
  const cmd = new Command("run")
    .description("Run an action")
    .argument("<action-key>", "Action component key")
    .option("--account <id>", "Account ID or alias")
    .option("--props <json>", "Configured props as JSON")
    .option("--dynamic-props-id <id>", "Dynamic props ID")
    .option("-i, --interactive", "Configure props interactively")
    .addHelpText(
      "after",
      `
Tip: Use "pdc actions get <action-key>" to discover prop names before running.

Examples:
  # Discover props for an action
  pdc actions get gmail-find-email

  # Run with discovered props
  pdc run gmail-find-email --account my-gmail --props '{"q":"in:inbox","maxResults":5}'
  pdc run gmail-send-email --account my-gmail --props '{"to":["a@b.com"],"subject":"Hi","body":"Hello"}'

  # Use interactive mode if unsure about props
  pdc run gmail-find-email --account my-gmail -i`,
    )
    .action(async (actionKey, cmdOpts) => {
      try {
        const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
        await executeRun(globalOpts, {
          actionKey,
          account: cmdOpts.account,
          props: cmdOpts.props ? parseJsonOpt(cmdOpts.props) : undefined,
          dynamicPropsId: cmdOpts.dynamicPropsId,
          interactive: cmdOpts.interactive,
        });
      } catch (err) {
        handleError(err);
      }
    });

  return cmd;
}
