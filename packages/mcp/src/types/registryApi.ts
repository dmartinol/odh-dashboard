/**
 * Type definitions for MCP Registry API (v0.1) responses
 */

/**
 * MCP v0.1 API Server response structure
 * Based on the response from /registry/{registryName}/v0.1/servers
 */
export interface RegistryApiServer {
  server: {
    $schema?: string;
    name: string;
    description?: string;
    repository?: {
      url: string;
      source?: string;
    };
    version?: string;
    packages?: Array<{
      registryType?: string;
      identifier?: string;
      transport?: {
        type?: string;
      };
      environmentVariables?: Array<{
        name: string;
      }>;
    }>;
    _meta?: Record<string, unknown>;
  };
  _meta?: Record<string, unknown>;
}

/**
 * Pagination metadata from MCP v0.1 API responses
 * Based on: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/generic-registry-api.md
 */
export interface RegistryApiPaginationMetadata {
  count?: number;
  nextCursor?: string | null;
}

/**
 * Response from /registry/{registryName}/v0.1/servers
 * Supports cursor-based pagination as per MCP Registry API specification
 */
export interface RegistryApiServerListResponse {
  servers: RegistryApiServer[];
  metadata?: RegistryApiPaginationMetadata;
}

/**
 * Response from /extension/v0/registries/{registryName}
 */
export interface RegistryApiRegistryResponse {
  name: string;
  type?: string;
  syncStatus?: {
    phase?: string;
    lastAttempt?: string;
    lastSyncTime?: string;
    attemptCount?: number;
    serverCount?: number;
    message?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Publisher metadata extracted from _meta.io.modelcontextprotocol.registry/publisher-provided.server_meta
 * This contains ToolHive-specific metadata stored as base64-encoded JSON
 */
export interface PublisherMetadata {
  tags?: string[];
  tier?: string; // "Official" | "Community" | "Experimental"
  tools?: Array<string | { name: string; description?: string; inputSchema?: unknown }>;
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
  [key: string]: unknown; // Allow other fields
}

/**
 * Publisher-provided metadata structure from MCP v0.1 API
 */
export interface PublisherProvidedMeta {
  server_meta?: string; // base64-encoded JSON
  [key: string]: unknown;
}

/**
 * Nested structure of publisher metadata
 * Structure: { "io.github.stacklok": { "quay.io/mcp-servers/...": PublisherMetadata } }
 */
export interface NestedPublisherMetadata {
  [publisherName: string]: {
    [packageIdentifier: string]: PublisherMetadata;
  };
}
