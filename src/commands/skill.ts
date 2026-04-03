import { Command } from "commander";
import chalk from "chalk";
import { getClient } from "../client.js";
import { getOrCreateExternalUserId, resolveAccount } from "../config.js";
import { outputJson, outputKeyValue, outputTable } from "../output.js";
import { handleError, PdcError } from "../errors.js";
import {
  listInstalledSkills,
  readManifest,
  writeManifest,
  readSchema,
  writeSchema,
  removeSkill,
  skillExists,
} from "../skills/config.js";
import { getRegistryEntry, listRegistryEntries, SKILL_REGISTRY } from "../skills/registry.js";
import { fetchSchema } from "../skills/fetchers/index.js";
import { summarizeSchema, searchSchema, filterSchema } from "../skills/schema.js";
import type { GlobalOpts, SkillManifest, SkillSource, SkillApiType } from "../types.js";

function countEndpoints(schema: unknown): number {
  const summary = summarizeSchema(schema);
  return summary.totalEndpoints;
}

async function doInstall(
  name: string,
  cmdOpts: Record<string, string | boolean | undefined>,
  globalOpts: GlobalOpts,
): Promise<SkillManifest> {
  const force = !!cmdOpts.force;

  if (skillExists(name) && !force) {
    throw new PdcError(`Skill "${name}" is already installed. Use --force to overwrite.`);
  }

  // Resolve source: from registry or custom options
  const registryEntry = getRegistryEntry(name);
  let appSlug: string;
  let description: string | undefined;
  let apiType: SkillApiType;
  let source: SkillSource;

  if (registryEntry && !cmdOpts.type) {
    appSlug = registryEntry.appSlug;
    description = registryEntry.description;
    apiType = registryEntry.apiType;
    source = registryEntry.source;
  } else {
    // Custom skill
    apiType = (cmdOpts.type as SkillApiType) ?? "manual";
    appSlug = (cmdOpts.app as string) ?? name;

    if (apiType === "graphql") {
      if (!cmdOpts.endpoint) {
        throw new PdcError("--endpoint is required for custom GraphQL skills");
      }
      source = { type: "graphql", endpoint: cmdOpts.endpoint as string };
    } else if (apiType === "openapi") {
      if (!cmdOpts.specUrl) {
        throw new PdcError("--spec-url is required for custom OpenAPI skills");
      }
      source = { type: "openapi", specUrl: cmdOpts.specUrl as string };
    } else {
      source = { type: "manual" };
    }
  }

  // Override account if provided
  const account = cmdOpts.account ? resolveAccount(cmdOpts.account as string) : undefined;

  const now = new Date().toISOString();
  const manifest: SkillManifest = {
    name,
    appSlug,
    version: "1.0.0",
    description,
    apiType,
    source,
    account,
    installedAt: now,
    updatedAt: now,
  };

  // Fetch schema if applicable
  if (source.type !== "manual") {
    process.stderr.write(`Fetching ${apiType} schema for ${name}...\n`);

    let client, externalUserId;
    if (account) {
      client = getClient(globalOpts);
      externalUserId = getOrCreateExternalUserId(globalOpts.profile);
    }

    const schema = await fetchSchema({
      source,
      client,
      externalUserId,
      accountId: account,
    });

    const { sizeBytes, checksum } = writeSchema(name, schema);
    const endpointCount = countEndpoints(schema);

    manifest.schema = {
      fetchedAt: now,
      sizeBytes,
      endpointCount,
      checksum,
    };

    process.stderr.write(
      `Schema cached: ${endpointCount} endpoints, ${(sizeBytes / 1024).toFixed(0)}KB\n`,
    );
  }

  writeManifest(name, manifest);
  return manifest;
}

