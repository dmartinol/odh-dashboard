# Unregister Server - Development Tasks

## Status: 🟡 In Progress

## Tasks

### Backend Implementation

- [ ] Add DELETE endpoint for server versions
  - Route: `DELETE /api/mcpRegistries/:namespace/:registryName/servers/:serverName/versions/:version`
  - Proxy to: `DELETE {endpoint}/registry/{registryName}/v0.1/servers/{serverName}/versions/{version}`
  - Handle URL encoding/decoding for server names
  - Support DEV_MODE port forwarding
  - File: `backend/src/routes/api/mcpRegistries/index.ts`

- [ ] Add helper function to fetch all versions of a server
  - Route: `GET /api/mcpRegistries/:namespace/:registryName/servers/:serverName/versions`
  - Or parse versions from server list response
  - File: `backend/src/routes/api/mcpRegistries/index.ts`

### Frontend API Client

- [ ] Add `unregisterServer` function to `registryApi.ts`
  - Function signature: `unregisterServer(namespace: string, registryName: string, serverName: string, version: string): Promise<void>`
  - Handles URL encoding for server names
  - File: `packages/mcp/src/api/registryApi.ts`

- [ ] Add `unregisterAllServerVersions` function
  - Fetches all versions and deletes each one
  - Handles errors gracefully
  - File: `packages/mcp/src/api/registryApi.ts`

### UI Components

- [ ] Create `McpServerUnregisterModal` component
  - Confirmation dialog with server information
  - Warning message about irreversible action
  - List of versions to be deleted
  - Loading state during deletion
  - File: `packages/mcp/src/components/McpServerUnregisterModal.tsx`

- [ ] Update `McpServerBrowser` component
  - Add `showUnregisterButton` prop (default: false)
  - Add `onServerUnregister` callback prop
  - Add Unregister button next to Deploy button
  - Only show when `showUnregisterButton` is true
  - File: `packages/mcp/src/components/McpServerBrowser.tsx`

- [ ] Update `McpServersTab` component
  - Add `onServerUnregister` prop
  - Pass through to `McpServerBrowser`
  - File: `packages/mcp/src/components/McpServersTab.tsx`

### Integration

- [ ] Update `McpRegistriesPage` component
  - Add unregister handler function
  - Pass `showUnregisterButton={true}` to `McpServersTab`
  - Pass `onServerUnregister` handler to `McpServersTab`
  - Handle notifications for success/error
  - Refresh server list after successful unregistration
  - File: `packages/mcp/src/pages/McpRegistriesPage.tsx`

### Testing

- [ ] Test unregistering a server with single version
- [ ] Test unregistering a server with multiple versions
- [ ] Test error handling when deletion fails
- [ ] Test URL encoding for server names with special characters
- [ ] Test automatic refresh after unregistration
- [ ] Test notification display

## Implementation Notes

### Server Name Encoding

Server names may contain special characters like `/` (e.g., `io.github.stacklok/adb-mysql-mcp-server`). These must be URL-encoded when used in API endpoints:
- Use `encodeURIComponent()` for server names
- Example: `io.github.stacklok/adb-mysql-mcp-server` → `io.github.stacklok%2Fadb-mysql-mcp-server`

### Version Detection

To delete all versions of a server:
1. Option 1: Fetch all servers and filter by name, then extract unique versions
2. Option 2: If API supports it, fetch versions endpoint: `/registry/{registryName}/v0.1/servers/{serverName}/versions`
3. Delete each version sequentially

### Error Handling

- If one version deletion fails, continue with others
- Show partial success notification if some versions were deleted
- Show error notification with details for failed deletions

---

_See [specs.md](./specs.md) for detailed specifications._

