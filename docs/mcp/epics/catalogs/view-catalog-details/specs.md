# View Catalog Details Feature

## Overview

The View Catalog Details feature provides a detailed view of a specific catalog, showing comprehensive information about the catalog's contents, metadata, and available servers. The catalog details page loads servers from the MCP v0.1 API using the catalog name as the registry name.

## Feature Goals

- Display detailed catalog information
- Show catalog metadata and sync status
- Load and display servers from `/registry/{catalogName}/v0.1/servers` API
- Provide navigation back to catalog list
- Enable server browsing and management

## UI Requirements

### Catalog Details Page Layout

The catalog details page will display:

1. **Breadcrumb Navigation**
   - AI Hub > MCP Catalogs > {catalog-name}
   - Clickable breadcrumbs for navigation

2. **Page Header**
   - Catalog name (from API response)
   - Catalog type badge (e.g., REMOTE, FILE)
   - Status label (sync status from API)
   - Server count badge
   - Last sync time (if available)
   - Description (if available)

3. **Tabbed Content**
   - **Overview Tab**:
     - Catalog metadata (name, type, description)
     - Source registry information (registry name, namespace)
     - Sync status details (phase, last sync time, message)
     - Created/updated timestamps
   - **Servers Tab**:
     - List of servers loaded from `/registry/{catalogName}/v0.1/servers` API
     - Use `McpServerBrowser` component to display servers
     - Show loading state while fetching servers
     - Show error state if API call fails
     - Display empty state if no servers found

## API Integration

### Server Loading

When the catalog details page is opened:

1. **Extract Catalog Information**
   - Catalog name from URL parameter: `/ai-hub/mcp/catalogs/{catalogName}`
   - Source registry namespace and name from catalog data

2. **Find MCPRegistry CRD**
   - Find any MCPRegistry CRD in the catalog's namespace that has an API endpoint
   - Extract the API endpoint from `status.apiStatus.endpoint`

3. **Load Servers via Backend Proxy**
   - Call backend API: `GET /api/mcpRegistries/{namespace}/{registryName}/servers`
   - Backend proxies to: `{endpoint}/registry/{catalogName}/v0.1/servers`
   - Note: `registryName` parameter is the catalog name (not the CRD name)
   - Use the same backend proxy pattern as the list-registries feature

4. **Display Servers**
   - Convert API server format to `McpServerMetadata` using `convertApiServerToMetadata`
   - Display servers using `McpServerBrowser` component
   - Handle loading, error, and empty states

### Backend Proxy

The backend proxy route `/api/mcpRegistries/:namespace/:registryName/servers` already exists and handles:
- Finding MCPRegistry CRD in namespace
- Extracting API endpoint
- Normalizing URLs for DEV_MODE (localhost:8888)
- Proxying to `/registry/{registryName}/v0.1/servers`

## Technical Implementation

### Components

- **McpCatalogDetailsPage**: Main catalog details page component
  - Similar structure to `McpRegistryDetailsPage`
  - Uses tabs for Overview and Servers
- **McpServerBrowser**: Reuse existing component for server display
- **Breadcrumb**: Navigation breadcrumbs

### Hooks

- **useRegistryApiServers**: Reuse existing hook to fetch servers via backend proxy
  - Parameters: namespace, catalogName (as registryName)
- **useCatalogData**: May need to fetch catalog details if not passed via route state

### API Client

- Reuse existing `fetchServersFromRegistryApi` function from `packages/mcp/src/api/registryApi.ts`
- Backend proxy route already exists: `/api/mcpRegistries/:namespace/:registryName/servers`

### Routing

- Route: `/ai-hub/mcp/catalogs/:catalogName`
- Add route to `McpRoutes.tsx`
- Extract catalog name from URL params
- Need to pass catalog metadata (namespace, registry info) via route state or fetch it

## Error Handling

- Handle missing catalog name in URL
- Handle catalog not found in API
- Handle missing API endpoint in MCPRegistry CRD
- Handle server API failures
- Display appropriate error messages

## Loading States

- Show loading spinner while fetching catalog details
- Show loading state while fetching servers
- Display empty state when no servers found
- Display error state with retry functionality

## Status

⏳ **Pending** - Catalog details page is not yet implemented. Ready for development.

---

_See [tasks.md](./tasks.md) for development tasks._

