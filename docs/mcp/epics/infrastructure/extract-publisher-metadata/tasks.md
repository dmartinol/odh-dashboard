# Extract Publisher Metadata - Development Tasks

## Status: 🟡 In Progress

## Phase 1: Type Definitions

- [ ] Add `PublisherMetadata` interface
  - [ ] `tags?: string[]`
  - [ ] `tier?: string`
  - [ ] `tools?: string[]`
  - [ ] `status?: string`
  - [ ] `metadata?: { pulls?, stars?, last_updated? }`
  - [ ] `permissions?: { network?: { outbound?: Record<string, unknown> } }`
  - [ ] File: `packages/mcp/src/types/registryApi.ts`

- [ ] Add `PublisherProvidedMeta` interface
  - [ ] `server_meta?: string` (base64-encoded JSON)
  - [ ] `[key: string]: unknown` (for other fields)
  - [ ] File: `packages/mcp/src/types/registryApi.ts`

- [ ] Add helper type for nested publisher metadata structure
  - [ ] Handle structure: `{ "io.github.stacklok": { "quay.io/mcp-servers/...": { ... } } }`
  - [ ] File: `packages/mcp/src/types/registryApi.ts`

## Phase 2: Metadata Extraction Functions

- [ ] Create `extractPublisherMetadata` function
  - [ ] Extract `_meta.io.modelcontextprotocol.registry/publisher-provided.server_meta`
  - [ ] Decode base64 string
  - [ ] Parse JSON
  - [ ] Navigate nested structure to find metadata for the server
  - [ ] Handle errors gracefully (return null on failure)
  - [ ] Add logging for debugging
  - [ ] File: `packages/mcp/src/api/registryApi.ts`

- [ ] Create `mapTierToMcpServerTier` function
  - [ ] Map "Official" → "official"
  - [ ] Map "Community" → "community"
  - [ ] Map "Experimental" → "experimental"
  - [ ] Handle case-insensitive matching
  - [ ] Return undefined for unknown values
  - [ ] File: `packages/mcp/src/api/registryApi.ts`

- [ ] Create helper function to find metadata in nested structure
  - [ ] Search through nested object structure
  - [ ] Match by server name or package identifier
  - [ ] Return first matching metadata object
  - [ ] File: `packages/mcp/src/api/registryApi.ts`

## Phase 3: Update convertApiServerToMetadata

- [ ] Update `convertApiServerToMetadata` function
  - [ ] Call `extractPublisherMetadata` to get publisher metadata
  - [ ] Extract tier from publisher metadata and map to `McpServerTier`
  - [ ] Merge tags from publisher metadata with existing tags
  - [ ] Extract tools from publisher metadata
  - [ ] Extract status from publisher metadata (for future use)
  - [ ] Extract metadata object (pulls, stars, last_updated)
  - [ ] Preserve existing logic for transport and other fields
  - [ ] File: `packages/mcp/src/api/registryApi.ts`

- [ ] Update tag merging logic
  - [ ] Combine tags from publisher metadata with tags from standard API
  - [ ] Remove duplicates
  - [ ] Preserve order (publisher tags first, then standard tags)

- [ ] Update tools extraction
  - [ ] Extract tools array from publisher metadata
  - [ ] Map to `McpServerMetadata.tools` format if needed

## Phase 4: Testing

- [ ] Test with server that has publisher metadata
  - [ ] Verify tier is extracted and mapped correctly
  - [ ] Verify tags are extracted and merged
  - [ ] Verify tools are extracted
  - [ ] Verify transport is still extracted from packages

- [ ] Test with server that doesn't have publisher metadata
  - [ ] Verify function doesn't fail
  - [ ] Verify standard API fields are still extracted

- [ ] Test with malformed base64
  - [ ] Verify error is handled gracefully
  - [ ] Verify function returns null for metadata but continues with standard fields

- [ ] Test with malformed JSON
  - [ ] Verify error is handled gracefully
  - [ ] Verify function returns null for metadata but continues with standard fields

- [ ] Test tier mapping
  - [ ] Test "Official" → "official"
  - [ ] Test "Community" → "community"
  - [ ] Test "Experimental" → "experimental"
  - [ ] Test case-insensitive variants
  - [ ] Test unknown values return undefined

- [ ] Test tag merging
  - [ ] Test with overlapping tags (should remove duplicates)
  - [ ] Test with no publisher tags (should use standard tags)
  - [ ] Test with no standard tags (should use publisher tags)

## Phase 5: UI Verification

- [ ] Verify tier badges display correctly
  - [ ] Official servers show green badge
  - [ ] Community servers show blue badge
  - [ ] Experimental servers show orange badge

- [ ] Verify transport badges display correctly
  - [ ] stdio, sse, streamable-http badges show correctly

- [ ] Verify tags are displayed in filters
  - [ ] Tags from publisher metadata appear in filter options
  - [ ] Tags filter works correctly

- [ ] Verify tools count displays correctly
  - [ ] Tools count badge shows correct number

- [ ] Verify server cards display all badges
  - [ ] Tier, transport, version, tools count all visible

## Files to Modify

- `packages/mcp/src/types/registryApi.ts` - Add type definitions
- `packages/mcp/src/api/registryApi.ts` - Add extraction functions and update converter

## Files to Test

- `packages/mcp/src/components/McpServerBrowser.tsx` - Verify badges display
- `packages/mcp/src/components/McpServerDetailsModal.tsx` - Verify metadata display
- `packages/mcp/src/pages/McpCatalogDetailsPage.tsx` - Verify catalog servers display
- `packages/mcp/src/pages/McpRegistriesPage.tsx` - Verify registry servers display

---

_See [specs.md](./specs.md) for detailed specifications._

