import chalk from "chalk";

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_CONFIG_ERROR = 2;
export const EXIT_API_ERROR = 3;

export class PdcError extends Error {
  constructor(
    message: string,
    public exitCode: number = EXIT_ERROR,
  ) {
    super(message);
    this.name = "PdcError";
  }
}

export class ConfigError extends PdcError {
  constructor(message: string) {
    super(message, EXIT_CONFIG_ERROR);
    this.name = "ConfigError";
  }
}

export class ApiError extends PdcError {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message, EXIT_API_ERROR);
    this.name = "ApiError";
  }
}

export function handleError(err: unknown): never {
  if (err instanceof PdcError) {
    process.stderr.write(chalk.red(`Error: ${err.message}\n`));
    process.exit(err.exitCode);
  }

  if (err instanceof Error) {
    const msg = err.message || String(err);
    process.stderr.write(chalk.red(`Error: ${msg}\n`));
    process.exit(EXIT_ERROR);
  }

  process.stderr.write(chalk.red(`Error: ${String(err)}\n`));
  process.exit(EXIT_ERROR);
}
