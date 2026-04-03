import type { BackendClient } from "@pipedream/sdk";
import { selectFromOptions, inputValue, confirmAction } from "./prompts.js";

type ConfiguratorOpts = {
  client: BackendClient;
  componentKey: string;
  externalUserId: string;
  accountId?: string;
};

export async function configurePropWizard(opts: ConfiguratorOpts): Promise<Record<string, unknown>> {
  const { client, componentKey, externalUserId, accountId } = opts;

  const compResp = await client.getComponent({ key: componentKey });
  let props = compResp.data.configurable_props;
  let dynamicPropsId: string | undefined;
  const configuredProps: Record<string, unknown> = {};

  for (const prop of props) {
    if (prop.hidden) continue;
    if (prop.type === "$.service.db" || prop.type === "$.interface.http") continue;

    // Auto-inject account for app props
    if (prop.type === "app") {
      if (accountId) {
        configuredProps[prop.name] = { authProvisionId: accountId };
      } else {
        const aid = await inputValue(`Account ID for ${prop.label || prop.name}:`);
        configuredProps[prop.name] = { authProvisionId: aid };
      }

      if (prop.reloadProps) {
        const reloadResp = await client.reloadComponentProps({
          externalUserId,
          componentId: { key: componentKey },
          configuredProps,
          ...(dynamicPropsId ? { dynamicPropsId } : {}),
        });
        dynamicPropsId = reloadResp.dynamicProps.id;
        props = reloadResp.dynamicProps.configurableProps as unknown as typeof props;
      }
      continue;
    }

    const label = prop.label || prop.name;
    const isRequired = !prop.optional;

    if (!isRequired) {
      const include = await confirmAction(`Configure optional prop "${label}"?`);
      if (!include) continue;
    }

    let value: unknown;

    if (prop.remoteOptions) {
      const resp = await client.configureComponent({
        externalUserId,
        componentId: { key: componentKey },
        propName: prop.name,
        configuredProps,
        ...(dynamicPropsId ? { dynamicPropsId } : {}),
      });

      const options = resp.options?.length
        ? resp.options.map((o) => ({ label: o.label, value: o.value }))
        : resp.stringOptions?.map((s) => ({ label: s, value: s })) || [];

      if (options.length > 0) {
        value = await selectFromOptions(`Select ${label}:`, options);
      } else {
        value = await inputValue(`Enter value for ${label}:`);
      }
    } else if (prop.type === "boolean") {
      value = await confirmAction(`${label}?`);
    } else if (prop.type === "integer") {
      const raw = await inputValue(`${label} (integer):`);
      value = parseInt(raw, 10);
    } else if ("options" in prop && Array.isArray(prop.options) && prop.options.length > 0) {
      const optItems = prop.options.map((o: any) =>
        typeof o === "string"
          ? { label: o, value: o }
          : { label: o.label, value: o.value },
      );
      value = await selectFromOptions(`Select ${label}:`, optItems);
    } else {
      const defaultVal =
        "default" in prop && prop.default != null
          ? String(prop.default)
          : undefined;
      value = await inputValue(`${label}:`, defaultVal);
    }

    configuredProps[prop.name] = value;

    if (prop.reloadProps) {
      const reloadResp = await client.reloadComponentProps({
        externalUserId,
        componentId: { key: componentKey },
        configuredProps,
        ...(dynamicPropsId ? { dynamicPropsId } : {}),
      });
      dynamicPropsId = reloadResp.dynamicProps.id;
      props = reloadResp.dynamicProps.configurableProps as unknown as typeof props;
    }
  }

  return configuredProps;
}
