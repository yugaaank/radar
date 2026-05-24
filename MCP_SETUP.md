# MCP Integration Guide for Radar

This guide explains how to connect your AI agents (Gemini CLI, Claude Code, Cursor, etc.) to the Radar data engine using the Model Context Protocol (MCP).

## 1. Start the Coral MCP Server
Radar uses the Coral CLI to act as an MCP server. The command to start it is:

```bash
coral mcp-stdio
```

This command starts the server over standard input/output, which is the standard way for AI agents to communicate with local tools.

---

## 2. Configure Your AI Agent

### Gemini CLI
To use Radar with Gemini CLI, you can define the MCP server in your configuration.
(Note: Replace `path/to/coral` with the actual path if it's not in your PATH).

```json
{
  "mcpServers": {
    "radar": {
      "command": "coral",
      "args": ["mcp-stdio"]
    }
  }
}
```

### Claude Code / Claude Desktop
Add the following to your `claude_desktop_config.json` (usually found in `~/Library/Application Support/Claude/` on macOS or `%APPDATA%\Claude\` on Windows):

```json
{
  "mcpServers": {
    "radar": {
      "command": "coral",
      "args": ["mcp-stdio"]
    }
  }
}
```

### Cursor
1. Go to **Settings** -> **Cursor Settings** -> **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Name: `Radar`
4. Type: `stdio`
5. Command: `coral mcp-stdio`

---

## 3. Testing the Integration
Once configured, you can ask your AI agent natural language questions about your engineering data:

*   *"Show me my most starred GitHub repositories."*
*   *"What are the open pull requests for the 'radar' repository?"*
*   *"Who are the top contributors to the project?"*

The agent will translate these into SQL queries, execute them via Coral, and provide you with a summarized answer.
