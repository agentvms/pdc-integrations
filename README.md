# pdc — Pipedream Connect CLI

A personal integration CLI. Connect your own accounts (Gmail, Slack, GitHub, etc.) and interact with them directly from the terminal.

## Install

Download the latest pre-built binary from [GitHub Releases](https://github.com/agentvms/pdc-integrations/releases/latest):

```bash
# Linux x64
curl -fSL https://github.com/agentvms/pdc-integrations/releases/latest/download/pdc-linux-x64 -o pdc
chmod +x pdc

# Linux arm64
curl -fSL https://github.com/agentvms/pdc-integrations/releases/latest/download/pdc-linux-arm64 -o pdc
chmod +x pdc
```

The binary is self-contained — no runtime dependencies required.

## Setup

```bash
# Configure credentials (interactive)
./pdc config init

# Or set environment variables / .env file
PIPEDREAM_CLIENT_ID=...
PIPEDREAM_CLIENT_SECRET=...
PIPEDREAM_PROJECT_ID=...
PIPEDREAM_PROJECT_ENVIRONMENT=development  # optional, defaults to development
```

## Quick Start

```bash
# Connect an app account
pdc connect gmail --name personal-gmail
pdc connect gmail --name work-gmail
pdc connect slack --name my-slack

# List connected accounts
pdc accounts

# Run an action
pdc run gmail-send-email --account personal-gmail \
  --props '{"to":"friend@example.com","subject":"Hello","body":"Hi from pdc!"}'

# Proxy a raw API call
pdc proxy get --account work-gmail \
  --url "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5"

# Deploy a trigger
pdc deploy github-new-issue --account my-github \
  --props '{"repo":"owner/repo"}' --webhook-url https://example.com/hook
```

## Commands

### `pdc connect [app-slug]`

Connect an app account via OAuth. Prints an OAuth URL that you must open in your browser, then polls until the connection completes.

> **Note:** `pdc connect` does **not** auto-open a browser. It prints the OAuth URL to stdout. Copy/open the URL manually to complete the flow. This is especially important in headless or AI-agent environments.

```bash
pdc connect gmail                     # connect Gmail
pdc connect slack --name my-slack     # connect with a nickname
pdc connect                           # interactive app picker
```

| Option | Description |
|--------|-------------|
| `--name <alias>` | Give the account a nickname for easy reference |
| `--timeout <seconds>` | Max wait time (default: 300) |
| `--poll-interval <seconds>` | Polling interval (default: 3) |

### `pdc accounts`

Manage connected accounts.

```bash
pdc accounts                          # list all accounts (shows aliases)
pdc accounts --app gmail              # filter by app
pdc accounts get <id-or-alias>        # account details
pdc accounts delete <id-or-alias>     # delete an account
pdc accounts alias <name> <id>        # nickname an existing account
pdc accounts unalias <name>           # remove a nickname
```

### `pdc apps`

Browse available apps on Pipedream.

```bash
pdc apps                              # list apps
pdc apps --query slack                # search
pdc apps --has-actions                # only apps with actions
pdc apps get slack                    # app details
```

### `pdc actions`

Browse available actions.

```bash
pdc actions --app gmail               # list Gmail actions
pdc actions --query "send email"      # search
pdc actions get gmail-send-email      # action details + props
```

### `pdc run <action-key>`

Run an action using a connected account.

```bash
pdc run gmail-send-email --account personal-gmail \
  --props '{"to":"test@example.com","subject":"Test","body":"Hello"}'

pdc run slack-send-message --account my-slack \
  --props '{"channel":"#general","text":"Hello from pdc"}'

pdc run gmail-send-email --account work-gmail -i   # interactive prop config
```

| Option | Description |
|--------|-------------|
| `--account <id-or-alias>` | Account to use (resolved from aliases) |
| `--props <json>` | Configured props as JSON |
| `--dynamic-props-id <id>` | Dynamic props ID |
| `-i, --interactive` | Configure props interactively |

The `--account` flag auto-injects the account into the component's app prop — no need to know about `authProvisionId` internals.

### `pdc deploy <trigger-key>`

Deploy a trigger.

```bash
pdc deploy github-new-issue --account my-github \
  --props '{"repo":"owner/repo"}' \
  --webhook-url https://example.com/hook
```

| Option | Description |
|--------|-------------|
| `--account <id-or-alias>` | Account to use |
| `--props <json>` | Configured props as JSON |
| `--webhook-url <url>` | Webhook URL for events |
| `--workflow-id <id>` | Workflow ID for events |
| `--dynamic-props-id <id>` | Dynamic props ID |
| `-i, --interactive` | Configure props interactively |

### `pdc triggers`

Manage deployed triggers.

```bash
pdc triggers                          # list deployed triggers
pdc triggers get <id>                 # trigger details
pdc triggers update <id> --active false   # pause a trigger
pdc triggers update <id> --name "My Trigger"
pdc triggers delete <id>              # delete a trigger
pdc triggers delete <id> --force      # ignore hook errors
```

### `pdc proxy <method>`

Proxy raw API requests through a connected account's credentials.

```bash
pdc proxy get --account personal-gmail \
  --url "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5"

pdc proxy post --account my-slack \
  --url "https://slack.com/api/chat.postMessage" \
  --body '{"channel":"C123","text":"Hello"}'
```

Supported methods: `get`, `post`, `put`, `patch`, `delete`.

| Option | Description |
|--------|-------------|
| `--url <url>` | Target API URL (required) |
| `--account <id-or-alias>` | Account to use (required) |
| `--headers <json>` | Request headers as JSON |
| `--body <json>` | Request body as JSON string |

### `pdc config`

Manage CLI configuration.

```bash
pdc config init                       # interactive setup
pdc config set clientId <value>       # set a value
pdc config get clientId               # get a value
pdc config list                       # show all profiles
pdc config set projectId <id> --profile staging   # named profiles
```

### `pdc saved`

Manage saved command templates — reusable shortcuts for `run` and `deploy` commands.

```bash
pdc saved                             # list saved commands
pdc saved create my-email \
  --command run --action gmail-send-email \
  --account personal-gmail \
  --props '{"to":"friend@example.com","subject":"Hi"}' \
  --description "Quick email to friend"

pdc saved show my-email               # show saved command details
pdc saved run my-email                # execute saved command
pdc saved run my-email --props '{"subject":"Updated"}' # override props
pdc saved delete my-email             # delete saved command
```

### `pdc skill`

Manage API skills — cached schema knowledge for `pdc proxy`. Skills pre-fetch and cache API schemas (OpenAPI or GraphQL) so agents and users can discover available endpoints.

```bash
pdc skill                             # list installed skills (default)
pdc skill list                        # same as above

pdc skill install linear              # install from built-in registry
pdc skill install my-api \
  --type openapi --spec-url https://example.com/openapi.json
pdc skill install my-gql \
  --type graphql --endpoint https://example.com/graphql

pdc skill info linear                 # show skill manifest and schema summary
pdc skill refresh linear              # re-fetch the cached schema
pdc skill remove linear               # remove an installed skill

pdc skill schema linear               # dump cached schema
pdc skill schema linear --filter queries --summary  # filter to query names
pdc skill schema linear --type Issue  # specific type definition

pdc skill search linear "issue"       # search schema for matching endpoints/types
pdc skill search linear "create" --limit 10
```

| Subcommand | Description |
|------------|-------------|
| `list` | List installed skills (default) |
| `install <name>` | Install a skill from the registry or custom source |
| `info <name>` | Show skill manifest and schema summary |
| `refresh <name>` | Re-fetch the schema for an installed skill |
| `remove <name>` | Remove an installed skill |
| `schema <name>` | Dump or filter cached schema |
| `search <name> <query>` | Search cached schema for matching endpoints or types |

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output raw JSON (for scripting) |
| `-i, --interactive` | Enable interactive prompts |
| `--profile <name>` | Use a named config profile |

## Account Aliases

Aliases let you reference accounts by nickname instead of raw IDs like `apn_abc123`.

**Set at connect time:**
```bash
pdc connect gmail --name work-gmail
```

**Set after the fact:**
```bash
pdc accounts alias work-gmail apn_abc123
```

**Use everywhere:**
```bash
pdc run gmail-send-email --account work-gmail ...
pdc proxy get --account work-gmail --url ...
pdc accounts get work-gmail
```

Aliases are stored locally in `~/.config/pdc/config.json`.

## Configuration

Config is resolved in this order (highest priority first):

1. Environment variables (`PIPEDREAM_CLIENT_ID`, etc.)
2. `.env` file (auto-loaded by Bun)
3. Config file profiles (`~/.config/pdc/config.json`)

### Required

| Variable | Description |
|----------|-------------|
| `PIPEDREAM_CLIENT_ID` | OAuth client ID from Pipedream |
| `PIPEDREAM_CLIENT_SECRET` | OAuth client secret |
| `PIPEDREAM_PROJECT_ID` | Pipedream project ID |

### Optional

| Variable | Description |
|----------|-------------|
| `PIPEDREAM_PROJECT_ENVIRONMENT` | `development` or `production` (default: development) |
| `PIPEDREAM_API_HOST` | Custom API host override |

## Development

Requires [Bun](https://bun.sh) for building from source.

```bash
bun install

# Run directly
bun run src/cli.ts -- <command>

# Compile to standalone binary
bun run build
./pdc <command>

# Type check
bun x --bun tsc --noEmit
```

## Releasing

Push a version tag to trigger the GitHub Actions release workflow:

```bash
git tag v0.2.0
git push origin v0.2.0
```

This builds `pdc-linux-x64` and `pdc-linux-arm64` binaries and uploads them to a GitHub Release.

## Architecture

```
src/
  cli.ts                    # Entry point, command tree
  client.ts                 # Pipedream SDK client factory
  config.ts                 # Config resolution, external user ID, aliases
  errors.ts                 # Error classes and handler
  execute.ts                # Shared run/deploy execution logic
  output.ts                 # JSON, table, key-value formatters
  types.ts                  # Shared TypeScript types
  commands/
    connect.ts              # OAuth connect flow with polling
    accounts.ts             # Account management + aliases
    apps.ts                 # App browsing
    actions.ts              # Action browsing
    run.ts                  # Action execution with account auto-injection
    deploy.ts               # Trigger deployment with account auto-injection
    triggers.ts             # Deployed trigger management
    proxy.ts                # API proxy through connected accounts
    config-cmd.ts           # CLI configuration
    saved.ts                # Saved command templates
    skill.ts                # API skill management
  interactive/
    app-picker.ts           # Searchable app selection
    prompts.ts              # Shared prompt helpers
    prop-configurator.ts    # Interactive prop configuration wizard
  skills/
    config.ts               # Skill manifest and schema storage
    registry.ts             # Built-in skill registry
    schema.ts               # Schema summarization, filtering, search
    fetchers/
      index.ts              # Unified schema fetch dispatcher
      graphql.ts            # GraphQL introspection fetcher
      openapi.ts            # OpenAPI spec fetcher
```

### Key Design Decisions

- **Auto-managed identity** — A `externalUserId` (UUID) is auto-generated on first run and stored in config. No `--user` flags anywhere.
- **Account auto-injection** — `--account` resolves the app prop automatically. Users never deal with `authProvisionId`.
- **Local aliases** — Nicknames for accounts stored in the config file, resolved transparently everywhere.
- **Flat commands** — `pdc run` not `pdc actions run`. `pdc deploy` not `pdc triggers deploy`.
