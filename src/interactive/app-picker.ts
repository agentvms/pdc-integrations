import type { BackendClient } from "@pipedream/sdk";

export async function pickApp(client: BackendClient): Promise<string> {
  const { search } = await import("@inquirer/prompts");

  const result = await search({
    message: "Search and select an app:",
    source: async (input) => {
      const q = input || "";
      if (q.length < 2) return [{ name: "Type at least 2 characters to search...", value: "", disabled: true } as any];
      const resp = await client.getApps({ q, limit: 20 });
      return resp.data.map((app) => ({
        name: `${app.name} (${app.name_slug})`,
        value: app.name_slug,
      }));
    },
  });

  return result as string;
}
