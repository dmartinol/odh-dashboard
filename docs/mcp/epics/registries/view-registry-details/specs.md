# View Registry Details Feature

## Overview

The View Registry Details feature provides a comprehensive view of a specific MCP registry with tabbed interface showing overview, available servers, and configuration.

## Feature Goals

- Display comprehensive registry information
- Show available servers from the registry
- Display registry configuration
- Provide navigation to related resources

## UI Requirements

### Registry Details Page Layout

The registry details page displays:

1. **Breadcrumb Navigation**
   - AI Hub > MCP Registries > {registry-name}

2. **Page Header**
   - Registry name and display name
   - Source type badge
   - Health status indicator
   - Last sync time
   - Action buttons (Edit, Sync)

3. **Tabbed Interface**
   - **Overview Tab**: General information, source details, sync status
   - **Available Servers Tab**: List of servers available from this registry
   - **Configuration Tab**: Registry configuration details

4. **Links to Related Resources**
   - Link to AI Asset Endpoints page with pre-filter for this registry

## Technical Implementation

### Components

- `McpRegistryDetailsPage.tsx` - Main details page
- Tab components for Overview, Servers, Configuration

### Hooks

- `useMcpRegistry(name, namespace)` - Real-time registry details
- `useMcpServers(registry)` - Servers from registry

### Route

- `/ai-hub/mcp/registries/{registry-name}`

## Status

✅ **Complete** - Registry details page is fully implemented with tabbed interface.

---

_See [tasks.md](./tasks.md) for development tasks._

