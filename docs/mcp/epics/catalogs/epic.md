# Catalogs Epic

## Overview

The Catalogs epic provides functionality for browsing and viewing catalogs from MCP registry API endpoints. Catalogs represent collections of available models and assets from connected registries.

## Epic Goals

- Display available MCP catalogs from registry API endpoints
- Support project/namespace filtering with "All projects" option
- Provide card-based catalog browsing interface (similar to registry cards)
- Enable navigation to catalog details with server browsing

## Key Features

- **List Catalogs**: Browse catalogs from all MCP registries in selected namespace(s)
  - Catalog cards match the design of registry cards
  - Display catalog status, type, server count, and sync information
- **View Catalog Details**: Detailed catalog information with server browsing
  - Load servers from `/registry/{catalogName}/v0.1/servers` API
  - Display catalog metadata and available servers
- **Import Catalog**: Import catalog configurations into existing MCPRegistry instances
  - Simplified import modal with Data Sources, Sync Policy, and Filter tabs
  - Add catalog entries to existing MCPRegistry `registries` array
  - Automatic deployment restart after import (temporary workaround)
- **Approve Server**: Approve and publish servers from catalogs to multiple project registries
  - Select multiple projects for server approval
  - Automatically verify registries and publish servers
  - Display approval results with notifications

## Navigation

- **Menu Location**: AI Hub > MCP catalogs
- **Route**: `/ai-hub/mcp/catalogs`

## Status

🟡 **In Progress** - Catalog listing and details are implemented. Import catalog and server approval features are in development.

## Technical Details

- Fetches catalogs from registry API endpoints (`/extension/v0/registries`)
- Filters out KUBERNETES and MANAGED type registries
- Uses backend proxy for secure API access
- Supports DEV_MODE with localhost:8888 port forwarding

## Related Epics

- **Registries Epic**: Catalogs are discovered from registry API endpoints
- **Infrastructure Epic**: Uses backend proxy and DEV_MODE port forwarding

---

_See individual feature folders for detailed specifications and tasks._

