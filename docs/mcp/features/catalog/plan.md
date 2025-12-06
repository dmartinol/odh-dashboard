# MCP Catalog Feature - Development Plan

## Overview

Implementation plan for the MCP Catalog feature that displays catalogs from MCP registry API endpoints.

## Development Tasks

### Phase 1: Foundation & API Integration

- [x] Create TypeScript type definitions for catalog API responses
  - [x] `RegistryListResponse` interface
  - [x] `RegistryDetailsResponse` interface
  - [x] `CatalogData` interface for processed catalog information
  - [x] File: `packages/mcp/src/types/catalog.ts`

- [x] Create API client functions for catalog data fetching
  - [x] `fetchRegistryList(endpoint: string): Promise<RegistryListResponse>`
  - [x] `fetchRegistryDetails(endpoint: string, registryName: string): Promise<RegistryDetailsResponse>`
  - [x] Error handling for network failures and invalid responses
  - [x] File: `packages/mcp/src/api/catalog.ts`

- [x] Create custom hook for catalog data management
  - [x] `useCatalogData(namespace: string)` hook
  - [x] Fetch MCPRegistry instances from namespace(s)
  - [x] Extract endpoints and fetch catalog data
  - [x] Filter KUBERNETES and MANAGED types
  - [x] Handle loading and error states
  - [x] File: `packages/mcp/src/hooks/useCatalogData.ts`

### Phase 2: UI Components

- [x] Create catalog card component
  - [x] `McpCatalogCard` component
  - [x] Display catalog title (registry name)
  - [x] Display description ("MCP catalog {registryName}")
  - [x] Add placeholder link to catalog details
  - [x] Follow ODH design patterns
  - [x] File: `packages/mcp/src/components/McpCatalogCard.tsx`

- [x] Update McpCatalogsPage component
  - [x] Add project selector with `selectAllProjects={true}`
  - [x] Default to preferred project or empty string
  - [x] Integrate `useCatalogData` hook
  - [x] Display catalog cards in grid layout
  - [x] Add loading states (spinner, skeleton cards)
  - [x] Add empty state when no catalogs found
  - [x] Add error state with retry functionality
  - [x] File: `packages/mcp/src/pages/McpCatalogsPage.tsx`

### Phase 3: Error Handling & Edge Cases

- [x] Handle missing API endpoints
  - [x] Skip registries without `status.apiStatus.endpoint`
  - [x] Log warnings for missing endpoints

- [x] Handle API request failures
  - [x] Display error messages for failed requests
  - [x] Implement retry mechanism
  - [x] Show partial results if some requests fail

- [x] Handle invalid API responses
  - [x] Validate response structure
  - [x] Handle malformed JSON
  - [x] Skip invalid entries gracefully

- [x] Handle network timeouts
  - [x] Set appropriate timeout values
  - [x] Display timeout error messages
  - [x] Allow manual retry

### Phase 4: Code Quality & Testing

- [x] Fix linting errors
  - [x] Remove type assertions, use type guards instead
  - [x] Fix unused imports
  - [x] Fix template literal type issues
  - [x] Ensure all code passes `npm run lint`

- [x] Fix type-check errors
  - [x] Ensure all code passes `npm run type-check`
  - [x] Use proper type narrowing
  - [x] Handle optional properties correctly

- [ ] Unit tests for API client functions
  - [ ] Test successful API calls
  - [ ] Test error handling
  - [ ] Test response parsing

- [ ] Unit tests for useCatalogData hook
  - [ ] Test data fetching logic
  - [ ] Test filtering logic
  - [ ] Test loading and error states

- [ ] Component tests
  - [ ] Test McpCatalogCard rendering
  - [ ] Test McpCatalogsPage with various states
  - [ ] Test project selector integration

- [ ] Integration tests
  - [ ] Test full catalog fetching flow
  - [ ] Test project selector changes
  - [ ] Test "All projects" functionality

- [ ] UI polish
  - [ ] Verify responsive design
  - [ ] Verify accessibility
  - [ ] Verify loading states
  - [ ] Verify error states

## Acceptance Criteria

- [x] Project selector displays with "All projects" option
- [x] Project selector defaults to preferred project or empty string
- [x] Catalog cards display correctly with title and description
- [x] Catalogs are fetched from all MCPRegistry instances in selected namespace(s)
- [x] KUBERNETES and MANAGED type registries are filtered out
- [x] API endpoints are constructed correctly from `status.apiStatus.endpoint`
- [x] Loading states are shown during data fetching
- [x] Error states are handled gracefully
- [x] Empty state is shown when no catalogs are found
- [x] Catalog details link is present (placeholder for now)

## Implementation Notes

### API Endpoint Construction

The API endpoint is constructed by appending `/extension/v0/registries` to the `status.apiStatus.endpoint` value:

```typescript
const endpoint = registry.status?.apiStatus?.endpoint;
if (endpoint) {
  const registryListUrl = `${endpoint}/extension/v0/registries`;
  const registryDetailsUrl = `${endpoint}/extension/v0/registries/${registryName}`;
}
```

### Project Selector Integration

Use the existing `ProjectSelector` component with the `selectAllProjects` prop:

```tsx
// eslint-disable-next-line
<ProjectSelector
  namespace={selectedNamespace}
  onSelection={handleProjectSelection}
  selectAllProjects
  placeholder="Select a project"
/>
```

When "All projects" is selected, `onSelection` is called with an empty string, which should be passed to `useMcpRegistries('')` to fetch from all namespaces.

### Filtering Logic

After fetching the registry list from the API, filter out registries:

```typescript
const filteredRegistries = registries.filter(
  (registry) => registry.type !== 'KUBERNETES' && registry.type !== 'MANAGED'
);
```

---

_This plan will be updated as development progresses. Check off tasks as they are completed._

