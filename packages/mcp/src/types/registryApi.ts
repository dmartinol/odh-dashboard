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
 * Response from /registry/{registryName}/v0.1/servers
 */
export interface RegistryApiServerListResponse {
  servers: RegistryApiServer[];
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
