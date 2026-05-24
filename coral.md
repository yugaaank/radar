# Coral CLI Documentation

Coral is a local-first SQL interface for APIs, files, and other data sources. it allows you to query your favorite tools using standard SQL syntax.

## Core Features

- **SQL for APIs**: Query services like GitHub, Slack, Jira, and more using SQL.
- **Local-First**: Runs on your machine, respecting your privacy and credentials.
- **MCP Integration**: Acts as a Model Context Protocol (MCP) server, allowing AI agents to query your data.
- **Embedded UI**: Includes a local web interface for exploration and querying.
- **Source Management**: Easily discover and add new data sources.

## Commands

### `coral sql <SQL>`
Executes a SQL query against configured sources.
- **Options**: `--format <FORMAT>` (table, json)

### `coral source`
Manages data sources.
- `discover`: Show available sources.
- `list`: List configured sources.
- `add <SOURCE>`: Add a new source.
- `test <SOURCE>`: Test connectivity.
- `info <SOURCE>`: Show metadata and available tables.

### `coral onboard`
An interactive wizard to set up Coral and explore use cases.

### `coral mcp-stdio`
Starts the MCP server over stdio for integration with LLMs.

### `coral ui`
Starts a local gRPC-Web server with an embedded UI (default port: 1457).

---

## GitHub Source Example

The GitHub source allows you to query repositories, issues, pull requests, and more.

### Setup
Ensure `GITHUB_TOKEN` is set in your environment.

### Sample Queries

**List your repositories:**
```sql
SELECT name, full_name, stargazers_count 
FROM github.user_repos 
ORDER BY stargazers_count DESC 
LIMIT 5;
```

**Find GitHub users:**
```sql
SELECT login, type FROM github.users LIMIT 5;
```

**Check Metadata:**
```sql
SELECT * FROM github.meta LIMIT 1;
```

## Supported Sources (Partial List)
- GitHub
- GitLab
- Jira
- Notion
- Slack
- Stripe
- PagerDuty
- Linear
- Datadog
- Sentry
- And many more...
