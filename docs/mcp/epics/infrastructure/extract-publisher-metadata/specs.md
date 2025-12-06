# Extract Publisher Metadata from MCP v0.1 API

## Overview

The MCP v0.1 API format stores ToolHive-specific metadata (transport, tier, status, tags, tools, etc.) in the `_meta` field as base64-encoded JSON. This metadata needs to be extracted and mapped to `McpServerMetadata` fields to maintain compatibility with existing UI components that display badges and filters.

## Background

### ToolHive Registry Format

The original ToolHive registry format (see [toolhive registry.json](https://github.com/stacklok/toolhive/blob/main/pkg/registry/data/registry.json)) stores server properties directly:

```json
{
  "servers": {
    "server-name": {
      "transport": "stdio",
      "tier": "Official",
      "status": "Active",
      "tags": ["authentication", "2fa"],
      "tools": ["mcp-tool"],
      ...
    }
  }
}
```

### MCP v0.1 API Format

When ToolHive registries are converted to MCP v0.1 API format, these properties are stored in publisher metadata:

```json
{
  "server": {
    "name": "io.github.stacklok/authenticator-mcp-server",
    "packages": [...],
    "_meta": {
      "io.modelcontextprotocol.registry/publisher-provided": {
        "server_meta": "eyJpby5naXRodWIuc3RhY2tsb2siOiB7InF1YXkuaW8vbWNwLXNlcnZlcnMvYXV0aGVudGljYXRvcl9tY3AiOiB7InRhZ3MiOiBbImF1dGhlbnRpY2F0aW9uIiwgIjJmYSIsICJzZWN1cml0eSIsICJwYXNzd29yZHMiLCAiY3JlZGVudGlhbHMiXSwgInRpZXIiOiAiT2ZmaWNpYWwiLCAidG9vbHMiOiBbIm1jcC10b29sIl0sICJzdGF0dXMiOiAiQWN0aXZlIiwgIm1ldGFkYXRhIjogeyJwdWxscyI6IDE2LCAic3RhcnMiOiAyMywgImxhc3RfdXBkYXRlZCI6ICIyMDI1LTA4LTE5VDAwOjAwOjAwWiJ9LCAicGVybWlzc2lvbnMiOiB7Im5ldHdvcmsiOiB7Im91dGJvdW5kIjoge319fX19fQ=="
      }
    }
  }
}
```

The `server_meta` field contains base64-encoded JSON that, when decoded, becomes:

```json
{
  "io.github.stacklok": {
    "quay.io/mcp-servers/authenticator_mcp": {
      "tags": ["authentication", "2fa", "security", "passwords", "credentials"],
      "tier": "Official",
      "tools": ["mcp-tool"],
      "status": "Active",
      "metadata": {
        "pulls": 16,
        "stars": 23,
        "last_updated": "2025-08-19T00:00:00Z"
      },
      "permissions": {
        "network": {
          "outbound": {}
        }
      }
    }
  }
}
```

## Requirements

### Metadata Extraction

The `convertApiServerToMetadata` function must:

1. **Extract publisher metadata** from `_meta.io.modelcontextprotocol.registry/publisher-provided.server_meta`:
   - Decode base64 string to JSON
   - Parse the nested structure to find the relevant metadata
   - Handle cases where metadata is missing or malformed

2. **Map metadata fields** to `McpServerMetadata`:
   - `tier`: Map "Official" → "official", "Community" → "community", "Experimental" → "experimental"
   - `tags`: Extract tags array
   - `tools`: Extract tools array
   - `status`: Extract status (for future use)
   - `metadata`: Extract metadata object (pulls, stars, last_updated)

3. **Preserve existing logic**:
   - Continue extracting transport from `packages[].transport.type`
   - Continue extracting other fields from the standard API format
   - Merge publisher metadata with standard API data

### Type Definitions

Add type definitions for publisher metadata:

```typescript
interface PublisherMetadata {
  tags?: string[];
  tier?: string; // "Official" | "Community" | "Experimental"
  tools?: string[];
  status?: string; // "Active" | "Inactive" | etc.
  metadata?: {
    pulls?: number;
    stars?: number;
    last_updated?: string;
  };
  permissions?: {
    network?: {
      outbound?: Record<string, unknown>;
    };
  };
}

interface PublisherProvidedMeta {
  server_meta?: string; // base64-encoded JSON
  [key: string]: unknown;
}
```

### Error Handling

- Handle base64 decoding errors gracefully
- Handle JSON parsing errors gracefully
- Handle missing or malformed metadata gracefully
- Log warnings for debugging but don't fail the conversion

## Implementation Details

### Function: `extractPublisherMetadata`

```typescript
function extractPublisherMetadata(
  server: RegistryApiServer
): PublisherMetadata | null {
  // 1. Extract _meta.io.modelcontextprotocol.registry/publisher-provided
  // 2. Decode base64 server_meta field
  // 3. Parse JSON
  // 4. Navigate nested structure to find metadata for this server
  // 5. Return extracted metadata or null
}
```

### Function: `mapTierToMcpServerTier`

```typescript
function mapTierToMcpServerTier(tier?: string): McpServerTier | undefined {
  // Map "Official" → "official"
  // Map "Community" → "community"
  // Map "Experimental" → "experimental"
  // Return undefined for unknown values
}
```

### Update: `convertApiServerToMetadata`

Update the existing function to:
1. Call `extractPublisherMetadata` to get publisher metadata
2. Merge publisher metadata with standard API data
3. Map tier from publisher metadata
4. Merge tags from publisher metadata with any existing tags
5. Extract tools from publisher metadata

## UI Impact

This change will restore badge functionality for:
- **Tier badges**: Official (green), Community (blue), Experimental (orange)
- **Transport badges**: stdio, sse, streamable-http
- **Tags**: Displayed in filters and server cards
- **Tools count**: Displayed in server cards

## Testing

- Test with servers that have publisher metadata
- Test with servers that don't have publisher metadata (should still work)
- Test with malformed base64 (should handle gracefully)
- Test with malformed JSON (should handle gracefully)
- Test tier mapping for all variants
- Test tag merging (publisher tags + standard tags)

## References

- [ToolHive Registry Format](https://github.com/stacklok/toolhive/blob/main/pkg/registry/data/registry.json)
- [MCP Registry API v0.1 Specification](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/generic-registry-api.md)

