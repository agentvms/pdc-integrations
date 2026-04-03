import { Command } from "commander";
import { getClient } from "../client.js";
import { getOrCreateExternalUserId, resolveAccount } from "../config.js";
import { outputJson } from "../output.js";
import { handleError, PdcError } from "../errors.js";
import type { GlobalOpts } from "../types.js";

function parseJsonOptional(value: string | undefined): Record<string, string> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new PdcError(`Invalid JSON: ${value}`);
  }
}

function makeProxyAction(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") {
  return async function (cmdOpts: Record<string, string>, cmd: Command) {
    try {
      const globalOpts = cmd.parent!.optsWithGlobals<GlobalOpts>();
      const client = getClient(globalOpts);
      const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

      if (!cmdOpts.url) throw new PdcError("--url is required");
      if (!cmdOpts.account) throw new PdcError("--account is required");

      const accountId = resolveAccount(cmdOpts.account);
      const headers = parseJsonOptional(cmdOpts.headers);
      const body = cmdOpts.body;

      const resp = await client.makeProxyRequest(
        {
          searchParams: {
            external_user_id: externalUserId,
            account_id: accountId,
          },
        },
        {
          url: cmdOpts.url,
          options: {
            method,
            ...(headers ? { headers } : {}),
            ...(body ? { body } : {}),
          },
        },
      );

      if (globalOpts.json || typeof resp === "object") {
        outputJson(resp);
      } else {
        process.stdout.write(String(resp) + "\n");
      }
    } catch (err) {
      handleError(err);
    }
  };
}

const proxyOptions = (cmd: Command) =>
  cmd
    .requiredOption("--url <url>", "Target API URL")
    .requiredOption("--account <id>", "Account ID or alias")
    .option("--headers <json>", "Request headers as JSON")
    .option("--body <json>", "Request body as JSON string");

export function proxyCommand(): Command {
  const proxy = new Command("proxy").description(
    "Proxy API requests through connected accounts",
  );

  proxyOptions(
    proxy.command("get").description("Proxy a GET request"),
  ).action(makeProxyAction("GET"));

  proxyOptions(
    proxy.command("post").description("Proxy a POST request"),
  ).action(makeProxyAction("POST"));

  proxyOptions(
    proxy.command("put").description("Proxy a PUT request"),
  ).action(makeProxyAction("PUT"));

  proxyOptions(
    proxy.command("patch").description("Proxy a PATCH request"),
  ).action(makeProxyAction("PATCH"));

  proxyOptions(
    proxy.command("delete").description("Proxy a DELETE request"),
  ).action(makeProxyAction("DELETE"));

  return proxy;
}
