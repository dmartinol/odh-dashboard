/**
 * API client functions for MCP Registry API (v0.1) via backend proxy
 */

import {
  RegistryApiServerListResponse,
  RegistryApiRegistryResponse,
  RegistryApiServer,
  ServerJSON,
  PublisherMetadata,
} from '../types/registryApi';
import { McpServerMetadata, McpTransport, McpServerTier, McpToolMetadata } from '../types';

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
 * Type guard to check if value is a tool-like object
 */
const isToolLike = (
  value: unknown,
): value is { name: string; description?: unknown; inputSchema?: unknown } => {
  return isRecord(value) && typeof value.name === 'string';
};

/**
 * Extract publisher metadata from _meta field
 * Decodes base64-encoded server_meta and navigates nested structure
 * @param server Server object from MCP v0.1 API
 * @returns PublisherMetadata or null if not found or error
 */
const extractPublisherMetadata = (server: {
  name: string;
  _meta?: Record<string, unknown>;
  packages?: Array<{ identifier?: string }>;
}): PublisherMetadata | null => {
  try {
    // Extract publisher-provided metadata
    const meta = server._meta;
    if (!meta || typeof meta !== 'object') {
      return null;
    }

    const publisherProvidedKey = 'io.modelcontextprotocol.registry/publisher-provided';
    const publisherProvidedValue = meta[publisherProvidedKey];
    if (
      !publisherProvidedValue ||
      typeof publisherProvidedValue !== 'object' ||
      !isRecord(publisherProvidedValue) ||
      !('server_meta' in publisherProvidedValue)
    ) {
      return null;
    }
    // eslint-disable-next-line camelcase
    const serverMetaValue = publisherProvidedValue.server_meta;
    if (typeof serverMetaValue !== 'string' || !serverMetaValue) {
      return null;
    }

    // Decode base64 string
    const decodedJson = atob(serverMetaValue);
    let parsed: unknown = JSON.parse(decodedJson);

    // Handle case where decoded JSON contains another server_meta field (nested base64)
    // Some registries encode the metadata twice: first decode gives { server_meta: "base64..." }
    // which needs to be decoded again to get the actual metadata structure
    if (isRecord(parsed) && 'server_meta' in parsed && typeof parsed.server_meta === 'string') {
      // Decode the nested server_meta field
      try {
        const nestedDecoded = atob(parsed.server_meta);
        parsed = JSON.parse(nestedDecoded);
        console.log('[extractPublisherMetadata] Decoded nested server_meta field');
      } catch (nestedError) {
        console.warn('Failed to decode nested server_meta:', nestedError);
        // Continue with the outer parsed object
      }
    }

    // Navigate nested structure: { "io.github.stacklok": { "quay.io/mcp-servers/...": { ... } } }
    // OR direct structure: { "tags": [...], "tier": "...", ... }
    if (!isRecord(parsed)) {
      return null;
    }

    // Check if this is a direct metadata structure (has tags, tier, tools directly)
    if ('tags' in parsed || 'tier' in parsed || 'tools' in parsed) {
      console.log('[extractPublisherMetadata] Found direct metadata structure');
      const result: PublisherMetadata = {
        tags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
        tier: typeof parsed.tier === 'string' ? parsed.tier : undefined,
        tools: Array.isArray(parsed.tools) ? parsed.tools : undefined,
        status: typeof parsed.status === 'string' ? parsed.status : undefined,
        metadata: isRecord(parsed.metadata) ? parsed.metadata : undefined,
        permissions: isRecord(parsed.permissions) ? parsed.permissions : undefined,
      };
      return result;
    }

    // Find metadata by matching package identifier
    const packageIdentifier =
      Array.isArray(server.packages) && server.packages.length > 0
        ? server.packages[0]?.identifier
        : undefined;

    // Search through nested structure
    for (const publisherName in parsed) {
      if (Object.prototype.hasOwnProperty.call(parsed, publisherName)) {
        const publisherData = parsed[publisherName];
        if (isRecord(publisherData)) {
          // Try to find metadata by package identifier or server name
          for (const key in publisherData) {
            if (Object.prototype.hasOwnProperty.call(publisherData, key)) {
              const metadata = publisherData[key];
              if (isRecord(metadata)) {
                // Match by package identifier (exact match) or by server name (contains check)
                const serverNamePart = server.name.split('/').pop() || '';
                const matchesIdentifier = key === packageIdentifier;
                const matchesServerName = key.includes(serverNamePart);

                if (matchesIdentifier || matchesServerName) {
                  // Type guard to ensure metadata has expected structure
                  if ('tags' in metadata || 'tier' in metadata || 'tools' in metadata) {
                    const packageId = packageIdentifier || 'unknown';
                    console.log(
                      `[extractPublisherMetadata] Found metadata for ${server.name} (package: ${packageId}, key: ${key})`,
                    );
                    const result: PublisherMetadata = {
                      tags: Array.isArray(metadata.tags) ? metadata.tags : undefined,
                      tier: typeof metadata.tier === 'string' ? metadata.tier : undefined,
                      tools: Array.isArray(metadata.tools) ? metadata.tools : undefined,
                      status: typeof metadata.status === 'string' ? metadata.status : undefined,
                      metadata: isRecord(metadata.metadata) ? metadata.metadata : undefined,
                      permissions: isRecord(metadata.permissions)
                        ? metadata.permissions
                        : undefined,
                    };
                    return result;
                  }
                }
              }
            }
          }
          // If no match by identifier, return first metadata object as fallback
          const firstKey = Object.keys(publisherData)[0];
          if (firstKey) {
            const firstMetadata = publisherData[firstKey];
            if (
              isRecord(firstMetadata) &&
              ('tags' in firstMetadata || 'tier' in firstMetadata || 'tools' in firstMetadata)
            ) {
              console.log(
                `[extractPublisherMetadata] Using fallback metadata for ${server.name} (key: ${firstKey})`,
              );
              const result: PublisherMetadata = {
                tags: Array.isArray(firstMetadata.tags) ? firstMetadata.tags : undefined,
                tier: typeof firstMetadata.tier === 'string' ? firstMetadata.tier : undefined,
                tools: Array.isArray(firstMetadata.tools) ? firstMetadata.tools : undefined,
                status: typeof firstMetadata.status === 'string' ? firstMetadata.status : undefined,
                metadata: isRecord(firstMetadata.metadata) ? firstMetadata.metadata : undefined,
                permissions: isRecord(firstMetadata.permissions)
                  ? firstMetadata.permissions
                  : undefined,
              };
              return result;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract publisher metadata:', error);
    return null;
  }
};

/**
 * Map tier string from publisher metadata to McpServerTier
 * @param tier Tier string from publisher metadata
 * @returns McpServerTier or undefined
 */
const mapTierToMcpServerTier = (tier?: string): McpServerTier | undefined => {
  if (!tier) {
    return undefined;
  }

  const tierLower = tier.toLowerCase();
  if (tierLower === 'official') {
    return 'official';
  }
  if (tierLower === 'community') {
    return 'community';
  }
  if (tierLower === 'experimental') {
    return 'experimental';
  }

  return undefined;
};

/**
 * Encode publisher metadata to base64 format for _meta field
 * Reconstructs the publisher-provided metadata structure from McpServerMetadata
 * @param server Server metadata to encode
 * @returns Base64-encoded JSON string for server_meta field
 */
const encodePublisherMetadata = (server: McpServerMetadata): string => {
  // Reconstruct publisher metadata structure
  // The structure should match what extractPublisherMetadata expects
  const publisherMetadata: PublisherMetadata = {
    tags: server.tags && server.tags.length > 0 ? server.tags : undefined,
    tier:
      server.tier === 'official'
        ? 'Official'
        : server.tier === 'community'
        ? 'Community'
        : server.tier === 'experimental'
        ? 'Experimental'
        : undefined,
    tools: server.tools
      ? server.tools.map((tool) => {
          if (typeof tool === 'string') {
            return tool;
          }
          return {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          };
        })
      : undefined,
    status: 'Active', // Default status
    metadata: server.metadata
      ? {
          pulls: server.metadata.pulls,
          stars: server.metadata.stars,
          // eslint-disable-next-line camelcase
          last_updated: server.metadata.last_updated,
        }
      : undefined,
  };

  // Remove undefined fields
  const cleanedMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(publisherMetadata)) {
    if (value !== undefined) {
      cleanedMetadata[key] = value;
    }
  }

  // Encode to base64
  const jsonString = JSON.stringify(cleanedMetadata);
  return btoa(jsonString);
};

/**
 * Convert McpServerMetadata to MCP v0.1 API server format for publishing
 * @param server Server metadata to convert
 * @returns ServerJSON object ready for publishing (matches ServerJSON type from Go package)
 */
export const convertServerMetadataToApiFormat = (server: McpServerMetadata): ServerJSON => {
  // Validate that server name is not empty
  if (!server.name || server.name.trim() === '') {
    throw new Error('Server name is required and cannot be empty');
  }

  const packages = [];
  if (server.image) {
    packages.push({
      identifier: server.image,
      transport: server.transport
        ? {
            type: server.transport,
          }
        : undefined,
      environmentVariables: server.env_vars
        ? server.env_vars.map((env) => ({ name: env.name }))
        : undefined,
    });
  }

  // Encode publisher metadata if we have tags, tier, tools, or other metadata
  const hasPublisherMetadata =
    (server.tags && server.tags.length > 0) ||
    server.tier ||
    (server.tools && server.tools.length > 0) ||
    server.metadata;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const serverMeta: Record<string, unknown> | undefined = hasPublisherMetadata
    ? {
        'io.modelcontextprotocol.registry/publisher-provided': {
          // eslint-disable-next-line camelcase
          server_meta: encodePublisherMetadata(server),
        },
      }
    : undefined;

  // The publish endpoint expects just the server object (ServerJSON type from Go package)
  // Not the full RegistryApiServer wrapper with { server: ..., _meta: ... }
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json',
    name: server.name.trim(),
    description: server.description,
    version: server.version,
    repository: server.repository
      ? {
          url: server.repository,
        }
      : undefined,
    packages: packages.length > 0 ? packages : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _meta: serverMeta,
  };
};

/**
 * Publish a server to a registry via backend proxy
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @param serverData Server data in MCP v0.1 format
 * @returns Promise that resolves when server is published
 */
export const publishServerToRegistry = async (
  namespace: string,
  registryName: string,
  serverData: ServerJSON,
): Promise<void> => {
  const url = `/api/mcpRegistries/${encodeURIComponent(namespace)}/${encodeURIComponent(
    registryName,
  )}/publish`;

  try {
    // The publish endpoint expects just the server object (ServerJSON type from Go package)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serverData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(
        `Failed to publish server: ${response.status} ${response.statusText} - ${
          errorData.message || 'Unknown error'
        }`,
      );
    }

    // Response might be empty, which is fine
    await response.json().catch(() => ({}));
  } catch (error) {
    console.error(`Error publishing server to ${namespace}/${registryName}:`, error);
    throw error;
  }
};

/**
 * Unregister a server version from a registry
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @param serverName Name of the server to unregister (will be URL-encoded)
 * @param version Version of the server to unregister (will be URL-encoded)
 * @returns Promise that resolves when server version is deleted
 */
export const unregisterServerVersion = async (
  namespace: string,
  registryName: string,
  serverName: string,
  version: string,
): Promise<void> => {
  const encodedServerName = encodeURIComponent(serverName);
  const encodedVersion = encodeURIComponent(version);
  const url = `/api/mcpRegistries/${encodeURIComponent(namespace)}/${encodeURIComponent(
    registryName,
  )}/servers/${encodedServerName}/versions/${encodedVersion}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      // Don't set Content-Type for DELETE requests without body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(
        `Failed to unregister server version: ${response.status} ${response.statusText} - ${
          errorData.message || 'Unknown error'
        }`,
      );
    }

    // Response might be empty, which is fine
    await response.json().catch(() => ({}));
  } catch (error) {
    console.error(
      `Error unregistering server version ${serverName}/${version} from ${namespace}/${registryName}:`,
      error,
    );
    throw error;
  }
};

/**
 * Unregister all versions of a server from a registry
 * Fetches all servers, finds all versions of the specified server, and deletes each one
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @param serverName Name of the server to unregister
 * @returns Promise that resolves when all versions are deleted, or rejects if any deletion fails
 */
export const unregisterAllServerVersions = async (
  namespace: string,
  registryName: string,
  serverName: string,
): Promise<void> => {
  try {
    // Fetch all servers to find all versions of this server
    const allServers = await fetchServersFromRegistryApi(namespace, registryName);

    // Find all versions of this server
    const serverVersions = allServers
      .filter((server) => server.name === serverName)
      .map((server) => server.version || 'latest')
      .filter((version, index, self) => self.indexOf(version) === index); // Remove duplicates

    if (serverVersions.length === 0) {
      throw new Error(`No versions found for server: ${serverName}`);
    }

    // Delete each version, collecting errors but continuing with others
    const errors: Array<{ version: string; error: Error }> = [];
    const deletePromises = serverVersions.map(async (version) => {
      try {
        await unregisterServerVersion(namespace, registryName, serverName, version);
      } catch (error) {
        // Log error but continue with other versions
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Failed to delete version ${version} of server ${serverName}:`, err);
        errors.push({ version, error: err });
      }
    });

    await Promise.all(deletePromises);

    // If all deletions failed, throw an error
    if (errors.length === serverVersions.length) {
      throw new Error(
        `Failed to delete all versions of server ${serverName}: ${errors
          .map((e) => e.error.message)
          .join('; ')}`,
      );
    }

    // If some deletions failed, log a warning but don't throw (partial success)
    if (errors.length > 0) {
      console.warn(
        `Some versions of server ${serverName} could not be deleted:`,
        errors.map((e) => `${e.version}: ${e.error.message}`).join(', '),
      );
    }
  } catch (error) {
    console.error(
      `Error unregistering all versions of server ${serverName} from ${namespace}/${registryName}:`,
      error,
    );
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

  // Validate that server name exists and is not empty
  if (!server.name || typeof server.name !== 'string' || server.name.trim() === '') {
    console.error('[convertApiServerToMetadata] Server name is missing or empty:', {
      serverName: server.name,
      serverObject: server,
      fullApiServer: apiServer,
    });
    // Try to use package identifier as fallback
    const packageInfo =
      Array.isArray(server.packages) && server.packages.length > 0 ? server.packages[0] : null;
    const fallbackName =
      packageInfo && typeof packageInfo.identifier === 'string'
        ? packageInfo.identifier
        : 'unknown-server';

    console.warn(
      `[convertApiServerToMetadata] Using fallback name: ${fallbackName} (original was empty)`,
    );

    // If we still don't have a valid name, throw an error
    if (fallbackName === 'unknown-server') {
      throw new Error(
        'Server name is required but was empty or missing in API response. Cannot convert server metadata.',
      );
    }

    // Use fallback name
    server.name = fallbackName;
  }

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

  // Extract publisher metadata
  const serverMeta = server._meta;
  const serverPackages = server.packages;

  // Type guard for packages array
  const packagesArray: Array<{ identifier?: string }> | undefined = Array.isArray(serverPackages)
    ? serverPackages.filter(
        (pkg): pkg is { identifier?: string } =>
          typeof pkg === 'object' && pkg !== null && isRecord(pkg),
      )
    : undefined;

  const publisherMeta = extractPublisherMetadata({
    name: server.name,
    _meta: isRecord(serverMeta) ? serverMeta : undefined,
    packages: packagesArray,
  });

  // Merge tags from publisher metadata with any existing tags
  const tags = new Set<string>();
  if (publisherMeta?.tags && Array.isArray(publisherMeta.tags)) {
    publisherMeta.tags.forEach((tag) => {
      if (typeof tag === 'string') {
        tags.add(tag);
      }
    });
  }

  // Extract tools from publisher metadata
  // Convert string array to McpToolMetadata array
  const tools: McpToolMetadata[] = [];
  if (publisherMeta?.tools && Array.isArray(publisherMeta.tools)) {
    publisherMeta.tools.forEach((tool) => {
      if (typeof tool === 'string') {
        tools.push({ name: tool });
      } else if (isToolLike(tool)) {
        const toolMetadata: McpToolMetadata = {
          name: tool.name,
          description: typeof tool.description === 'string' ? tool.description : undefined,
          inputSchema: isRecord(tool.inputSchema) ? tool.inputSchema : undefined,
        };
        tools.push(toolMetadata);
      }
    });
  }

  // Map tier from publisher metadata
  const tier = mapTierToMcpServerTier(publisherMeta?.tier);

  // Debug logging
  if (publisherMeta) {
    console.log(`[convertApiServerToMetadata] Extracted metadata for ${server.name}:`, {
      tier: publisherMeta.tier,
      mappedTier: tier,
      tags: tags.size,
      tools: tools.length,
    });
  }

  return {
    name: server.name,
    displayName: typeof server.name === 'string' ? server.name : String(server.name),
    description: typeof server.description === 'string' ? server.description : undefined,
    version: typeof server.version === 'string' ? server.version : undefined,
    repository,
    transport,
    tier,
    image:
      packageInfo && typeof packageInfo.identifier === 'string'
        ? packageInfo.identifier
        : undefined,
    // Use tags from publisher metadata
    tags: Array.from(tags),
    // Use tools from publisher metadata
    tools,
    // Extract prompts from _meta if available (not yet in publisher metadata)
    prompts: [],
    // Extract resources from _meta if available (not yet in publisher metadata)
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
