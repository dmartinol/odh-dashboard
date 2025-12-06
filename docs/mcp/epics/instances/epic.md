# Instances Epic

## Overview

The Instances epic provides comprehensive management capabilities for deployed MCP server instances. This epic includes monitoring, filtering, registration, and lifecycle operations for deployed servers.

## Epic Goals

- Monitor and manage deployed MCP server instances
- Provide table-based interface with advanced filtering and sorting
- Support server registration/unregistration with registries
- Enable server lifecycle operations (view, delete)

## Key Features

- **List Instances**: Comprehensive servers table with sorting and filtering
- **View Instance Details**: Detailed server information with tabs (Overview, Spec, Status, Labels & Annotations)
- **Register Instance**: Link unregistered servers to registries
- **Unregister Instance**: Remove registry links from servers
- **Delete Instance**: Remove deployed server instances

## Navigation

- **Menu Location**: Gen AI Studio > AI asset endpoints
- **Route**: `/gen-ai-studio/assets`

## Status

✅ **Complete** - All instance management features are implemented and functional.

## Technical Details

- Server-registry matching using ToolHive label conventions
- Real-time status updates via Kubernetes Watch API
- Endpoint display with copy-to-clipboard functionality
- URL query parameter support for pre-filtering

## Related Epics

- **Servers Epic**: Instances are deployed servers from the Servers epic
- **Registries Epic**: Instances can be linked to registries
- **Infrastructure Epic**: Uses foundation components and RBAC integration

---

_See individual feature folders for detailed specifications and tasks._

