# List Instances Feature

## Overview

The List Instances feature provides a comprehensive table-based interface for viewing and managing deployed MCP server instances with sorting, filtering, and status indicators.

## Feature Goals

- Display all deployed MCP server instances in a table
- Enable sorting by multiple columns
- Provide advanced filtering capabilities
- Show server status and metadata
- Support namespace/project filtering

## UI Requirements

### Servers Table Layout

The servers table displays:

1. **Toolbar**
   - Namespace selector with project context integration
   - Search by name with partial matching
   - Filter by linked registry (including "Unregistered" option)
   - Filter by transport protocol (stdio/sse/streamable-http)
   - Filter by deployment status (Running/Pending/Failed/Unknown)

2. **Table Columns**
   - **Name**: Clickable server name (opens details modal)
   - **Status**: Status indicators from Deployment phase
   - **Linked Registry**: Clickable links to registry details
   - **Endpoint**: Copy-to-clipboard functionality
   - **Transport**: Protocol badges (stdio/sse/streamable-http)
   - **Actions**: Row action menu (hamburger)

3. **Status Indicators**
   - **Running** ✅ - Server is running and healthy
   - **Pending** ⏳ - Server is being created/updated
   - **Failed** ❌ - Server deployment failed
   - **Unknown** ❓ - Status cannot be determined

## Technical Implementation

### Components

- `McpServersPage.tsx` - Main servers table page
- `McpServersTable.tsx` - Table component with sorting

### Hooks

- `useMcpServers(namespace)` - Real-time server list via Kubernetes Watch API

### Features

- Sortable columns (Name, Status, Linked Registry, Endpoint, Transport)
- URL query parameter support for pre-filtering
- Server-registry matching using ToolHive label conventions
- Endpoint display with copy functionality (checks `status.url` then `status.endpoint`)

## Status

✅ **Complete** - Servers table is fully implemented with sorting and filtering.

---

_See [tasks.md](./tasks.md) for development tasks._

