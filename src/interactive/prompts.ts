export async function selectFromOptions(
  message: string,
  options: Array<{ label: string; value: string }>,
): Promise<string> {
  const { search } = await import("@inquirer/prompts");
  const result = await search({
    message,
    source: async (input) => {
      const q = (input || "").toLowerCase();
      return options
        .filter((o) => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
        .map((o) => ({ name: o.label, value: o.value }));
    },
  });
  return result;
}

export async function inputValue(message: string, defaultVal?: string): Promise<string> {
  const { input } = await import("@inquirer/prompts");
  return input({ message, default: defaultVal });
}

export async function confirmAction(message: string): Promise<boolean> {
  const { confirm } = await import("@inquirer/prompts");
  return confirm({ message });
}
