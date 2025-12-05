# Server Discovery Feature

**Phase**: 3 | **Status**: ✅ Complete | **Duration**: Week 5-6

## Overview

Complete server browsing and deployment functionality with advanced filtering, comprehensive server details, and full deployment workflows.

## Goal

Enable users to browse available MCP servers from registries, view detailed server information, and deploy servers with custom configurations.

## Tasks

### 1. Server Browser ✅ **COMPLETED**

- ✅ Card-based server listing with professional layout
- ✅ Advanced filtering (transport, tier, tags)
- ✅ Search functionality with real-time filtering
- ✅ Server categorization and grouping with badges

**Components**:
- `McpServerBrowser.tsx` - Main server browsing component
- `McpServerCard.tsx` - Individual server card

### 2. Server Details ✅ **COMPLETED**

- ✅ Comprehensive server information modal
- ✅ Tabbed interface (Overview, Tools, Config, Manual Installation)
- ✅ Logo integration from server metadata
- ✅ Technical specifications display with complete metadata

**Components**:
- `McpServerDetailsModal.tsx` - Server details modal with tabs

**Tabs**:
- **Overview**: Server metadata, description, transport, tier
- **Tools**: Available tools with descriptions and input schemas
- **Config**: Environment variables, prompts, resources
- **Manual Installation**: Docker commands and source repository links

### 3. Server Deployment ✅ **COMPLETED**

- ✅ Advanced deployment functionality (replaced quick deploy with full configuration)
- ✅ Complete deployment configuration dialog
- ✅ Namespace/project integration with ProjectsContext
- ✅ Resource validation and form validation

**Components**:
- `McpServerDeployModal.tsx` - Deployment configuration dialog

### 4. Advanced Deployment ✅ **COMPLETED**

- ✅ Full deployment configuration dialog with expandable advanced settings
- ✅ Environment variables management with add/remove functionality
- ✅ Resource limits and requests configuration
- ✅ MCPServer CRD generation with proper metadata and labels

**Advanced Tab Features**:
- **Image Pull Secrets**: Multi-select dropdown for authenticated registries
- **Service Account**: Optional service account selector
- **Node Selector**: Dynamic key-value pair editor
- **Security Context**: Run as non-root user, User ID/Group ID configuration

**Components**:
- Enhanced `McpServerDeployModal.tsx` with Advanced tab
- `useSecrets.ts` - K8s secrets discovery hook
- `useServiceAccounts.ts` - Service accounts discovery hook

### 5. Reference Implementation Fixes ✅ **COMPLETED**

- ✅ **Registry card**: Format matching reference implementation
  - ✅ Format: "git • 24 servers • auto 1h • 10/9/2025 ago"
  - ✅ Time formatting with formatTimeAgo function
  - ✅ Sync interval formatting with formatSyncInterval function
- ✅ **Registry page**:
  - ✅ Fixed Available servers tab showing (0) until pressed
  - ✅ Fixed server count in General tab
  - ✅ Added Git URL icon
  - ✅ Added Registry API Endpoint reference
- ✅ **Server card**:
  - ✅ Added tier badge (official, community, experimental)
  - ✅ Transport badge positioning
  - ✅ Fixed server card click behavior
- ✅ **Server details dialog**:
  - ✅ Updated tab schema to match reference: "Overview", "Tools", "Config", "Manual Installation"
  - ✅ Combined prompts and resources into "Config" tab
  - ✅ Added "Manual Installation" tab
- ✅ **Deploy dialog**:
  - ✅ Updated to 3-tab structure: "Server", "Environment Variables", "Resources"
  - ✅ Replaced expandable sections with proper tabbed interface
  - ✅ Enhanced server configuration
- ✅ **Server icon fetching**: Implementation of GitValidationService pattern
- ✅ **Tools list display fix**: Replaced large Card components with compact Label components
- ✅ **Environment variables in Config tab**: Added env_vars display with Required/Secret labels
- ✅ **MCP v0 API Support**: Added support for MCP v0 API format
- ✅ **Tools Tab Enhancement**: Improved tools tab display with detailed cards
- ✅ **MCP v0 API Tools Parsing**: Fixed tools parsing for string arrays

## Deliverables

✅ **ALL COMPLETED** _(Completed: January 2025)_

- ✅ Server discovery and browsing UI with real-time filtering
- ✅ Server deployment workflows with MCPServer CRD generation
- ✅ Configuration management system with advanced settings
- ✅ Server details modal with comprehensive information display

## Technical Details

### Server Filtering
- **Transport**: stdio, sse, streamable-http
- **Tier**: official, community, experimental
- **Tags**: Multi-tag filtering
- **Search**: Real-time name/description search

### Deployment Configuration
- **Basic**: Server name, namespace, transport settings
- **Environment Variables**: Add/remove with validation
- **Resources**: CPU and memory limits/requests
- **Advanced**: Image pull secrets, service accounts, node selectors, security context

### MCPServer CRD Generation
```yaml
apiVersion: toolhive.stacklok.dev/v1alpha1
kind: MCPServer
metadata:
  name: {server-name}
  namespace: {namespace}
  labels:
    toolhive.stacklok.io/registry-name: {registry-name}
    toolhive.stacklok.io/registry-namespace: {registry-namespace}
    toolhive.stacklok.io/server-registry-name: {server-registry-name}
spec:
  server: {server-config}
  podTemplateSpec: {advanced-config}
```

## Files Modified

**Components**:
- `packages/mcp/src/components/McpServerBrowser.tsx`
- `packages/mcp/src/components/McpServerCard.tsx`
- `packages/mcp/src/components/McpServerDetailsModal.tsx`
- `packages/mcp/src/components/McpServerDeployModal.tsx`

**Hooks**:
- `packages/mcp/src/hooks/useServers.ts`
- `packages/mcp/src/hooks/useSecrets.ts` (new)
- `packages/mcp/src/hooks/useServiceAccounts.ts` (new)

**Types**:
- `packages/mcp/src/types/server.ts` - Added `podTemplateSpec` support

**Utils**:
- `packages/mcp/src/utils/registryValidation.ts` - Git validation service

## Summary

Complete server discovery system with ToolHive registry format parsing. Professional server browser with advanced filtering (transport, tier, tags, search). Comprehensive server details modal with tabbed interface showing tools, prompts, and resources. Advanced deployment functionality with MCPServer CRD generation and resource configuration. Real-time server discovery integrated with registry details page "Available Servers" tab. Form validation, error handling, and environment variable management for deployments. Professional UI components following ODH design patterns with zero linting errors. Foundation ready for Phase 4 instance management development.

---

_See [plan.md](../plan.md) for phase overview._

