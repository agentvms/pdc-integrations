import { Command } from "commander";
import { parseJsonOpt, executeDeploy } from "../execute.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";

export function deployCommand(): Command {
  const cmd = new Command("deploy")
    .description("Deploy a trigger")
    .argument("<trigger-key>", "Trigger component key")
    .option("--account <id>", "Account ID or alias")
    .option("--props <json>", "Configured props as JSON")
    .option("--dynamic-props-id <id>", "Dynamic props ID")
    .option("--webhook-url <url>", "Webhook URL for events")
    .option("--workflow-id <id>", "Workflow ID for events")
    .option("-i, --interactive", "Configure props interactively")
    .action(async (triggerKey, cmdOpts) => {
      try {
        const globalOpts = cmd.optsWithGlobals<GlobalOpts>();
        await executeDeploy(globalOpts, {
          triggerKey,
          account: cmdOpts.account,
          props: cmdOpts.props ? parseJsonOpt(cmdOpts.props) : undefined,
          dynamicPropsId: cmdOpts.dynamicPropsId,
          webhookUrl: cmdOpts.webhookUrl,
          workflowId: cmdOpts.workflowId,
          interactive: cmdOpts.interactive,
        });
      } catch (err) {
        handleError(err);
      }
    });

  return cmd;
}
