# List Catalogs Feature

## Overview

The List Catalogs feature allows users to browse and view catalogs from MCP registries through their API endpoints. Catalogs are displayed in a card-based interface with project/namespace filtering capabilities.

## Feature Goals

- Display available MCP catalogs from registry API endpoints
- Support project/namespace filtering with "All projects" option
- Provide card-based catalog browsing interface
- Enable navigation to catalog details (future implementation)

## UI Requirements

### Catalog View Layout

The catalog view displays:

1. **Project Selector**
   - Includes "All projects" option (when `selectAllProjects` prop is enabled)
   - Defaults to the value selected in the Projects menu, or to no value (empty string)
   - Uses `ProjectSelector` component with `selectAllProjects={true}`

2. **Catalog Cards**
   - Card-based layout for displaying catalogs
   - Each card contains:
     - **Title**: Registry name from API response
     - **Description**: Fixed format "MCP catalog {registryName}"
     - **Link**: Placeholder link to catalog details page (not implemented yet)

### Visual Design

- Follows ODH design system patterns
- Uses PatternFly Card components
- Responsive grid layout
- Consistent with other MCP feature pages (Registries, Servers)

## API Integration

### Data Fetching Flow

1. **Fetch MCPRegistry Instances**
   - Query MCPRegistry CRDs from the selected project namespace
   - If "All projects" is selected (empty string), query from all namespaces
   - Use `useMcpRegistries` hook with appropriate namespace parameter

2. **Extract API Endpoints**
   - For each MCPRegistry instance, extract the endpoint from:
     ```typescript
     registry.status?.apiStatus?.endpoint
     ```
   - Example: `http://toolhive-git-registry-api.toolhive-system:8080`

3. **Fetch Registry List via Backend Proxy**
   - For each registry with a valid endpoint, call backend API:
     ```
     GET /api/mcpCatalogs/{namespace}/{registryName}
     ```
   - Backend proxies to: `{endpoint}/extension/v0/registries`

4. **Filter Registries**
   - Remove registries with `type` set to:
     - `"KUBERNETES"`
     - `"MANAGED"`
   - Keep only registries with other types (e.g., `"REMOTE"`)

5. **Fetch Registry Details via Backend Proxy**
   - For each remaining registry, fetch detailed information:
     ```
     GET /api/mcpCatalogs/{namespace}/{registryName}/{registryNameInCatalog}
     ```
   - Backend proxies to: `{endpoint}/extension/v0/registries/{registryNameInCatalog}`

6. **Display Catalog Cards**
   - Use the `name` field as the card title
   - Set description as: `"MCP catalog {registryName}"`
   - Store full registry details for future catalog details page

### Backend Proxy Architecture

All frontend requests to MCP registry API endpoints are proxied through the backend for security and authentication:

- **Security**: Internal Kubernetes service endpoints are not exposed directly to the browser
- **Authentication**: The backend handles authentication and authorization
- **Consistency**: Follows the established pattern for other ODH dashboard features

## Development Mode (DEV_MODE) Requirements

### Port Forwarding Setup

**⚠️ IMPORTANT: For local development testing, port forwarding MUST be configured manually.**

When running the ODH dashboard backend in development mode (`DEV_MODE=true`), the backend expects all internal Kubernetes service endpoints to be accessible via `localhost:8888` through port forwarding.

**Required Setup:**

1. **Identify the MCP Registry API Service**
   - Find the service name from the MCPRegistry CRD status: `status.apiStatus.endpoint`
   - Example: `http://toolhive-git-registry-api.toolhive-system:8080`
   - Service name: `toolhive-git-registry-api`
   - Namespace: `toolhive-system`
   - Service port: `8080`

2. **Set up Port Forwarding**
   ```bash
   kubectl port-forward -n <namespace> svc/<service-name> 8888:<service-port>
   ```
   
   Example:
   ```bash
   kubectl port-forward -n toolhive-system svc/toolhive-git-registry-api 8888:8080
   ```

3. **Keep Port Forwarding Active**
   - The port-forward command must remain running in a separate terminal
   - If the port-forward is interrupted, catalog fetching will fail
   - The backend will automatically convert service URLs to `localhost:8888` in DEV_MODE

**General Approach:**

This `localhost:8888` approach is the standard pattern for testing internal Kubernetes services in DEV_MODE across all ODH dashboard features. Developers must remember to:

- Set up port forwarding before testing catalog features
- Use port `8888` consistently for all internal service port-forwards in DEV_MODE
- Keep port-forward sessions active during development

**Environment Variable Override:**

If you need to use a different host/port, you can set environment variables:
- `MCP_REGISTRY_API_HOST` - Override host (default: `localhost`)
- `MCP_REGISTRY_API_PORT` - Override port (default: `8888`)
- `MCP_REGISTRY_<SERVICE_NAME>_HOST` - Service-specific host override
- `MCP_REGISTRY_<SERVICE_NAME>_PORT` - Service-specific port override

## Technical Implementation

### Components

- **McpCatalogsPage**: Main page component
- **McpCatalogCard**: Individual catalog card component
- **ProjectSelector**: Reuse existing component with `selectAllProjects={true}`

### Hooks

- **useMcpRegistries**: Fetch MCPRegistry CRDs from Kubernetes
- **useCatalogData**: Custom hook to fetch and process catalog data from API endpoints via backend proxy

### API Client

- Frontend API client functions (in `packages/mcp/src/api/catalog.ts`):
  - `fetchRegistryList(namespace: string, registryName: string): Promise<RegistryListResponse>`
    - Calls backend API: `GET /api/mcpCatalogs/{namespace}/{registryName}`
  - `fetchRegistryDetails(namespace: string, registryName: string, registryNameInCatalog: string): Promise<RegistryDetailsResponse>`
    - Calls backend API: `GET /api/mcpCatalogs/{namespace}/{registryName}/{registryNameInCatalog}`
- Backend proxy routes (in `backend/src/routes/api/mcpCatalogs/index.ts`):
  - Proxies requests to MCP registry API endpoints
  - Extracts endpoint from MCPRegistry CRD status
  - Handles authentication and error responses
  - Normalizes service URLs for DEV_MODE (localhost:8888)

### Type Definitions

- `RegistryListResponse` - API response for registry list
- `RegistryDetailsResponse` - API response for registry details
- `CatalogData` - Processed catalog information

## Error Handling

- Handle missing `apiStatus.endpoint` gracefully (skip registry)
- Handle API request failures (show error state, allow retry)
- Handle invalid API responses (log error, skip invalid entries)
- Handle network timeouts (show timeout message)

## Loading States

- Show loading spinner while fetching MCPRegistry instances
- Show loading state while fetching API data
- Display empty state when no catalogs are found
- Display error state with retry functionality

## Status

✅ **Complete** - Catalog listing is fully implemented with backend proxy and DEV_MODE support.

---

_See [tasks.md](./tasks.md) for development tasks._

