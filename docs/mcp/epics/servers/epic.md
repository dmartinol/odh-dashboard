# Servers Epic

## Overview

The Servers epic enables users to discover, browse, and deploy MCP servers from registries. This epic includes server browsing, detailed server information viewing, and deployment workflows.

## Epic Goals

- Enable users to browse available MCP servers from registries
- Provide comprehensive server information and metadata
- Support server deployment with custom configurations
- Integrate with registry details for server discovery

## Key Features

- **Browse Servers**: Card-based server browser with advanced filtering (transport, tier, tags, search)
- **View Server Details**: Comprehensive server information modal with tabs (Overview, Tools, Config, Manual Installation)
- **Deploy Server**: Advanced deployment dialog with environment variables, resources, and advanced settings

## Navigation

- **Menu Location**: Accessible from Registry Details page > Available Servers tab
- **Route**: Integrated within registry details page

## Status

✅ **Complete** - All server discovery and deployment features are implemented and functional.

## Technical Details

- Parses ToolHive registry format for server metadata
- Supports MCP v0 API format
- Generates MCPServer CRDs for deployment
- Advanced deployment configuration (image pull secrets, service accounts, node selectors, security context)

## Related Epics

- **Registries Epic**: Servers are discovered from registry sources
- **Instances Epic**: Deployed servers become instances that can be managed
- **Infrastructure Epic**: Uses foundation components and validation services

---

_See individual feature folders for detailed specifications and tasks._

