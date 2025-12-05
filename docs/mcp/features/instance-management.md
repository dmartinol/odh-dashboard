# Instance Management Feature

**Phase**: 4 | **Status**: ✅ Complete | **Duration**: Week 7-8

## Overview

Complete servers management system for monitoring and managing deployed MCPServer instances with table-based UI, advanced filtering, and interactive server management.

## Goal

Provide comprehensive management capabilities for deployed MCP servers including monitoring, filtering, registration, and lifecycle operations.

## Tasks

### 1. Servers Table ✅ **COMPLETED**

- ✅ Sortable columns: Name (default), Status, Linked Registry, Endpoint, Transport
- ✅ Status indicators from Deployment phase (Running/Pending/Failed/Unknown)
- ✅ Linked registry display with clickable links to registry details
- ✅ Endpoint display with copy-to-clipboard functionality (checks `status.url` then `status.endpoint`)
- ✅ Transport protocol badges (stdio/sse/streamable-http)
- ✅ Support for unregistered servers (missing or incorrect labels)
- ✅ Clickable server names that open details modal
- ✅ Row action menus (hamburger) with View details, Register/Unregister, and Delete options

**Components**:
- `McpServersPage.tsx` - Main servers table page
- `McpServersTable.tsx` - Table component with sorting

### 2. Servers Toolbar ✅ **COMPLETED**

- ✅ Namespace selector with project context integration
- ✅ Search by name with partial matching
- ✅ Filter by linked registry (including "Unregistered" option)
- ✅ Filter by transport protocol (stdio/sse/streamable-http)
- ✅ Filter by deployment status (Running/Pending/Failed/Unknown)
- ✅ URL query parameter support for pre-filtering

**Components**:
- Toolbar components in `McpServersPage.tsx`

### 3. Server-Registry Matching ✅ **COMPLETED**

- ✅ Label-based matching using:
  - `toolhive.stacklok.io/registry-name`
  - `toolhive.stacklok.io/registry-namespace`
  - `toolhive.stacklok.io/server-registry-name`
- ✅ Handle unregistered servers gracefully
- ✅ Display "Unregistered" label for servers without valid registry links

**Utils**:
- Server-registry matching logic in `McpServersTable.tsx`

### 4. Registry Details Integration ✅ **COMPLETED**

- ✅ Removed "Deployed Servers" tab (functionality moved to Servers page)
- ✅ Renamed "Available Servers" tab to "Servers"
- ✅ Added prominent link/button to navigate to AI Asset Endpoints page with pre-filter
- ✅ Alert component explaining where to find deployed instances
- ✅ Clean separation between registry metadata and deployed instances

**Components**:
- Updated `McpRegistryDetailsPage.tsx`

### 5. Server Actions & Modals ✅ **COMPLETED**

#### McpDeployedServerDetailsModal ✅
- Overview tab: Server metadata, deployment info, endpoint with copy functionality
- Spec tab: Complete server specification in key-value format
- Status tab: Runtime status and conditions
- Labels & Annotations tab: All metadata labels and annotations
- Links to registry details page if server is registered

#### McpServerRegisterModal ✅
- Registry selector dropdown
- Server name in registry field with validation
- Preview of labels that will be added
- K8s API integration using patchMcpServer function

#### McpServerDeleteModal ✅
- Warning about irreversible action
- Server information display for confirmation
- K8s API integration using deleteMcpServer function

**Components**:
- `McpDeployedServerDetailsModal.tsx`
- `McpServerRegisterModal.tsx`
- `McpServerDeleteModal.tsx`

**API Functions**:
- `patchMcpServer()` - For label updates
- `deleteMcpServer()` - For server deletion

### Phase 4 UI Refinements ✅ **COMPLETED**

- ✅ **Registry Card Visual Improvements**:
  - Enhanced metadata display with proper icons
  - Improved layout using Flex components
  - Format: `<icon> <type> • <# servers> • <sync policy> • <last sync>`
- ✅ **Deploy Dialog Form Layout**:
  - Grouped related fields on same row
  - Updated default proxy mode from SSE to Streamable HTTP
  - Added password visibility toggle for secret environment variables
