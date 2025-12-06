# List Registries - Development Tasks

## Status: ✅ Completed

## Refactoring Tasks

### Phase 1: Project Selector and Registry Verification ✅

- [x] Ensure project selector is initialized to preferred project
  - [x] Verify `ProjectsContext` provides latest/preferred project
  - [x] Initialize `selectedNamespace` from `preferredProject?.metadata.name`
  - [x] Sync project selector with preferred project changes

- [x] Implement registry verification logic
  - [x] When project is selected, use project name as registry name
  - [x] Invoke `/extension/v0/registries/{projectName}` to verify registry exists
  - [x] Show information message if registry not found: "No registry exists for this project"
  - [x] Proceed to load registry details only if registry exists

- [x] Handle empty state when no project selected
  - [x] Show empty state message asking user to select a project
  - [x] Option to create a new registry

### Phase 2: Backend Proxy for Registry Verification ✅

- [x] Create backend API route for registry verification
  - [x] Route: `GET /api/mcpRegistries/:namespace/:registryName/verify`
  - [x] Extract `status.apiStatus.endpoint` from MCPRegistry CRD
  - [x] Proxy request to `{endpoint}/extension/v0/registries/{registryName}`
  - [x] Handle DEV_MODE with localhost:8888 port forwarding
  - [x] Return 404 if registry not found, 200 if found
  - [x] File: `backend/src/routes/api/mcpRegistries/index.ts` (updated)

- [x] Create frontend API client for registry verification
  - [x] Function: `verifyRegistryExists(namespace: string, registryName: string): Promise<{exists: boolean, registry?: RegistryApiRegistryResponse}>`
  - [x] Calls backend: `GET /api/mcpRegistries/{namespace}/{registryName}/verify`
  - [x] Returns verification result with registry data if exists
  - [x] File: `packages/mcp/src/api/registryApi.ts` (new)

### Phase 3: Backend Proxy for MCP v0.1 Servers API ✅

- [x] Create backend API route for MCP v0.1 servers endpoint
  - [x] Route: `GET /api/mcpRegistries/:namespace/:registryName/servers`
  - [x] Extract `status.apiStatus.endpoint` from MCPRegistry CRD
  - [x] Proxy request to `{endpoint}/registry/{registryName}/v0.1/servers`
  - [x] Handle DEV_MODE with localhost:8888 port forwarding
  - [x] Normalize service URLs for Kubernetes internal services
  - [x] File: `backend/src/routes/api/mcpRegistries/index.ts` (updated)

- [x] Create frontend API client for MCP v0.1 servers
  - [x] Function: `fetchServersFromRegistryApi(namespace: string, registryName: string): Promise<RegistryApiServerListResponse>`
  - [x] Calls backend: `GET /api/mcpRegistries/{namespace}/{registryName}/servers`
  - [x] Handle authentication via backend
  - [x] Error handling and retry logic
  - [x] File: `packages/mcp/src/api/registryApi.ts` (new)

- [x] Add type definitions for MCP v0.1 API responses
  - [x] `RegistryApiServerListResponse` interface
  - [x] `RegistryApiServer` interface
  - [x] `RegistryApiRegistryResponse` interface
  - [x] Map MCP v0.1 format to `McpServerMetadata` via `convertApiServerToMetadata`
  - [x] File: `packages/mcp/src/types/registryApi.ts` (new)

### Phase 4: React Hooks for Registry API

- [ ] Create React hook for registry verification
  - [ ] Hook: `useRegistryVerification(namespace: string, registryName: string)`
  - [ ] Returns: `{ exists: boolean, loading: boolean, error: string | null }`
  - [ ] Uses `verifyRegistryExists` API function
  - [ ] File: `packages/mcp/src/hooks/useRegistryVerification.ts` (new)

- [ ] Create React hook for MCP v0.1 API server fetching
  - [ ] Hook: `useRegistryApiServers(namespace: string, registryName: string)`
  - [ ] Uses `fetchServersFromRegistryApi` API function
  - [ ] Handle loading and error states
  - [ ] Returns: `{ servers: McpServerMetadata[], loading: boolean, error: string | null }`
  - [ ] File: `packages/mcp/src/hooks/useRegistryApiServers.ts` (new)

### Phase 5: UI Refactoring - Registry Details View

