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
