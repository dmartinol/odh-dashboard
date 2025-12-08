# Approve Server - Development Tasks

## Status: 🟡 In Progress

## Phase 1: Backend API Implementation

- [ ] Create backend route for publishing servers
  - [ ] Route: `POST /api/mcpRegistries/:namespace/:registryName/publish`
  - [ ] Extract `status.apiStatus.endpoint` from MCPRegistry CRD
  - [ ] Normalize endpoint URL (handle DEV_MODE, Kubernetes service names)
  - [ ] Proxy request to `POST {endpoint}/registry/{registryName}/v0.1/publish`
  - [ ] Handle request body (server data in MCP v0.1 format)
  - [ ] Return success/error response
  - [ ] File: `backend/src/routes/api/mcpRegistries/index.ts` (modify)

- [ ] Add error handling for publish endpoint
  - [ ] Handle network errors
  - [ ] Handle API errors (4xx, 5xx)
  - [ ] Log errors for debugging
  - [ ] Return user-friendly error messages

## Phase 2: Frontend API Client

- [ ] Create API function for publishing servers
  - [ ] Function: `publishServerToRegistry(namespace: string, registryName: string, serverData: RegistryApiServer): Promise<void>`
  - [ ] Calls backend: `POST /api/mcpRegistries/{namespace}/{registryName}/publish`
  - [ ] Handles request body formatting
  - [ ] Error handling and retry logic
  - [ ] File: `packages/mcp/src/api/registryApi.ts` (modify)

- [ ] Create helper function to convert server metadata to MCP v0.1 format
  - [ ] Function: `convertServerMetadataToApiFormat(server: McpServerMetadata): RegistryApiServer`
  - [ ] Converts `McpServerMetadata` to `RegistryApiServer` format
  - [ ] Handles all required fields (name, description, repository, packages, etc.)
  - [ ] File: `packages/mcp/src/api/registryApi.ts` (add)

## Phase 3: Approval Modal Component

- [ ] Create `McpServerApproveModal` component
  - [ ] Props: `isOpen`, `onClose`, `server: McpServerMetadata`, `onApprove: (projects: string[]) => void`
  - [ ] Displays server information (name, description, tier, transport)
  - [ ] Multi-select project selector
  - [ ] Loading state during approval process
  - [ ] File: `packages/mcp/src/components/McpServerApproveModal.tsx` (new)

- [x] Implement project selection
  - [x] Fetch available projects from `ProjectsContext`
  - [x] Display projects in checkbox list or multi-select dropdown
  - [x] Allow selecting multiple projects
  - [x] Show project names and descriptions

- [ ] Redesign project selection UI for better UX
  - [ ] Add search/filter input for filtering projects by name
  - [ ] Add selected projects section with removable chips/badges
  - [ ] Redesign available projects list with click-to-select
  - [ ] Show visual indicators for selected projects
  - [ ] Improve layout for long project lists
  - [ ] File: `packages/mcp/src/components/McpServerApproveModal.tsx` (modify)

- [ ] Implement approval action
  - [ ] "Approve Server" button
  - [ ] Disabled when no projects selected
  - [ ] Shows loading state during processing
  - [ ] Calls `onApprove` callback with selected projects

## Phase 4: Integration with Server Browser

- [ ] Add Approve button to `McpServerBrowser`
  - [ ] Location: Next to Deploy button in server card
  - [ ] Icon: CheckCircleIcon or similar
  - [ ] Opens `McpServerApproveModal`
  - [ ] File: `packages/mcp/src/components/McpServerBrowser.tsx` (modify)

- [ ] Add approval handler
  - [ ] State for approval modal (open/close, selected server)
  - [ ] Handler for approve button click
  - [ ] Handler for approval completion

## Phase 5: Approval Flow Implementation

- [ ] Implement approval process
  - [ ] For each selected project:
    - [ ] Verify registry exists using `verifyRegistryExists`
    - [ ] If exists: Convert server to API format and publish
    - [ ] If not exists: Skip with warning
    - [ ] Track results (success, failure, skipped)
  - [ ] File: `packages/mcp/src/pages/McpCatalogDetailsPage.tsx` (modify) or create hook

- [ ] Create approval hook (optional)
  - [ ] Hook: `useApproveServer(server: McpServerMetadata)`
  - [ ] Handles approval logic
  - [ ] Returns: `{ approve: (projects: string[]) => Promise<void>, loading: boolean, error: string | null }`
  - [ ] File: `packages/mcp/src/hooks/useApproveServer.ts` (new, optional)

- [ ] Implement notification system
  - [ ] Success notifications: "Server approved to {count} project(s): {names}"
  - [ ] Failure notifications: "Failed to approve to {count} project(s): {names}"
  - [ ] Skipped notifications: "Skipped {count} project(s) (no registry): {names}"
  - [ ] Use `useNotification` hook

## Phase 6: Error Handling and Edge Cases

- [ ] Handle network errors
  - [ ] Show error notification with project name
  - [ ] Continue processing other projects
  - [ ] Track failed projects

- [ ] Handle registry not found
  - [ ] Skip project (not an error)
  - [ ] Show warning notification
  - [ ] Continue processing other projects

- [ ] Handle partial success
  - [ ] Show all three notification types if applicable
  - [ ] Provide clear summary of results

- [ ] Handle empty project selection
  - [ ] Disable "Approve Server" button
  - [ ] Show helper text

## Phase 7: Testing and Validation

- [ ] Test approval flow with single project
  - [ ] Verify registry exists
  - [ ] Publish server successfully
  - [ ] Verify server appears in registry

- [ ] Test approval flow with multiple projects
  - [ ] Some with registries, some without
  - [ ] Verify correct notifications
  - [ ] Verify all projects processed

- [ ] Test error handling
  - [ ] Network errors
  - [ ] Registry not found
  - [ ] Publish failures

- [ ] Test DEV_MODE port forwarding
  - [ ] Verify backend proxy works with localhost:8888
  - [ ] Test with actual registry API

- [ ] Verify linting and type checking
  - [ ] Run `npm run lint`
  - [ ] Run `npm run type-check`

## Files to Create

- `packages/mcp/src/components/McpServerApproveModal.tsx` - Approval dialog component
- `packages/mcp/src/hooks/useApproveServer.ts` - Approval hook (optional)

## Files to Modify

- `backend/src/routes/api/mcpRegistries/index.ts` - Add publish endpoint
- `packages/mcp/src/api/registryApi.ts` - Add publish function and conversion helper
- `packages/mcp/src/components/McpServerBrowser.tsx` - Add Approve button
- `packages/mcp/src/pages/McpCatalogDetailsPage.tsx` - Integrate approval flow (or use hook)

---

_This feature is in progress. See [specs.md](./specs.md) for specifications._

