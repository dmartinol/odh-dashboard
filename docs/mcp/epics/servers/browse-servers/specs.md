# Browse Servers Feature

## Overview

The Browse Servers feature provides a card-based interface for discovering and browsing available MCP servers from registries, with advanced filtering capabilities.

## Feature Goals

- Enable users to browse available MCP servers from registries
- Provide advanced filtering (transport, tier, tags, search)
- Support server categorization and grouping
- Integrate with registry details for server discovery

## UI Requirements

### Server Browser Layout

The server browser displays:

1. **Filter Toolbar**
   - Search by name/description
   - Filter by transport (stdio, sse, streamable-http)
   - Filter by tier (official, community, experimental)
   - Filter by tags (multi-select)
   - Clear filters button

2. **Server Cards**
   - Card-based layout for displaying servers
   - Each card shows:
     - Server name and description
     - Transport protocol badge
     - Tier badge (official, community, experimental)
     - Available tools count
     - Deploy button

3. **Server Categorization**
   - Group servers by transport type
   - Display tier badges
   - Tag-based filtering

## Technical Implementation

### Components

- `McpServerBrowser.tsx` - Main server browsing component
- `McpServerCard.tsx` - Individual server card

### Hooks

- `useMcpServers(registry)` - Servers from registry source

### Filtering

- **Transport**: stdio, sse, streamable-http
- **Tier**: official, community, experimental
- **Tags**: Multi-tag filtering
- **Search**: Real-time name/description search

## Status

✅ **Complete** - Server browser is fully implemented with advanced filtering.

---

_See [tasks.md](./tasks.md) for development tasks._

