/**
 * API client functions for MCP Registry API (v0.1) via backend proxy
 */

import { RegistryApiServerListResponse, RegistryApiRegistryResponse } from '../types/registryApi';
import { McpServerMetadata, McpTransport } from '../types';

/**
 * Type guard to check if value is a Record (object but not array)
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard to validate RegistryApiServerListResponse
 */
const isRegistryApiServerListResponse = (data: unknown): data is RegistryApiServerListResponse => {
  if (!isRecord(data)) {
    return false;
  }
  // Check if 'servers' property exists and is an array
  if (!('servers' in data)) {
    return false;
  }
  return Array.isArray(data.servers);
};

/**
 * Type guard to validate RegistryApiRegistryResponse
 */
const isRegistryApiRegistryResponse = (data: unknown): data is RegistryApiRegistryResponse => {
  return typeof data === 'object' && data !== null && 'name' in data;
};

/**
 * Verify if a registry exists via backend proxy
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @returns Promise with verification result
 */
export const verifyRegistryExists = async (
  namespace: string,
  registryName: string,
): Promise<{ exists: boolean; registry?: RegistryApiRegistryResponse }> => {
  const url = `/api/mcpRegistries/${encodeURIComponent(namespace)}/${encodeURIComponent(
    registryName,
  )}/verify`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // Registry doesn't exist
      const data: unknown = await response.json();
      if (isRecord(data) && 'exists' in data && data.exists === false) {
        return { exists: false };
      }
      return { exists: false };
    }

    if (!response.ok) {
      throw new Error(`Failed to verify registry: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate response structure
    if (isRecord(data) && 'exists' in data && data.exists === true && 'registry' in data) {
      const { registry } = data;
      if (isRegistryApiRegistryResponse(registry)) {
        return { exists: true, registry };
      }
    }

    // If response doesn't match expected format, assume registry exists
    return { exists: true };
  } catch (error) {
    console.error(`Error verifying registry from ${url}:`, error);
    throw error;
  }
};

/**
 * Fetch servers from registry API via backend proxy
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @returns Promise with server list response
 */
export const fetchServersFromRegistryApi = async (
  namespace: string,
  registryName: string,
): Promise<RegistryApiServerListResponse> => {
  const url = `/api/mcpRegistries/${encodeURIComponent(namespace)}/${encodeURIComponent(
    registryName,
  )}/servers`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch servers: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate response structure using type guard
    if (!isRegistryApiServerListResponse(data)) {
      throw new Error('Invalid server list response: missing servers array');
    }

    return data;
  } catch (error) {
    console.error(`Error fetching servers from ${url}:`, error);
    throw error;
  }
};

/**
 * Convert MCP v0.1 API server format to McpServerMetadata
 * @param apiServer Server from MCP v0.1 API
 * @returns McpServerMetadata object
 */
export const convertApiServerToMetadata = (apiServer: {
  server: { name: string; [key: string]: unknown };
}): McpServerMetadata => {
  const { server } = apiServer;
  const packageInfo =
    Array.isArray(server.packages) && server.packages.length > 0 ? server.packages[0] : null;

  let transport: McpTransport | undefined;
  if (
    packageInfo &&
    typeof packageInfo.transport === 'object' &&
    packageInfo.transport !== null &&
    'type' in packageInfo.transport
  ) {
    const transportType = packageInfo.transport.type;
    if (
      transportType === 'stdio' ||
      transportType === 'sse' ||
      transportType === 'streamable-http'
    ) {
      transport = transportType;
    }
  }

  let repository: string | undefined;
  if (
    typeof server.repository === 'object' &&
    server.repository !== null &&
    'url' in server.repository &&
    typeof server.repository.url === 'string'
  ) {
    repository = server.repository.url;
  }

  return {
    name: server.name,
    displayName: typeof server.name === 'string' ? server.name : String(server.name),
    description: typeof server.description === 'string' ? server.description : undefined,
    version: typeof server.version === 'string' ? server.version : undefined,
    repository,
    transport,
    image:
      packageInfo && typeof packageInfo.identifier === 'string'
        ? packageInfo.identifier
        : undefined,
    // Extract tags from _meta if available
    tags: [],
    // Extract tools from _meta if available
    tools: [],
    // Extract prompts from _meta if available
    prompts: [],
    // Extract resources from _meta if available
    resources: [],
    // Extract env_vars from packageInfo
    // eslint-disable-next-line camelcase
    env_vars:
      packageInfo && Array.isArray(packageInfo.environmentVariables)
        ? packageInfo.environmentVariables.map((env: { name?: string }) => ({
            name: typeof env.name === 'string' ? env.name : '',
            required: false,
          }))
        : undefined,
  };
};