- [ ] Refactor `McpRegistriesPage` to show registry details view
  - [ ] Remove registry cards grid when project is selected
  - [ ] Show registry details with Overview and Servers tabs
  - [ ] Reuse components from `McpRegistryDetailsPage` where possible
  - [ ] Maintain project selector at top of page
  - [ ] Use project name as registry name

- [ ] Implement registry verification UI
  - [ ] Show loading state while verifying registry
  - [ ] Show information message if registry not found: "No registry exists for this project"
  - [ ] Only show registry details if registry exists

- [ ] Implement Overview Tab
  - [ ] Display registry metadata (name, description, source type)
  - [ ] Show sync status and last sync time
  - [ ] Display source information (Git URL, ConfigMap, HTTP endpoint)
  - [ ] Show API endpoint if available (`status.apiStatus.endpoint`)
  - [ ] Action buttons (Edit, Sync, Delete)

- [ ] Implement Servers Tab
  - [ ] Use `useRegistryApiServers` hook to fetch servers
  - [ ] Display servers in card or table format
  - [ ] Show loading state while fetching
  - [ ] Show error state if API call fails
  - [ ] Fallback to existing discovery methods if no API endpoint

- [ ] Handle empty states
  - [ ] No project selected: Show empty state asking to select a project
  - [ ] No registry found: Show information message
  - [ ] No servers found: Show empty state in Servers tab

### Phase 6: Fallback and Error Handling

- [ ] Implement fallback to existing discovery methods
  - [ ] If `status.apiStatus.endpoint` is not available, use Git/ConfigMap/HTTP discovery
  - [ ] If MCP v0.1 API call fails, fallback to existing methods
  - [ ] Show appropriate error messages

- [ ] Error handling improvements
  - [ ] Handle network errors gracefully
  - [ ] Show user-friendly error messages
  - [ ] Provide retry functionality
  - [ ] Log errors for debugging

### Phase 7: Testing and Validation

- [ ] Test project selector initialization
  - [ ] Verify default to preferred project
  - [ ] Test project switching
  - [ ] Test with no preferred project

- [ ] Test registry verification
  - [ ] Test with existing registry
  - [ ] Test with non-existing registry
  - [ ] Test error handling

- [ ] Test MCP v0.1 API integration
  - [ ] Test with registry that has API endpoint
  - [ ] Test with registry without API endpoint (fallback)
  - [ ] Test error handling
  - [ ] Test loading states
  - [ ] Test DEV_MODE port forwarding

- [ ] Test UI refactoring
  - [ ] Verify Overview tab displays correctly
  - [ ] Verify Servers tab displays correctly
  - [ ] Test empty states
  - [ ] Test information messages
  - [ ] Test responsive design

## Files to Create

- `packages/mcp/src/api/registryApi.ts` - MCP v0.1 API client (verification + servers)
- `packages/mcp/src/hooks/useRegistryVerification.ts` - Hook for registry verification
- `packages/mcp/src/hooks/useRegistryApiServers.ts` - Hook for API server fetching
- `packages/mcp/src/types/registryApi.ts` - Type definitions for MCP v0.1 API
- `backend/src/routes/api/mcpRegistries/verify.ts` - Backend proxy route for verification
- `backend/src/routes/api/mcpRegistries/servers.ts` - Backend proxy route for servers

## Files to Modify

- `packages/mcp/src/pages/McpRegistriesPage.tsx` - Refactor to show details view
- `packages/mcp/src/components/McpRegistryCard.tsx` - May be removed or repurposed
- `packages/mcp/src/pages/McpRegistryDetailsPage.tsx` - Extract reusable components

## Acceptance Criteria

- [ ] Project selector is initialized to preferred project
- [ ] When project is selected, registry is verified using `/extension/v0/registries/{projectName}`
- [ ] Information message is shown if registry does not exist
- [ ] When registry exists, registry details view is shown
- [ ] Overview tab displays registry metadata correctly
- [ ] Servers tab loads servers using MCP v0.1 API via backend proxy when available
- [ ] Backend proxy handles DEV_MODE with localhost:8888 port forwarding
- [ ] Fallback to existing discovery methods when API endpoint is not available
- [ ] Error states are handled gracefully
- [ ] Empty states are shown appropriately (no project selected)
- [ ] All existing functionality (create, edit, delete, sync) still works

---

_This feature is being refactored. See [specs.md](./specs.md) for updated specifications._
