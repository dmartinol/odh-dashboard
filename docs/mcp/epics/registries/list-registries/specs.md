# List Registries Feature

## Overview

The List Registries feature provides a dashboard view of MCP registries with project-based selection. When a project is selected, it verifies the registry exists, then displays the registry details view with Overview and Servers tabs, loading server data via the MCP v0.1 API through a backend proxy.

## Feature Goals

- Display project selector initialized to latest/preferred project
- Verify registry exists for selected project before loading
- Show registry details view (Overview and Servers tabs) when project is selected
- Load servers using MCP v0.1 API (`/registry/{projectName}/v0.1/servers`) via backend proxy
- Provide responsive layout with tabbed interface

## UI Requirements

### Registry Dashboard Layout

The registry dashboard displays:

1. **Page Header**
   - Title: "MCP Registries"
   - Create button for new registry
   - Refresh button to manually reload registry data and servers

2. **Project Selector**
   - Filter registries by project/namespace
   - Defaults to preferred project (from ProjectsContext)
   - Initialized to latest configuration/preferred project
   - When project is selected, use project name as registry name

3. **Registry Verification** (when project is selected)
   - Invoke `/extension/v0/registries/{projectName}` to verify registry exists
   - If registry not found, show information message: "No registry exists for this project"
   - If registry exists, proceed to load and display registry details

4. **Registry Details View** (when project is selected and registry exists)
   - **Overview Tab**: Registry metadata, source information, sync status
   - **Servers Tab**: List of servers loaded from MCP v0.1 API
   - Shows registry information and available servers

5. **Empty State** (when no project selected)
   - Message asking user to select a project
   - Option to create a new registry

### Visual Design

- Follows ODH design system patterns
- Uses PatternFly Tab components for Overview and Servers
- Uses PatternFly Alert/Info components for messages
- Responsive layout
- Status indicators with color coding

## Technical Implementation

### Components

- `McpRegistriesPage.tsx` - Main registry page (refactored to show details view)
- Tab components for Overview and Servers
- Information alert component for "no registry" message

### Hooks

- `useMcpRegistries(namespace)` - Real-time registry list via Kubernetes Watch API (for verification)
- New hook for fetching servers via MCP v0.1 API through backend proxy

### API Integration

**Registry Verification API**:
- **Endpoint**: `GET /extension/v0/registries/{registryName}`
- **Registry Name**: Uses project name as registry name
- **Base URL**: Extracted from MCPRegistry CRD `status.apiStatus.endpoint` (via backend proxy)
- **Purpose**: Verify registry exists before loading servers
- **Backend Route**: `GET /api/mcpRegistries/:namespace/:registryName/verify` (new)

**MCP v0.1 Servers API** (via Backend Proxy):
- **External Endpoint**: `GET {baseUrl}/registry/{registryName}/v0.1/servers`
- **Backend Proxy Route**: `GET /api/mcpRegistries/:namespace/:registryName/servers`
- **Registry Name**: Uses project name as registry name
- **Base URL**: Extracted from MCPRegistry CRD `status.apiStatus.endpoint`
- **Response Format**: MCP v0.1 server list format with pagination metadata
- **Pagination**: Supports cursor-based pagination (see [API Pagination](../infrastructure/api-pagination/specs.md))
  - Query parameters: `cursor` (optional), `limit` (optional, default: API default)
  - Response includes `metadata.nextCursor` for fetching subsequent pages
  - Frontend automatically fetches all pages to load complete server list
- **Usage**: Primary method for loading servers when registry has API endpoint

**Backend Proxy Architecture**:
- All frontend requests go through backend proxy (same pattern as catalog feature)
- Backend extracts `status.apiStatus.endpoint` from MCPRegistry CRD
- Backend proxies requests to external registry API
- Handles DEV_MODE with localhost:8888 port forwarding
- Security: Relies on Kubernetes RBAC for MCPRegistry access

**Fallback** (if no API endpoint):
- Continue to use existing discovery methods (Git, ConfigMap, HTTP) for registries without API endpoints

### Real-time Updates

- Uses `useK8sWatchResource` for real-time registry updates
- WebSocket communication via Kubernetes Watch API
- Server list updates when registry changes

### Manual Refresh

- **Refresh Button**: Manual refresh button in page header
- **Purpose**: Reload registry data and server list on demand
- **Use Case**: Kubernetes events don't show when servers are published via API, so manual refresh is needed after approving/publishing servers
- **Implementation**: Uses `refetch` functions from hooks (`useRegistryVerification`, `useRegistryApiServers`)
- **Location**: Next to "Create" button in page header
- **Icon**: PatternFly RefreshIcon

## Development Mode (DEV_MODE) Requirements

When running the ODH dashboard backend in development mode (`DEV_MODE=true`), the backend expects all internal Kubernetes service endpoints to be accessible via `localhost:8888` through port forwarding. This is the standard pattern for testing internal Kubernetes services across all ODH dashboard features.

**Developer Responsibilities:**
- **MUST** remember to open a port-forward for each internal Kubernetes service that the backend needs to access
- **MUST** use port `8888` consistently for all internal service port-forwards in DEV_MODE
- The target port (`<service-port>`) should be the actual port the service listens on in the cluster

**Example Port-Forward Command:**
```bash
kubectl port-forward -n <namespace> svc/<service-name> 8888:<service-port>
```

**How the Backend Handles This:**
- The backend automatically converts service URLs (e.g., `http://service-name.namespace:port`) to `http://localhost:8888` when `DEV_MODE=true` and a port-forward is detected
- This ensures that local backend instances can communicate with services running in the cluster

## Status

🟡 **Refactoring** - Currently shows registry cards. Refactoring to show registry details view with MCP v0.1 API integration via backend proxy.

---

_See [tasks.md](./tasks.md) for development tasks._

