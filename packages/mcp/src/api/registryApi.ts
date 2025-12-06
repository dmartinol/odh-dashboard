/**
 * API client functions for MCP Registry API (v0.1) via backend proxy
 */

import {
  RegistryApiServerListResponse,
  RegistryApiRegistryResponse,
  RegistryApiServer,
} from '../types/registryApi';
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
  if (!Array.isArray(data.servers)) {
    return false;
  }
  // metadata is optional, but if present should be an object
  if ('metadata' in data && data.metadata !== null && typeof data.metadata !== 'object') {
    return false;
  }
  return true;
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
 * Fetch servers from registry API via backend proxy with pagination support
 * Fetches all pages automatically using cursor-based pagination
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @param cursor Optional cursor for pagination (used internally for recursive fetching)
 * @param allServers Accumulated servers from previous pages (used internally)
 * @param limitOverride Optional limit override (used internally for fallback)
 * @returns Promise with complete server list (all pages)
 */
export const fetchServersFromRegistryApi = async (
  namespace: string,
  registryName: string,
  cursor?: string | null,
  allServers: RegistryApiServer[] = [],
  limitOverride?: number,
): Promise<McpServerMetadata[]> => {
  const url = new URL(
    `/api/mcpRegistries/${encodeURIComponent(namespace)}/${encodeURIComponent(
      registryName,
    )}/servers`,
    window.location.origin,
  );

  // Add pagination parameters
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  // Use override limit if provided, otherwise use a large limit to get all servers
  // Many registry APIs don't properly return nextCursor, so requesting a large limit
  // is more reliable than pagination
  const limit = limitOverride || 1000;
  url.searchParams.set('limit', String(limit));

  // Debug logging
  console.log(
    `[fetchServersFromRegistryApi] Fetching servers with limit=${limit}, cursor=${
      cursor || 'none'
    }, URL=${url.toString()}`,
  );

  try {
    const response = await fetch(url.toString(), {
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

    // Accumulate servers from this page
    const currentServers = [...allServers, ...data.servers];

    // Debug logging
    console.log(
      `[fetchServersFromRegistryApi] Received ${data.servers.length} servers (total so far: ${currentServers.length})`,
    );

    // Check if there are more pages using cursor-based pagination
    const nextCursor = data.metadata?.nextCursor;
    if (nextCursor) {
      // Recursively fetch next page with cursor
      return await fetchServersFromRegistryApi(
        namespace,
        registryName,
        nextCursor,
        currentServers,
        limitOverride,
      );
    }

    // Fallback: If we got exactly the limit number of servers and no nextCursor,
    // the API might not be returning nextCursor properly. Try fetching with a larger limit
    // to get all remaining servers in one go.
    // This handles cases where the API doesn't properly implement cursor-based pagination
    if (!cursor && data.servers.length === limit && limit < 5000) {
      console.log(
        `Got exactly ${limit} servers without nextCursor. Attempting fallback fetch with larger limit.`,
      );
      // Try fetching all remaining servers with a much larger limit
      const fallbackLimit = 5000;
      const fallbackUrl = new URL(
        `/api/mcpRegistries/${encodeURIComponent(namespace)}/${encodeURIComponent(
          registryName,
        )}/servers`,
        window.location.origin,
      );
      fallbackUrl.searchParams.set('limit', String(fallbackLimit));

      try {
        const fallbackResponse = await fetch(fallbackUrl.toString(), {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (fallbackResponse.ok) {
          const fallbackData: unknown = await fallbackResponse.json();
          if (isRegistryApiServerListResponse(fallbackData)) {
            // Use the fallback result if it has more servers
            if (fallbackData.servers.length > currentServers.length) {
              console.log(
                `Fallback fetch returned ${fallbackData.servers.length} servers (vs ${currentServers.length} from paginated fetch)`,
              );
              return fallbackData.servers.map(convertApiServerToMetadata);
            }
          }
        }
      } catch (fallbackError) {
        // If fallback fails, continue with current results
        console.warn('Fallback fetch failed, using paginated results:', fallbackError);
      }
    }

    // Convert all servers to McpServerMetadata format
    const result = currentServers.map(convertApiServerToMetadata);
    console.log(`[fetchServersFromRegistryApi] Returning ${result.length} total servers`);
    return result;
  } catch (error) {
    console.error(`Error fetching servers from ${url.toString()}:`, error);
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
