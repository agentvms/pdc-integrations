#!/usr/bin/env bun
import { Command } from "commander";
import { connectCommand } from "./commands/connect.js";
import { accountsCommand } from "./commands/accounts.js";
import { appsCommand } from "./commands/apps.js";
import { actionsCommand } from "./commands/actions.js";
import { runCommand } from "./commands/run.js";
import { deployCommand } from "./commands/deploy.js";
import { triggersCommand } from "./commands/triggers.js";
import { proxyCommand } from "./commands/proxy.js";
import { configCommand } from "./commands/config-cmd.js";
import { savedCommand } from "./commands/saved.js";
import { skillCommand } from "./commands/skill.js";
import { handleError } from "./errors.js";

const program = new Command();

program
  .name("pdc")
  .description("Pipedream Connect CLI — your personal integration toolkit")
  .version("0.2.0")
  .option("--json", "Output raw JSON")
  .option("-i, --interactive", "Enable interactive prompts")
  .option("--profile <name>", "Named config profile");

program.addCommand(connectCommand());
program.addCommand(accountsCommand());
program.addCommand(appsCommand());
program.addCommand(actionsCommand());
program.addCommand(runCommand());
program.addCommand(deployCommand());
program.addCommand(triggersCommand());
program.addCommand(proxyCommand());
program.addCommand(configCommand());
program.addCommand(savedCommand());
program.addCommand(skillCommand());

program.parseAsync(process.argv).catch(handleError);