- ✅ **Transport Filtering**:
  - Fixed transport filter to match only `server.transport` field
  - Applied fix to both registry browser and deployed servers page
- ✅ **Modal Rendering Issues**:
  - Fixed double modal rendering
  - Removed duplicate modals
  - Resolved cancel button issues

### Phase 4 Advanced Deployment Configuration ✅ **COMPLETED**

**Problem Statement**: MCP servers fail to deploy when pulling images from authenticated container registries.

**Solution**: New **Advanced** tab in deployment dialog with user-friendly abstractions for `podTemplateSpec` configuration.

**Advanced Tab Features**:
1. **Image Pull Secrets** 🔐 - Multi-select dropdown for authenticated registry access
2. **Service Account** 👤 - Optional service account selector for custom RBAC
3. **Node Selector** 🎯 - Dynamic key-value pair editor for node scheduling
4. **Security Context** 🔒 - Run as non-root user, User ID/Group ID configuration

**Files Modified**:
- `packages/mcp/src/components/McpServerDeployModal.tsx` - Advanced tab UI
- `packages/mcp/src/hooks/useSecrets.ts` - New hook (48 lines)
- `packages/mcp/src/hooks/useServiceAccounts.ts` - New hook (53 lines)
- `packages/mcp/src/types/server.ts` - `podTemplateSpec` types

## Deliverables

✅ **ALL COMPLETED**

- ✅ Comprehensive servers table with sorting and filtering
- ✅ Namespace-aware server management
- ✅ Server-registry relationship visualization
- ✅ Integration with Registry Details page
- ✅ URL-based pre-filtering for deep linking
- ✅ Interactive server management with modals and actions
- ✅ Server registration/unregistration functionality
- ✅ Server deletion with confirmation
- ✅ Advanced deployment configuration for authenticated registries

## Technical Details

### Server Status Indicators
- **Running** ✅ - Server is running and healthy
- **Pending** ⏳ - Server is being created/updated
- **Failed** ❌ - Server deployment failed
- **Unknown** ❓ - Status cannot be determined

### Endpoint Display
- Checks `status.url` first, falls back to `status.endpoint`
- Copy-to-clipboard functionality
- Displays "—" if no endpoint available

### Server-Registry Matching
Uses ToolHive label conventions:
- `toolhive.stacklok.io/registry-name`
- `toolhive.stacklok.io/registry-namespace`
- `toolhive.stacklok.io/server-registry-name`

### Advanced Deployment Configuration
```yaml
spec:
  podTemplateSpec:
    spec:
      containers:
        - name: mcp
      imagePullSecrets:
        - name: quay-pull-secret
      serviceAccountName: mcp-server-sa
      nodeSelector:
        kubernetes.io/hostname: gpu-node-1
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
```

## Files Modified

**Pages**:
- `packages/mcp/src/pages/McpServersPage.tsx`
- `packages/mcp/src/pages/McpRegistryDetailsPage.tsx`

**Components**:
- `packages/mcp/src/components/McpServersTable.tsx`
- `packages/mcp/src/components/McpDeployedServerDetailsModal.tsx`
- `packages/mcp/src/components/McpServerRegisterModal.tsx`
- `packages/mcp/src/components/McpServerDeleteModal.tsx`
- `packages/mcp/src/components/McpServerDeployModal.tsx` (Advanced tab)

**Hooks**:
- `packages/mcp/src/hooks/useSecrets.ts` (new)
- `packages/mcp/src/hooks/useServiceAccounts.ts` (new)

**API**:
- `packages/mcp/src/api/servers.ts` - Added patchMcpServer, deleteMcpServer

## Summary

Complete servers management system with table-based UI. Namespace selector for multi-project server viewing. Advanced filtering by name, registry, transport (stdio/sse/streamable-http), and status. Sortable columns with default sort by name. Server-registry matching using ToolHive label conventions. Endpoint display with copy functionality. Clean integration with existing registry management features. Interactive server management with clickable server names, row action menus, and comprehensive modals. Server registration/unregistration functionality. Server deletion with confirmation dialog. Advanced deployment configuration for authenticated container registries. K8s API integration with full CRUD operations for server management. Foundation ready for Phase 5 production features.

---

_See [plan.md](../plan.md) for phase overview._

