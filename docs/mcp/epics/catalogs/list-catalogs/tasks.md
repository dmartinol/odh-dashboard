# List Catalogs - Development Tasks

## Status: 🟡 In Progress (Refresh Button Added)

## Completed Tasks

### Phase 1: Foundation & API Integration

- [x] Create TypeScript type definitions for catalog API responses
  - [x] `RegistryListResponse` interface
  - [x] `RegistryDetailsResponse` interface
  - [x] `CatalogData` interface for processed catalog information
  - [x] File: `packages/mcp/src/types/catalog.ts`

- [x] Create API client functions for catalog data fetching
  - [x] `fetchRegistryList(namespace: string, registryName: string): Promise<RegistryListResponse>`
  - [x] `fetchRegistryDetails(namespace: string, registryName: string, registryNameInCatalog: string): Promise<RegistryDetailsResponse>`
  - [x] Error handling for network failures and invalid responses
  - [x] File: `packages/mcp/src/api/catalog.ts`

- [x] Create custom hook for catalog data management
  - [x] `useCatalogData(namespace: string)` hook
  - [x] Fetch MCPRegistry instances from namespace(s)
  - [x] Extract endpoints and fetch catalog data via backend proxy
  - [x] Filter KUBERNETES and MANAGED types
  - [x] Handle loading and error states
  - [x] File: `packages/mcp/src/hooks/useCatalogData.ts`

### Phase 2: UI Components

- [x] Create catalog card component (basic version)
  - [x] `McpCatalogCard` component
  - [x] Display catalog title (registry name)
  - [x] Display description ("MCP catalog {registryName}")
  - [x] Add placeholder link to catalog details
  - [x] Follow ODH design patterns
  - [x] File: `packages/mcp/src/components/McpCatalogCard.tsx`

- [ ] Update catalog card to match registry card design
  - [ ] Add status label (from catalog syncStatus)
  - [ ] Add metadata line (type, server count, last sync time)
  - [ ] Add view button (similar to registry card)
  - [ ] Match visual style and layout of `McpRegistryCard`
  - [ ] Display registry information as metadata
  - [ ] Update `McpCatalogCard.tsx` component

- [x] Update McpCatalogsPage component
  - [x] Add project selector with `selectAllProjects={true}`
  - [x] Default to preferred project or empty string
  - [x] Integrate `useCatalogData` hook
  - [x] Display catalog cards in grid layout
  - [x] Add loading states (spinner, skeleton cards)
  - [x] Add empty state when no catalogs found
  - [x] Add error state with retry functionality
  - [x] File: `packages/mcp/src/pages/McpCatalogsPage.tsx`

### Phase 3: Backend Proxy Integration

- [x] Create backend API route at `backend/src/routes/api/mcpCatalogs/index.ts` to proxy requests to MCP registry API endpoints
- [x] Update `packages/mcp/src/api/catalog.ts` to call backend API instead of direct fetch to registry endpoints
- [x] Update documentation to reflect backend API architecture
- [x] Verify backend proxy works correctly and frontend can fetch catalog data
- [x] Implement DEV_MODE support with localhost:8888 port forwarding
- [x] Add endpoint URL normalization for Kubernetes internal services

### Phase 4: Error Handling & Edge Cases

- [x] Handle missing API endpoints
  - [x] Skip registries without `status.apiStatus.endpoint`
  - [x] Log warnings for missing endpoints
- [x] Handle API request failures
  - [x] Display error messages for failed requests
  - [x] Implement retry mechanism
  - [x] Show partial results if some requests fail
- [x] Handle invalid API responses
  - [x] Validate response structure using type guards
  - [x] Handle malformed JSON
  - [x] Skip invalid entries gracefully
- [x] Handle network timeouts
  - [x] Set appropriate timeout values
  - [x] Display timeout error messages
  - [x] Allow manual retry

### Phase 5: Code Quality

- [x] Fix linting errors
  - [x] Remove type assertions, use type guards instead
  - [x] Fix unused imports
  - [x] Fix template literal type issues
  - [x] Ensure all code passes `npm run lint`
- [x] Fix type-check errors
  - [x] Ensure all code passes `npm run type-check`
  - [x] Use proper type narrowing
  - [x] Handle optional properties correctly

## Pending Tasks

### Phase 6: Catalog Card Enhancement

- [ ] Update `McpCatalogCard` to match `McpRegistryCard` design
  - [ ] Add status label component (reuse `McpRegistryStatusLabel` or create similar)
  - [ ] Add metadata line with catalog type, server count, sync info
  - [ ] Add view button with navigation to catalog details
  - [ ] Match card header layout (title, actions, status)
  - [ ] Match card body layout (metadata, description, source info)
  - [ ] Update `CatalogData` type if needed to include sync status
  - [ ] Update `useCatalogData` hook to include sync status in catalog data

### Phase 7: Manual Refresh Button ✅

- [x] Add refresh button to page header
  - [x] Add RefreshIcon from PatternFly
  - [x] Position in page header next to title
  - [x] Call `refetch` from `useCatalogData` hook
  - [x] Show loading state while refreshing
  - [x] File: `packages/mcp/src/pages/McpCatalogsPage.tsx` (updated)

### Phase 8: Testing

- [ ] Unit tests for API client functions
- [ ] Unit tests for useCatalogData hook
- [ ] Component tests for updated catalog card
- [ ] Integration tests
- [ ] UI polish

## Files Created

- `packages/mcp/src/types/catalog.ts`
- `packages/mcp/src/api/catalog.ts`
- `packages/mcp/src/hooks/useCatalogData.ts`
- `packages/mcp/src/components/McpCatalogCard.tsx`
- `backend/src/routes/api/mcpCatalogs/index.ts`

## Files Modified

- `packages/mcp/src/pages/McpCatalogsPage.tsx`

---

_See [specs.md](./specs.md) for specifications._

