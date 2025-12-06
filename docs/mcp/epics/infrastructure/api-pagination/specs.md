# API Pagination Support

## Overview

Support for cursor-based pagination in MCP Registry API (v0.1) endpoints, as specified in the [Generic Registry API Specification](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/generic-registry-api.md).

## Requirements

### API Specification

The MCP Registry API uses **cursor-based pagination** for efficient, stable results:

- **Initial request**: Omit the `cursor` parameter
- **Subsequent requests**: Use the `nextCursor` value from the previous response
- **End of results**: When `nextCursor` is null or empty, there are no more results
- **Cursor handling**: Cursors are opaque strings - never manually construct or modify them

### Endpoints Affected

- `GET /registry/{registryName}/v0.1/servers` - List all servers with pagination

### Response Format

```json
{
  "servers": [...],
  "metadata": {
    "count": 10,
    "nextCursor": "com.example/my-server:1.0.0"  // null when no more pages
  }
}
```

## Implementation

### Backend Proxy

The backend proxy route `/api/mcpRegistries/:namespace/:registryName/servers` must:

1. Accept optional query parameters:
   - `cursor`: Cursor string for pagination
   - `limit`: Page size limit (optional, defaults to API default, typically 50)

2. Forward these parameters to the external registry API:
   ```
   GET {endpoint}/registry/{registryName}/v0.1/servers?cursor={cursor}&limit={limit}
   ```

3. Return the complete response including `metadata.nextCursor` for client-side pagination handling

### Frontend API Client

The frontend API client (`fetchServersFromRegistryApi`) must:

1. **Automatically fetch all pages** by:
   - Making initial request without cursor with a large limit (1000) to get most/all servers
   - Checking `metadata.nextCursor` in response
   - Recursively fetching next page if `nextCursor` is present
   - Accumulating all servers from all pages
   - Returning complete list of all servers

2. **Fallback mechanism** for APIs that don't properly return `nextCursor`:
   - If exactly `limit` servers are returned without `nextCursor`, make a fallback request with a very large limit (5000)
   - This handles cases where the API doesn't properly implement cursor-based pagination
   - Use the fallback result if it contains more servers

3. Handle edge cases:
   - Empty `nextCursor` or `null` indicates last page
   - Network errors during pagination
   - Timeout handling for large datasets
   - APIs that don't return `nextCursor` even when more results exist

4. Return format: `Promise<McpServerMetadata[]>` (all servers from all pages)

### Type Definitions

Type definitions must include pagination metadata:

```typescript
interface RegistryApiPaginationMetadata {
  count?: number;
  nextCursor?: string | null;
}

interface RegistryApiServerListResponse {
  servers: RegistryApiServer[];
  metadata?: RegistryApiPaginationMetadata;
}
```

## Usage

### For Catalog Details

When viewing catalog details, the "Servers" tab automatically loads all servers using pagination:

```typescript
const { servers } = useRegistryApiServers(namespace, catalogName);
// servers contains ALL servers from all pages
```

### For Registry Details

When viewing registry details, the "Servers" tab automatically loads all servers using pagination:

```typescript
const { servers } = useRegistryApiServers(namespace, registryName);
// servers contains ALL servers from all pages
```

## Performance Considerations

- **Page size**: Default limit of 100 servers per page (configurable)
- **Loading state**: Show loading indicator while fetching all pages
- **Error handling**: If pagination fails partway through, show error with partial results if available
- **Caching**: Consider caching paginated results to avoid refetching on navigation

## Testing

- Test with registries/catalogs that have:
  - Fewer than 50 servers (single page)
  - Exactly 50 servers (boundary case)
  - More than 50 servers (multiple pages)
  - More than 200 servers (stress test)

- Verify:
  - All servers are loaded correctly
  - Loading state shows during pagination
  - Error handling works for network failures
  - Server count matches expected total

## References

- [Generic Registry API Specification](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/generic-registry-api.md)
- [MCP Registry API v0.1 Servers Endpoint](./openapi.yaml)

