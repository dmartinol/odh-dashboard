# List Instances - Development Tasks

## Status: ✅ Complete

## Completed Tasks

- ✅ Sortable columns: Name (default), Status, Linked Registry, Endpoint, Transport
- ✅ Status indicators from Deployment phase (Running/Pending/Failed/Unknown)
- ✅ Linked registry display with clickable links to registry details
- ✅ Endpoint display with copy-to-clipboard functionality (checks `status.url` then `status.endpoint`)
- ✅ Transport protocol badges (stdio/sse/streamable-http)
- ✅ Support for unregistered servers (missing or incorrect labels)
- ✅ Clickable server names that open details modal
- ✅ Row action menus (hamburger) with View details, Register/Unregister, and Delete options
- ✅ Namespace selector with project context integration
- ✅ Search by name with partial matching
- ✅ Filter by linked registry (including "Unregistered" option)
- ✅ Filter by transport protocol (stdio/sse/streamable-http)
- ✅ Filter by deployment status (Running/Pending/Failed/Unknown)
- ✅ URL query parameter support for pre-filtering
- ✅ Server-registry matching using ToolHive label conventions
- ✅ Handle unregistered servers gracefully
- ✅ Display "Unregistered" label for servers without valid registry links
- ✅ Transport filtering fix (match only `server.transport` field)

## Components Created

- `McpServersPage.tsx` - Main servers table page
- `McpServersTable.tsx` - Table component with sorting

## Files Modified

- `packages/mcp/src/pages/McpServersPage.tsx`
- `packages/mcp/src/components/McpServersTable.tsx`

---

_This feature is complete. See [specs.md](./specs.md) for specifications._

