# View Catalog Details - Development Tasks

## Status: ⏳ Pending

## Development Tasks

### Phase 1: Routing and Page Structure

- [ ] Add route for catalog details page
  - [ ] Add route `/catalogs/:catalogName` to `McpRoutes.tsx`
  - [ ] Create `McpCatalogDetailsPage` component
  - [ ] Extract catalog name from URL params
  - [ ] Handle catalog metadata (pass via route state or fetch)

- [ ] Implement breadcrumb navigation
  - [ ] AI Hub > MCP Catalogs > {catalog-name}
  - [ ] Make breadcrumbs clickable for navigation
  - [ ] Navigate back to catalog list on breadcrumb click

### Phase 2: Page Header and Overview Tab

- [ ] Implement page header
  - [ ] Display catalog name
  - [ ] Display catalog type badge
  - [ ] Display status label (from syncStatus)
  - [ ] Display server count badge
  - [ ] Display last sync time (if available)
  - [ ] Display description (if available)

- [ ] Implement Overview Tab
  - [ ] Display catalog metadata (name, type, description)
  - [ ] Display source registry information (registry name, namespace)
  - [ ] Display sync status details (phase, last sync time, message)
  - [ ] Display created/updated timestamps
  - [ ] Reuse layout patterns from `McpRegistryDetailsPage`

### Phase 3: Servers Tab Implementation

- [ ] Implement server loading logic
  - [ ] Extract catalog name from URL params
  - [ ] Extract namespace from catalog data or route state
  - [ ] Use `useRegistryApiServers` hook with catalog name as registryName
  - [ ] Handle loading state while fetching servers

- [ ] Display servers using existing components
  - [ ] Use `McpServerBrowser` component to display servers
  - [ ] Pass servers from `useRegistryApiServers` hook
  - [ ] Handle error state if API call fails
  - [ ] Display empty state if no servers found

### Phase 4: Data Flow and State Management

- [ ] Determine how to pass catalog metadata to details page
  - [ ] Option A: Pass via route state when navigating from catalog card
  - [ ] Option B: Fetch catalog details from API using catalog name
  - [ ] Option C: Store catalog data in context or cache
  - [ ] Implement chosen approach

- [ ] Update catalog card navigation
  - [ ] Update `McpCatalogCard` to navigate with catalog metadata
  - [ ] Pass namespace, registry info, and catalog details via route state
  - [ ] Ensure catalog name is correctly passed to details page

### Phase 5: Error Handling and Edge Cases

- [ ] Handle missing catalog name in URL
  - [ ] Show error message if catalog name is missing
  - [ ] Redirect to catalog list if invalid

- [ ] Handle catalog not found
  - [ ] Show error message if catalog doesn't exist in API
  - [ ] Provide navigation back to catalog list

- [ ] Handle missing API endpoint
  - [ ] Show error message if MCPRegistry has no API endpoint
  - [ ] Provide helpful error message

- [ ] Handle server API failures
  - [ ] Display error message with retry option
  - [ ] Log errors for debugging

### Phase 6: Code Quality and Testing

- [ ] Fix linting errors
- [ ] Fix type-check errors
- [ ] Add unit tests for catalog details page
- [ ] Add component tests
- [ ] Add integration tests
- [ ] Verify DEV_MODE port forwarding works correctly

## Files to Create

- `packages/mcp/src/pages/McpCatalogDetailsPage.tsx` - Main catalog details page component

## Files to Modify

- `packages/mcp/src/McpRoutes.tsx` - Add route for catalog details
- `packages/mcp/src/components/McpCatalogCard.tsx` - Update navigation to pass catalog metadata
- `packages/mcp/src/types/catalog.ts` - May need to extend `CatalogData` type if needed

## Files to Reuse

- `packages/mcp/src/hooks/useRegistryApiServers.ts` - For fetching servers
- `packages/mcp/src/api/registryApi.ts` - API client functions
- `packages/mcp/src/components/McpServerBrowser.tsx` - For displaying servers
- `backend/src/routes/api/mcpRegistries/index.ts` - Backend proxy route (already exists)

---

_This feature is pending. See [specs.md](./specs.md) for specifications._

