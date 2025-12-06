# Catalogs Epic

## Overview

The Catalogs epic provides functionality for browsing and viewing catalogs from MCP registry API endpoints. Catalogs represent collections of available models and assets from connected registries.

## Epic Goals

- Display available MCP catalogs from registry API endpoints
- Support project/namespace filtering with "All projects" option
- Provide card-based catalog browsing interface
- Enable navigation to catalog details (future implementation)

## Key Features

- **List Catalogs**: Browse catalogs from all MCP registries in selected namespace(s)
- **View Catalog Details**: Detailed catalog information (future implementation)

## Navigation

- **Menu Location**: AI Hub > MCP catalogs
- **Route**: `/ai-hub/mcp/catalogs`

## Status

🟡 **In Progress** - Catalog listing is implemented. Catalog details page is pending.

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

