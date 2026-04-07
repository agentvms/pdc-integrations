# PDC — Pipedream Connect CLI

## Running pdc

The compiled binary is at `./pdc`. Run commands with:

```bash
./pdc <command>
```

To recompile after code changes:

```bash
export PATH="$HOME/.bun/bin:$PATH" && bun run build
```

## Connected accounts

To check connected accounts, run `pdc accounts`. This is what the user means by "what accounts are connected here."

## Connecting new accounts

To connect a new account, run `pdc connect <app-slug> --name <alias>`. This prints an **OAuth URL to stdout** that the user must open in their browser — it does NOT auto-open a browser.

**IMPORTANT**: After running `pdc connect`, you MUST extract the OAuth URL from the command output and display it prominently to the user so they can click it to complete the OAuth flow. The URL looks like:

```
https://pipedream.com/_static/connect.html?token=...&connectLink=true&app=...
```

Always present it clearly, e.g.:

> Open this URL to connect your account:
> https://pipedream.com/_static/connect.html?token=...

Example:
```bash
./pdc connect microsoft_outlook --name personal-hotmail
```

To find the right app slug, search with:
```bash
./pdc apps --query <search-term>
```

## Running actions (IMPORTANT — read this before using `pdc run`)

**NEVER guess prop names.** Always discover them first with `pdc actions get`:

```bash
# Step 1: Find the action key
./pdc actions --app gmail

# Step 2: Get the exact prop names and types
./pdc actions get gmail-find-email

# Step 3: Now run it using the exact prop names from step 2
./pdc run gmail-find-email --account my-gmail --props '{"q": "in:inbox", "maxResults": 5}'
```

Prop names often differ from what you'd guess. For example:
- `gmail-find-email` uses `q` (not `query`) for the search string
- `gmail-send-email` uses `to` as a string array, `body` for content, and `bodyType` for html/plaintext

**If you're unsure about any prop name, run `pdc actions get <action-key>` first.** It shows every prop with its name, type, whether it's required/optional, and a description.

### Common action examples

**Find/read emails:**
```bash
./pdc run gmail-find-email --account my-gmail \
  --props '{"q": "in:inbox", "maxResults": 5, "withTextPayload": true}'
```

**Send an email:**
```bash
./pdc run gmail-send-email --account my-gmail \
  --props '{"to": ["user@example.com"], "subject": "Hello", "body": "Message body"}'
```

**Send a Slack message:**
```bash
./pdc run slack-send-message --account my-slack \
  --props '{"channel": "#general", "text": "Hello from pdc"}'
```

**Interactive mode** — if you're unsure about props, use `-i` and the CLI will prompt you for each one:
```bash
./pdc run gmail-find-email --account my-gmail -i
```
