import Table from "cli-table3";
import chalk from "chalk";

export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function outputKeyValue(obj: Record<string, unknown>, keys?: string[]): void {
  const displayKeys = keys || Object.keys(obj);
  const maxKeyLen = Math.max(...displayKeys.map((k) => k.length));

  for (const key of displayKeys) {
    const val = obj[key];
    const displayVal =
      val === null || val === undefined
        ? chalk.dim("—")
        : typeof val === "object"
          ? JSON.stringify(val)
          : String(val);
    process.stdout.write(
      `${chalk.bold(key.padEnd(maxKeyLen))}  ${displayVal}\n`,
    );
  }
}

type TableColumn = {
  key: string;
  header: string;
  width?: number;
  formatter?: (val: unknown) => string;
};

export function outputTable(
  rows: Record<string, unknown>[],
  columns: TableColumn[],
  pageInfo?: { count: number; total: number; endCursor?: string },
): void {
  const table = new Table({
    head: columns.map((c) => chalk.bold(c.header)),
    ...(columns.some((c) => c.width)
      ? { colWidths: columns.map((c) => c.width ?? null) }
      : {}),
    wordWrap: true,
    style: { head: [], border: [] },
  });

  for (const row of rows) {
    table.push(
      columns.map((col) => {
        const val = row[col.key];
        if (col.formatter) return col.formatter(val);
        if (val === null || val === undefined) return chalk.dim("—");
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      }),
    );
  }

  process.stdout.write(table.toString() + "\n");

  if (pageInfo && pageInfo.total > 0) {
    process.stdout.write(
      chalk.dim(
        `\nShowing ${pageInfo.count} of ${pageInfo.total}.` +
          (pageInfo.endCursor
            ? ` Next: --after ${pageInfo.endCursor}`
            : "") +
          "\n",
      ),
    );
  }
}
