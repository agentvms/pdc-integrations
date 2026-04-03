import type { BackendClient } from "@pipedream/sdk";
import { getClient } from "./client.js";
import { getOrCreateExternalUserId, resolveAccount } from "./config.js";
import { outputJson, outputKeyValue } from "./output.js";
import { PdcError } from "./errors.js";
import type { GlobalOpts } from "./types.js";

export function parseJsonOpt(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    throw new PdcError(`Invalid JSON: ${value}`);
  }
}

export async function injectAccount(
  client: BackendClient,
  componentKey: string,
  accountId: string,
  userProps: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resp = await client.getComponent({ key: componentKey });
  const appProp = resp.data.configurable_props.find((p: any) => p.type === "app");
  if (appProp) {
    return {
      ...userProps,
      [appProp.name]: { authProvisionId: accountId },
    };
  }
  return userProps;
}

export type RunOpts = {
  actionKey: string;
  account?: string;
  props?: Record<string, unknown>;
  dynamicPropsId?: string;
  interactive?: boolean;
};

export async function executeRun(
  globalOpts: GlobalOpts,
  runOpts: RunOpts,
): Promise<void> {
  const client = getClient(globalOpts);
  const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

  const accountId = runOpts.account ? resolveAccount(runOpts.account) : undefined;
  let configuredProps: Record<string, unknown> = runOpts.props ?? {};

  if (runOpts.interactive || globalOpts.interactive) {
    const { configurePropWizard } = await import("./interactive/prop-configurator.js");
    configuredProps = await configurePropWizard({
      client,
      componentKey: runOpts.actionKey,
      externalUserId,
      accountId,
    });
  } else if (accountId) {
    configuredProps = await injectAccount(
      client,
      runOpts.actionKey,
      accountId,
      configuredProps,
    );
  }

  const resp = await client.runAction({
    externalUserId,
    actionId: { key: runOpts.actionKey },
    configuredProps,
    ...(runOpts.dynamicPropsId
      ? { dynamicPropsId: runOpts.dynamicPropsId }
      : {}),
  });

  if (globalOpts.json) {
    outputJson(resp);
    return;
  }

  outputKeyValue(resp as unknown as Record<string, unknown>);
}

export type DeployOpts = {
  triggerKey: string;
  account?: string;
  props?: Record<string, unknown>;
  dynamicPropsId?: string;
  webhookUrl?: string;
  workflowId?: string;
  interactive?: boolean;
};

export async function executeDeploy(
  globalOpts: GlobalOpts,
  deployOpts: DeployOpts,
): Promise<void> {
  const client = getClient(globalOpts);
  const externalUserId = getOrCreateExternalUserId(globalOpts.profile);

  const accountId = deployOpts.account ? resolveAccount(deployOpts.account) : undefined;
  let configuredProps: Record<string, unknown> = deployOpts.props ?? {};

  if (deployOpts.interactive || globalOpts.interactive) {
    const { configurePropWizard } = await import("./interactive/prop-configurator.js");
    configuredProps = await configurePropWizard({
      client,
      componentKey: deployOpts.triggerKey,
      externalUserId,
      accountId,
    });
  } else if (accountId) {
    configuredProps = await injectAccount(
      client,
      deployOpts.triggerKey,
      accountId,
      configuredProps,
    );
  }

  const resp = await client.deployTrigger({
    externalUserId,
    triggerId: { key: deployOpts.triggerKey },
    configuredProps,
    ...(deployOpts.dynamicPropsId
      ? { dynamicPropsId: deployOpts.dynamicPropsId }
      : {}),
    ...(deployOpts.webhookUrl ? { webhookUrl: deployOpts.webhookUrl } : {}),
    ...(deployOpts.workflowId ? { workflowId: deployOpts.workflowId } : {}),
  });

  if (globalOpts.json) {
    outputJson(resp);
    return;
  }

  outputKeyValue(resp.data as unknown as Record<string, unknown>, [
    "id",
    "name",
    "active",
    "created_at",
    "updated_at",
  ]);
}
