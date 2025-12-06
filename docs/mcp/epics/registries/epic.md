# Registries Epic

## Overview

The Registries epic encompasses all functionality related to managing MCP registries, which serve as sources for discovering and deploying MCP servers. This epic includes creating, viewing, updating, deleting, and synchronizing registries.

## Epic Goals

- Enable users to create and configure MCP registries from various sources (Git, ConfigMap, HTTP)
- Provide comprehensive registry management with real-time status updates
- Support registry synchronization with source repositories
- Integrate with Kubernetes Watch API for real-time updates

## Key Features

- **List Registries**: Dashboard view with registry cards showing status, health, and metadata
- **View Registry Details**: Comprehensive registry information with tabbed interface
- **Create Registry**: Multi-step wizard for registry creation with source validation
- **Update Registry**: Edit existing registry configurations
- **Delete Registry**: Remove registries with confirmation
- **Sync Registry**: Manual and automatic synchronization with source repositories

## Navigation

- **Menu Location**: AI Hub > MCP registries
- **Route**: `/ai-hub/mcp/registries`
- **Details Route**: `/ai-hub/mcp/registries/{name}`

## Status

✅ **Complete** - All registry management features are implemented and functional.

## Related Epics

- **Servers Epic**: Registries provide the source for server discovery
- **Catalogs Epic**: Registries expose API endpoints for catalog browsing
- **Infrastructure Epic**: Uses foundation components and navigation integration

---

_See individual feature folders for detailed specifications and tasks._

