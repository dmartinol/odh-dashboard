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