export function skillCommand(): Command {
  const skill = new Command("skill").description(
    "Manage API skills — cached schema knowledge for pdc proxy",
  );

  // Default action: list installed skills
  skill
    .command("list", { isDefault: true })
    .description("List installed skills")
    .action(async (_cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
        const installed = listInstalledSkills();
        const registry = listRegistryEntries();

        if (globalOpts.json) {
          outputJson({ installed, registry: Object.keys(SKILL_REGISTRY) });
          return;
        }

        if (installed.length === 0) {
          process.stdout.write(chalk.dim("No skills installed.\n"));
          process.stdout.write(
            chalk.dim(`Available: ${registry.map((r) => r.name).join(", ")}\n`),
          );
          process.stdout.write(
            chalk.dim(`Install with: pdc skill install <name>\n`),
          );
          return;
        }

        outputTable(
          installed.map((s) => ({
            name: s.name,
            apiType: s.apiType,
            endpoints: s.schema?.endpointCount ?? "—",
            size: s.schema ? `${(s.schema.sizeBytes / 1024).toFixed(0)}KB` : "—",
            updatedAt: s.updatedAt.split("T")[0],
          })),
          [
            { key: "name", header: "Name" },
            { key: "apiType", header: "Type" },
            { key: "endpoints", header: "Endpoints" },
            { key: "size", header: "Size" },
            { key: "updatedAt", header: "Updated" },
          ],
        );
      } catch (err) {
        handleError(err);
      }
    });

  // Install
  skill
    .command("install")
    .description("Install a skill from the registry or custom source")
    .argument("<name>", "Skill name (e.g., linear, github) or custom name")
    .option("--account <id>", "Bind to a connected account for auth")
    .option("--app <slug>", "Pipedream app slug (custom skills)")
    .option("--type <type>", "API type: graphql, openapi, or manual")
    .option("--endpoint <url>", "GraphQL endpoint URL (custom graphql)")
    .option("--spec-url <url>", "OpenAPI spec URL (custom openapi)")
    .option("--force", "Overwrite existing skill")
    .action(async (name, cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
        const manifest = await doInstall(name, cmdOpts, globalOpts);

        if (globalOpts.json) {
          outputJson(manifest);
          return;
        }

        process.stdout.write(
          chalk.green(`Skill "${name}" installed successfully.\n`),
        );
      } catch (err) {
        handleError(err);
      }
    });

  // Info
  skill
    .command("info")
    .description("Show skill manifest and schema summary")
    .argument("<name>", "Skill name")
    .action(async (name, _cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
        const manifest = readManifest(name);
        if (!manifest) {
          throw new PdcError(`Skill "${name}" is not installed.`);
        }

        if (globalOpts.json) {
          const schema = readSchema(name);
          const summary = schema ? summarizeSchema(schema) : null;
          outputJson({ manifest, summary });
          return;
        }

        outputKeyValue({
          name: manifest.name,
          appSlug: manifest.appSlug,
          apiType: manifest.apiType,
          description: manifest.description,
          account: manifest.account,
          source: manifest.source.type === "graphql"
            ? manifest.source.endpoint
            : manifest.source.type === "openapi"
              ? manifest.source.specUrl
              : manifest.source.type,
          installedAt: manifest.installedAt,
          updatedAt: manifest.updatedAt,
        });

        if (manifest.schema) {
          process.stdout.write("\n");
          outputKeyValue({
            schemaFetchedAt: manifest.schema.fetchedAt,
            schemaSize: `${(manifest.schema.sizeBytes / 1024).toFixed(0)}KB`,
            endpoints: manifest.schema.endpointCount,
            checksum: manifest.schema.checksum,
          });
        }

        // Show a brief summary of the schema
        const schema = readSchema(name);
        if (schema) {
          const summary = summarizeSchema(schema);
          process.stdout.write("\n");
          if (summary.apiType === "graphql") {
            process.stdout.write(
              chalk.dim(
                `${summary.queries?.length ?? 0} queries, ` +
                `${summary.mutations?.length ?? 0} mutations, ` +
                `${summary.totalTypes} types\n`,
              ),
            );
          } else if (summary.apiType === "openapi") {
            process.stdout.write(
              chalk.dim(
                `${summary.totalEndpoints} endpoints, ${summary.totalTypes} schemas\n`,
              ),
            );
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Refresh
  skill
    .command("refresh")
    .description("Re-fetch the schema for an installed skill")
    .argument("<name>", "Skill name")
    .option("--account <id>", "Override account for this fetch")
    .action(async (name, cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
        const manifest = readManifest(name);
        if (!manifest) {
          throw new PdcError(`Skill "${name}" is not installed.`);
        }

        if (manifest.source.type === "manual") {
          throw new PdcError("Manual skills do not support automatic refresh.");
        }

        const account = cmdOpts.account
          ? resolveAccount(cmdOpts.account)
          : manifest.account;

        let client, externalUserId;
        if (account) {
          client = getClient(globalOpts);
          externalUserId = getOrCreateExternalUserId(globalOpts.profile);
        }

        process.stderr.write(`Refreshing schema for ${name}...\n`);

        const schema = await fetchSchema({
          source: manifest.source,
          client,
          externalUserId,
          accountId: account,
        });

        const { sizeBytes, checksum } = writeSchema(name, schema);
        const endpointCount = countEndpoints(schema);
        const now = new Date().toISOString();

        manifest.schema = {
          fetchedAt: now,
          sizeBytes,
          endpointCount,
          checksum,
        };
        manifest.updatedAt = now;
        if (cmdOpts.account) {
          manifest.account = resolveAccount(cmdOpts.account);
        }

        writeManifest(name, manifest);

        if (globalOpts.json) {
          outputJson(manifest);
          return;
        }

        process.stdout.write(
          chalk.green(
            `Schema refreshed: ${endpointCount} endpoints, ${(sizeBytes / 1024).toFixed(0)}KB\n`,
          ),
        );
      } catch (err) {
        handleError(err);
      }
    });

  // Remove
  skill
    .command("remove")
    .description("Remove an installed skill")
    .argument("<name>", "Skill name")
    .action(async (name, _cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();

        if (!removeSkill(name)) {
          throw new PdcError(`Skill "${name}" is not installed.`);
        }

        if (globalOpts.json) {
          outputJson({ removed: name });
          return;
        }

        process.stdout.write(chalk.green(`Skill "${name}" removed.\n`));
      } catch (err) {
        handleError(err);
      }
    });

  // Schema
  skill
    .command("schema")
    .description("Dump or filter cached schema")
    .argument("<name>", "Skill name")
    .option("--filter <pattern>", "Filter: mutations, queries, types, or path prefix")
    .option("--summary", "Names only, no details")
    .option("--type <typeName>", "Specific GraphQL type definition")
    .option("--limit <n>", "Max results", parseInt)
    .action(async (name, cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
        const schema = readSchema(name);
        if (!schema) {
          throw new PdcError(
            `No schema cached for "${name}". Run: pdc skill refresh ${name}`,
          );
        }

        const result = filterSchema(schema, {
          filter: cmdOpts.filter,
          summary: cmdOpts.summary,
          typeName: cmdOpts.type,
          limit: cmdOpts.limit,
        });

        outputJson(result);
      } catch (err) {
        handleError(err);
      }
    });

  // Search
  skill
    .command("search")
    .description("Search cached schema for matching endpoints or types")
    .argument("<name>", "Skill name")
    .argument("<query>", "Search term")
    .option("--limit <n>", "Max results", parseInt)
    .action(async (name, query, cmdOpts, cmd) => {
      try {
        const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
        const schema = readSchema(name);
        if (!schema) {
          throw new PdcError(
            `No schema cached for "${name}". Run: pdc skill refresh ${name}`,
          );
        }

        const results = searchSchema(schema, query, cmdOpts.limit);

        if (globalOpts.json) {
          outputJson(results);
          return;
        }

        if (results.length === 0) {
          process.stdout.write(chalk.dim(`No matches for "${query}" in ${name}.\n`));
          return;
        }

        outputTable(
          results.map((r) => ({
            kind: r.kind,
            name: r.parent ? `${r.parent}.${r.name}` : r.name,
            description: r.description
              ? r.description.length > 80
                ? r.description.slice(0, 77) + "..."
                : r.description
              : "",
          })),
          [
            { key: "kind", header: "Kind", width: 16 },
            { key: "name", header: "Name", width: 40 },
            { key: "description", header: "Description", width: 50 },
          ],
        );

        process.stdout.write(chalk.dim(`\n${results.length} result(s)\n`));
      } catch (err) {
        handleError(err);
      }
    });

  return skill;
}
