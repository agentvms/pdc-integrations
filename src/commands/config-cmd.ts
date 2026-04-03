import { Command } from "commander";
import {
  getConfigFilePath,
  getConfigFileRaw,
  setConfigValue,
  getConfigValue,
  writeConfigFile,
} from "../config.js";
import { outputJson, outputKeyValue } from "../output.js";
import { handleError } from "../errors.js";
import type { GlobalOpts } from "../types.js";
import chalk from "chalk";

export function configCommand(): Command {
  const config = new Command("config").description(
    "Manage pdc configuration",
  );

  config
    .command("init")
    .description("Initialize configuration interactively")
    .action(async () => {
      try {
        const globalOpts = config.optsWithGlobals<GlobalOpts>();
        const profileName = globalOpts.profile || "default";

        const { input } = await import("@inquirer/prompts");

        const clientId = await input({
          message: "Pipedream Client ID:",
        });
        const clientSecret = await input({
          message: "Pipedream Client Secret:",
        });
        const projectId = await input({
          message: "Project ID:",
        });
        const environment = await input({
          message: "Environment (development/production):",
          default: "development",
        });

        const file = getConfigFileRaw();
        if (!file.profiles) file.profiles = {};
        file.profiles[profileName] = {
          clientId,
          clientSecret,
          projectId,
          environment,
        };
        if (!file.defaultProfile) file.defaultProfile = profileName;
        writeConfigFile(file);

        process.stdout.write(
          chalk.green(
            `\nConfiguration saved to ${getConfigFilePath()} (profile: ${profileName})\n`,
          ),
        );
      } catch (err) {
        handleError(err);
      }
    });

  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Config key (clientId, clientSecret, projectId, environment)")
    .argument("<value>", "Config value")
    .action(async (key, value) => {
      try {
        const globalOpts = config.optsWithGlobals<GlobalOpts>();
        setConfigValue(key, value, globalOpts.profile);
        process.stdout.write(
          chalk.green(`Set ${key} in profile ${globalOpts.profile || "default"}\n`),
        );
      } catch (err) {
        handleError(err);
      }
    });

  config
    .command("get")
    .description("Get a configuration value")
    .argument("<key>", "Config key")
    .action(async (key) => {
      try {
        const globalOpts = config.optsWithGlobals<GlobalOpts>();
        const value = getConfigValue(key, globalOpts.profile);
        if (globalOpts.json) {
          outputJson({ [key]: value ?? null });
          return;
        }
        process.stdout.write(`${value ?? chalk.dim("(not set)")}\n`);
      } catch (err) {
        handleError(err);
      }
    });

  config
    .command("list")
    .description("List all configuration values")
    .action(async () => {
      try {
        const globalOpts = config.optsWithGlobals<GlobalOpts>();
        const file = getConfigFileRaw();

        if (globalOpts.json) {
          outputJson(file);
          return;
        }

        process.stdout.write(`Config file: ${getConfigFilePath()}\n\n`);
        if (!file.profiles || Object.keys(file.profiles).length === 0) {
          process.stdout.write(
            chalk.dim("No profiles configured. Run 'pdc config init' to get started.\n"),
          );
          return;
        }

        for (const [name, profile] of Object.entries(file.profiles)) {
          const isDefault = name === (file.defaultProfile || "default");
          process.stdout.write(
            chalk.bold(`[${name}]`) +
              (isDefault ? chalk.green(" (default)") : "") +
              "\n",
          );
          outputKeyValue(profile as Record<string, unknown>);
          process.stdout.write("\n");
        }
      } catch (err) {
        handleError(err);
      }
    });

  return config;
}
