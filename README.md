# mcp-fmi

Finnish Meteorological Institute open data (forecast, observations, warnings)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 250+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `forecast` | Multi-hour HARMONIE forecast for a place name in Finland (60 h ahead). |
| `latest_observations` | Most recent observation values for a place. |
| `recent_observations` | Last N hours of observations. |
| `warnings` | Currently active weather warnings (Finland, ISO bulletin XML returned as text). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "fmi": {
      "url": "https://gateway.pipeworx.io/fmi/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 250+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Fmi data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
