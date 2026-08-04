# @pipeworx/fmi

Finnish Meteorological Institute (FMI) MCP — observations, forecast, climate, and warnings for Finland (and limited Europe coverage). Keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

> FMI's open data is served via OGC WFS (GML/XML). This pack normalizes a small subset of stored queries to JSON for typical agent use.

## Tools

- `forecast(place, parameters?, timestep?)` — multi-hour forecast for a place name
- `latest_observations(place, parameters?)` — most recent observation values
- `recent_observations(place, parameters?, hours?)` — last N hours of observations
- `warnings()` — currently active weather warnings (Finland)

## Data source

`https://opendata.fmi.fi/wfs` (OGC WFS stored queries).

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

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

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
