import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';
import { McpServerMetadata, McpTransport, McpServerTier } from '../types';

export interface GitValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    urlValid: boolean;
    branchValid: boolean;
    pathValid: boolean;
  };
}

export interface ConfigMapValidationResult {
  isValid: boolean;
  error?: string;
  availableKeys?: string[];
}

export interface TagDiscoveryResult {
  tags: string[];
  error?: string;
}

export interface ServerDiscoveryResult {
  servers: McpServerMetadata[];
  error?: string;
}

interface ServerType {
  tags?: string[];
  [key: string]: unknown;
}

interface ToolHiveServerData {
  image?: string;
  transport?: McpTransport;
  tier?: McpServerTier;
  target_port?: number;
  args?: string[];
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  repository_url?: string; // ToolHive format uses repository_url
  license?: string;
  tags?: string[];
  logo?: string;
  tools?: Array<
    | string
    | {
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
      }
  >;
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  resources?: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
  env_vars?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    secret?: boolean;
    default?: string;
  }>;
  metadata?: {
    stars?: number;
    pulls?: number;
    // eslint-disable-next-line camelcase
    last_updated?: string;
    // eslint-disable-next-line camelcase
    docker_tags?: string[] | null;
    // eslint-disable-next-line camelcase
    target_port?: number;
  };
  [key: string]: unknown;
}

const isServerType = (server: unknown): server is ServerType => {
  return typeof server === 'object' && server !== null;
};

const isToolHiveServerData = (server: unknown): server is ToolHiveServerData => {
  return typeof server === 'object' && server !== null;
};

/**
 * Validates a Git repository URL format
 */
export const validateGitUrl = (url: string): boolean => {
  if (!url.trim()) return false;

  // Basic URL format validation
  try {
    const parsedUrl = new URL(url);
    // Must be http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    // Should look like a git repository
    return (
      parsedUrl.pathname.includes('/') &&
      (url.endsWith('.git') ||
        parsedUrl.hostname.includes('github') ||
        parsedUrl.hostname.includes('gitlab'))
    );
  } catch {
    return false;
  }
};

/**
 * Validates Git repository accessibility (mock for now, can be enhanced to actually test)
 */
export const validateGitRepository = async (
  repository: string,
  branch = 'main',
  path = '',
): Promise<GitValidationResult> => {
  // URL validation
  const urlValid = validateGitUrl(repository);
  if (!urlValid) {
    return {
      isValid: false,
      error: 'Invalid Git repository URL format',
      details: { urlValid: false, branchValid: true, pathValid: true },
    };
  }

  // Branch validation (basic check)
  const branchValid = branch.trim().length > 0 && !/[^a-zA-Z0-9._/-]/.test(branch);
  if (!branchValid) {
    return {
      isValid: false,
      error: 'Invalid branch name format',
      details: { urlValid: true, branchValid: false, pathValid: true },
    };
  }

  // Path validation (basic check)
  const pathValid = path.trim().length > 0 && !path.includes('..') && !path.startsWith('/');
  if (!pathValid) {
    return {
      isValid: false,
      error: 'Invalid file path format',
      details: { urlValid: true, branchValid: true, pathValid: false },
    };
  }

  // TODO: In a real implementation, this could make an actual HTTP request to validate accessibility
  // For now, we'll just validate the format
  return {
    isValid: true,
    details: { urlValid: true, branchValid: true, pathValid: true },
  };
};

/**
 * Validates ConfigMap and key existence
 */
export const validateConfigMap = (
  configMapName: string,
  configMapKey: string,
  availableConfigMaps: ConfigMapKind[],
): ConfigMapValidationResult => {
  if (!configMapName.trim()) {
    return {
      isValid: false,
      error: 'ConfigMap name is required',
    };
  }

  if (!configMapKey.trim()) {
    return {
      isValid: false,
      error: 'ConfigMap key is required',
    };
  }

  // Find the ConfigMap
  const configMap = availableConfigMaps.find((cm) => cm.metadata.name === configMapName);
  if (!configMap) {
    return {
      isValid: false,
      error: `ConfigMap '${configMapName}' not found in namespace`,
    };
  }

  // Get available keys
  const availableKeys = Object.keys(configMap.data || {});
  if (availableKeys.length === 0) {
    return {
      isValid: false,
      error: `ConfigMap '${configMapName}' has no data keys`,
      availableKeys: [],
    };
  }

  // Check if the specified key exists
  if (!availableKeys.includes(configMapKey)) {
    return {
      isValid: false,
      error: `Key '${configMapKey}' not found in ConfigMap '${configMapName}'`,
      availableKeys,
    };
  }

  return {
    isValid: true,
    availableKeys,
  };
};

/**
 * Parse ToolHive registry format and extract tags
 * ToolHive format has servers as an object where each key is a server name
 * and the value contains a tags array
 */
export const parseRegistryForTags = async (content: string): Promise<TagDiscoveryResult> => {
  try {
    // Parse as JSON (ToolHive format)
    const registryData = JSON.parse(content);

    // Extract tags from servers object
    const allTags = new Set<string>();

    // ToolHive format: { "servers": { "server-name": { "tags": [...], ... }, ... } }
    if (registryData.servers && typeof registryData.servers === 'object') {
      Object.values(registryData.servers).forEach((server) => {
        if (isServerType(server) && server.tags && Array.isArray(server.tags)) {
          server.tags.forEach((tag: string) => {
            if (typeof tag === 'string' && tag.trim()) {
              allTags.add(tag.trim());
            }
          });
        }
      });
    }

    return {
      tags: Array.from(allTags).toSorted(),
    };
  } catch (error) {
    return {
      tags: [],
      error: 'Failed to parse registry data for tags',
    };
  }
};

/**
 * Discovers tags from a Git repository source
 */
export const discoverTagsFromGit = async (
  repository: string,
  branch = 'main',
  path = '',
): Promise<TagDiscoveryResult> => {
  try {
    // For GitHub repositories, construct raw content URL
    if (repository.includes('github.com')) {
      // Convert GitHub URL to raw content URL
      // From: https://github.com/user/repo.git or https://github.com/user/repo
      // To: https://raw.githubusercontent.com/user/repo/branch/path

      const repoUrl = repository.replace(/\.git$/, '');
      const parts = repoUrl.replace('https://github.com/', '').split('/');

      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1];
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

        try {
          const response = await fetch(rawUrl);
          if (response.ok) {
            const content = await response.text();
            return await parseRegistryForTags(content);
          }
          return {
            tags: [],
            error: `Failed to fetch registry file: ${response.status} ${response.statusText}`,
          };
        } catch (fetchError) {
          return {
            tags: [],
            error: `Network error while fetching registry file: ${
              fetchError instanceof Error ? fetchError.message : 'Unknown error'
            }`,
          };
        }
      }
    }

    // For other Git providers or if GitHub parsing fails, return helpful error
    return {
      tags: [],
      error: 'Tag discovery is currently supported for GitHub repositories only',
    };
  } catch (error) {
    return {
      tags: [],
      error: `Failed to discover tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Discovers tags from a ConfigMap source
 */
export const discoverTagsFromConfigMap = async (
  configMap: ConfigMapKind,
  key: string,
): Promise<TagDiscoveryResult> => {
  const data = configMap.data?.[key];

  if (!data) {
    return {
      tags: [],
      error: `Key '${key}' not found in ConfigMap`,
    };
  }

  return parseRegistryForTags(data);
};

/**
 * Check if registry data follows MCP v0 API format (array of basic server info without details)
 */
const isMcpV0Format = (registryData: unknown): boolean => {
  // Check for array of servers (from /v0/servers endpoint)
  if (
    Array.isArray(registryData) &&
    registryData.length > 0 &&
    typeof registryData[0] === 'object' &&
    registryData[0] !== null &&
    'name' in registryData[0]
  ) {
    return true;
  }

  // Check for single server object (from /v0/servers/{serverId} endpoint)
  if (typeof registryData === 'object' && registryData !== null && 'name' in registryData) {
    return true;
  }

  return false;
};

// Interface for basic server info from MCP v0 API
interface McpV0BasicServer {
  name: string;
  [key: string]: unknown;
}

// Interface for detailed server info from MCP v0 API
interface McpV0DetailedServer {
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  logo?: string;
  image?: string;
  transport?: McpTransport;
  target_port?: number;
  args?: string[];
  tools?: (
    | string
    | { name: string; description?: string; inputSchema?: Record<string, unknown> }
  )[];
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  resources?: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
  env_vars?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    secret?: boolean;
    default?: string;
  }>;
  [key: string]: unknown;
}

/**
 * Parse MCP v0 API format (array of basic server info or single server object)
 * This format requires additional API calls to get detailed server information
 */
const parseMcpV0Format = async (
  registryData: unknown[] | unknown,
  baseUrl?: string,
): Promise<McpServerMetadata[]> => {
  const servers: McpServerMetadata[] = [];

  // Convert single object to array for uniform processing
  const dataArray = Array.isArray(registryData) ? registryData : [registryData];

  console.log(`🔍 [MCP-V0] Processing ${dataArray.length} servers from MCP v0 format`);

  for (const serverData of dataArray) {
    if (typeof serverData === 'object' && serverData !== null && 'name' in serverData) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const basicServer = serverData as McpV0BasicServer;

      // Try to fetch detailed server info from individual endpoint if baseUrl is available
      let detailedServer: McpV0DetailedServer = basicServer;
      if (baseUrl && basicServer.name) {
        try {
          const detailResponse = await fetch(`${baseUrl}/v0/servers/${basicServer.name}`);
          if (detailResponse.ok) {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            detailedServer = (await detailResponse.json()) as McpV0DetailedServer;
            console.log(`✅ [MCP-V0] Fetched detailed info for ${basicServer.name}`);
            console.log(`🔍 [MCP-V0] Detailed server data:`, detailedServer);
            console.log(`🔍 [MCP-V0] Detailed server tools:`, detailedServer.tools);
            console.log(`🔍 [MCP-V0] Tools array length:`, detailedServer.tools?.length);
            if (detailedServer.tools && detailedServer.tools.length > 0) {
              detailedServer.tools.forEach((tool, index) => {
                console.log(`🔍 [MCP-V0] Raw tool ${index}:`, tool, `(type: ${typeof tool})`);
              });
            }
          } else {
            console.warn(
              `⚠️ [MCP-V0] Failed to fetch details for ${basicServer.name}: ${detailResponse.status}`,
            );
          }
        } catch (error) {
          console.warn(`⚠️ [MCP-V0] Error fetching details for ${basicServer.name}:`, error);
        }
      }

      // Try to fetch logo if not provided but repository is available
      let logoUrl = detailedServer.logo;
      if (!logoUrl && detailedServer.repository) {
        try {
          const fetchedLogo = await getProjectLogoUrl(detailedServer.repository);
          logoUrl = fetchedLogo || undefined;
        } catch (error) {
          console.warn(`Failed to fetch logo for ${detailedServer.name}:`, error);
        }
      }

      // Convert to McpServerMetadata format
      const server: McpServerMetadata = {
        name: detailedServer.name,
        displayName: detailedServer.displayName || detailedServer.name,
        description: detailedServer.description,
        version: detailedServer.version,
        author: detailedServer.author,
        homepage: detailedServer.homepage,
        repository: detailedServer.repository,
        license: detailedServer.license,
        tags: detailedServer.tags || [],
        logo: logoUrl,
        image: detailedServer.image,
        tools:
          detailedServer.tools?.map((tool, index) => {
            console.log(`🔍 [MCP-V0] Processing tool ${index}:`, tool);
            console.log(`🔍 [MCP-V0] Tool type:`, typeof tool);

            // Handle MCP v0 format where tools is an array of strings
            if (typeof tool === 'string') {
              console.log(`🔍 [MCP-V0] Tool is string: "${tool}"`);
              return {
                name: tool,
                description: undefined,
                inputSchema: undefined,
              };
            }
            // Handle object format with name, description, inputSchema
            console.log(`🔍 [MCP-V0] Tool is object with name: "${tool.name}"`);
            const result = {
              name: tool.name || String(tool),
              description: tool.description,
              inputSchema: tool.inputSchema,
            };
            console.log(`🔍 [MCP-V0] Processed tool result:`, result);
            return result;
          }) || [],
        prompts:
          detailedServer.prompts?.map((prompt) => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments || [],
          })) || [],
        resources:
          detailedServer.resources?.map((resource) => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          })) || [],
        // eslint-disable-next-line camelcase
        env_vars:
          detailedServer.env_vars?.map((envVar) => ({
            name: envVar.name,
            description: envVar.description,
            required: envVar.required,
            secret: envVar.secret,
            default: envVar.default,
          })) || [],
      };

      console.log(`🔍 [MCP-V0] Raw tools data for ${server.name}:`, detailedServer.tools);
      console.log(
        `🔍 [MCP-V0] Processed server ${server.name} with ${server.tools?.length || 0} tools, ${
          server.prompts?.length || 0
        } prompts, ${server.resources?.length || 0} resources, ${
          // eslint-disable-next-line camelcase
          server.env_vars?.length || 0
        } env_vars`,
      );
      if (server.tools && server.tools.length > 0) {
        console.log(
          `🔍 [MCP-V0] Tool names for ${server.name}:`,
          server.tools.map((t) => t.name),
        );
      }
      servers.push(server);
    }
  }

  return servers;
};

/**
 * Parse ToolHive registry format and extract servers
 * ToolHive format has servers as an object where each key is a server name
 * and the value contains server metadata
 */
export const parseRegistryForServers = async (
  content: string,
  baseUrl?: string,
): Promise<ServerDiscoveryResult> => {
  try {
    console.log(
      `🔍 [REGISTRY] Starting to parse registry content:`,
      `${content.substring(0, 200)}...`,
    );

    // Parse as JSON
    const registryData = JSON.parse(content);
    let servers: McpServerMetadata[] = [];

    console.log(`🔍 [REGISTRY] Registry data structure:`, Object.keys(registryData));
    console.log(`🔍 [REGISTRY] Full registry data:`, registryData);
    console.log(`🔍 [REGISTRY] Registry data type:`, typeof registryData);
    console.log(`🔍 [REGISTRY] Has servers property:`, 'servers' in registryData);
    console.log(`🔍 [REGISTRY] Servers type:`, typeof registryData.servers);

    // Check if this is MCP v0 API format (array of servers or single server)
    if (isMcpV0Format(registryData)) {
      console.log(`🔍 [REGISTRY] Detected MCP v0 API format`);
      servers = await parseMcpV0Format(registryData, baseUrl);
    }
    // ToolHive format: { "servers": { "server-name": { ... }, ... } }
    else if (registryData.servers && typeof registryData.servers === 'object') {
      // Process servers in parallel for better performance
      const serverPromises = Object.entries(registryData.servers).map(
        async ([serverName, serverData]) => {
          try {
            console.log(`🔍 [SERVER] Starting to process server: ${serverName}`);
            if (isToolHiveServerData(serverData)) {
              // Convert ToolHive format to McpServerMetadata
              // Ensure transport and tier are included in tags if they're specified as direct fields
              const allTags = new Set(serverData.tags || []);
              if (serverData.transport) {
                allTags.add(serverData.transport);
              }
              if (serverData.tier) {
                allTags.add(serverData.tier);
              }

              // Try to fetch logo if not provided but repository is available
              // Check both repository and repository_url fields
              const repositoryUrl = serverData.repository || serverData.repository_url;
              let logoUrl = serverData.logo;
              if (!logoUrl && repositoryUrl) {
                try {
                  const fetchedLogo = await getProjectLogoUrl(repositoryUrl);
                  logoUrl = fetchedLogo || undefined;
                } catch (error) {
                  console.warn(`Failed to fetch logo for ${serverName}:`, error);
                }
              }

              // Debug logging for server data
              console.log(`🔍 [SERVER] Processing server: ${serverName}`);
              console.log(`🔍 [SERVER] Raw server data:`, serverData);
              console.log(`🔍 [SERVER] Tools count: ${serverData.tools?.length || 0}`);
              console.log(`🔍 [SERVER] Prompts count: ${serverData.prompts?.length || 0}`);
              console.log(`🔍 [SERVER] Resources count: ${serverData.resources?.length || 0}`);
              console.log(`🔍 [SERVER] Env vars count: ${serverData.env_vars?.length || 0}`);

              if (serverData.tools && serverData.tools.length > 0) {
                console.log(`🔍 [SERVER] Raw tools array for ${serverName}:`, serverData.tools);
                serverData.tools.forEach((tool, index) => {
                  console.log(`🔍 [SERVER] Raw tool ${index}:`, tool);
                  console.log(`🔍 [SERVER] Raw tool ${index} type:`, typeof tool);
                  if (typeof tool === 'object') {
                    console.log(`🔍 [SERVER] Raw tool ${index} keys:`, Object.keys(tool));
                  }
                });
                console.log(
                  `🔍 [SERVER] Tools names for ${serverName}:`,
                  serverData.tools.map((t) => (typeof t === 'string' ? t : t.name)),
                );
              }

              // Check if this might be MCP v0 API format
              if (
                !serverData.tools &&
                !serverData.prompts &&
                !serverData.resources &&
                !serverData.env_vars
              ) {
                console.log(
                  `⚠️ [SERVER] Server ${serverName} has no tools/prompts/resources/env_vars - might need MCP v0 API call`,
                );
              }

              const server: McpServerMetadata = {
                name: serverName,
                displayName: serverData.displayName || serverName,
                description: serverData.description,
                version: serverData.version,
                author: serverData.author,
                homepage: serverData.homepage,
                repository: repositoryUrl, // Use the resolved repository URL
                license: serverData.license,
                tags: Array.from(allTags),
                logo: logoUrl,
                image: serverData.image,
                transport: serverData.transport,
                // eslint-disable-next-line camelcase
                target_port: serverData.target_port,
                args: serverData.args,
                tools:
                  serverData.tools?.map((tool, index) => {
                    console.log(`🔍 [TOOLHIVE] Processing tool ${index} for ${serverName}:`, tool);
                    console.log(`🔍 [TOOLHIVE] Tool ${index} type:`, typeof tool);

                    // Handle tools as strings (ToolHive format can have string arrays)
                    if (typeof tool === 'string') {
                      console.log(`🔍 [TOOLHIVE] Tool ${index} is a string: "${tool}"`);
                      return {
                        name: tool,
                        description: undefined,
                        inputSchema: undefined,
                      };
                    }

                    // Handle tools as objects
                    console.log(`🔍 [TOOLHIVE] Tool ${index} name:`, tool.name);

                    const result = {
                      name: tool.name,
                      description: tool.description,
                      inputSchema: tool.inputSchema,
                    };
                    console.log(`🔍 [TOOLHIVE] Processed tool ${index} result:`, result);
                    return result;
                  }) || [],
                prompts:
                  serverData.prompts?.map((prompt) => ({
                    name: prompt.name,
                    description: prompt.description,
                    arguments: prompt.arguments || [],
                  })) || [],
                resources:
                  serverData.resources?.map((resource) => ({
                    uri: resource.uri,
                    name: resource.name,
                    description: resource.description,
                    mimeType: resource.mimeType,
                  })) || [],
                // eslint-disable-next-line camelcase
                env_vars:
                  serverData.env_vars?.map((envVar) => ({
                    name: envVar.name,
                    description: envVar.description,
                    required: envVar.required,
                    secret: envVar.secret,
                    default: envVar.default,
                  })) || [],
                tier: serverData.tier,
                metadata: serverData.metadata
                  ? {
                      stars: serverData.metadata.stars,
                      pulls: serverData.metadata.pulls,
                      // eslint-disable-next-line camelcase
                      last_updated: serverData.metadata.last_updated,
                      // eslint-disable-next-line camelcase
                      docker_tags: serverData.metadata.docker_tags,
                      // eslint-disable-next-line camelcase
                      target_port: serverData.metadata.target_port,
                    }
                  : undefined,
              };

              console.log(
                `✅ [SERVER] Processed server ${serverName} with ${
                  server.tools?.length || 0
                } tools, ${server.prompts?.length || 0} prompts, ${
                  server.resources?.length || 0
                } resources, ${server.env_vars?.length || 0} env_vars`,
              );

              return server;
            }
            return null;
          } catch (serverError) {
            console.error(`❌ [SERVER] Error processing server ${serverName}:`, serverError);
            console.error(`❌ [SERVER] Server data that failed:`, serverData);
            return null;
          }
        },
      );

      // Wait for all servers to be processed
      const processedServers = await Promise.all(serverPromises);

      // Filter out null results and add to servers array
      processedServers.forEach((server) => {
        if (server) {
          servers.push(server);
        }
      });
    }

    return {
      servers: servers.toSorted((a, b) => a.name.localeCompare(b.name)),
    };
  } catch (error) {
    console.error(`❌ [REGISTRY] Error parsing registry data:`, error);
    console.error(
      `❌ [REGISTRY] Error stack:`,
      error instanceof Error ? error.stack : 'No stack available',
    );
    console.error(`❌ [REGISTRY] Content that failed to parse:`, content.substring(0, 500));

    return {
      servers: [],
      error: `Failed to parse registry data for servers: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
};

/**
 * Discovers servers from a direct HTTP API endpoint (MCP v0 format)
 */
export const discoverServersFromHttp = async (url: string): Promise<ServerDiscoveryResult> => {
  try {
    console.log(`🔍 [HTTP] Fetching servers from HTTP endpoint: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      return {
        servers: [],
        error: `Failed to fetch from HTTP endpoint: ${response.status} ${response.statusText}`,
      };
    }

    const content = await response.text();

    // For direct API endpoints, use the base URL for detailed server fetching
    const baseUrl = url.replace(/\/v0\/servers.*$/, '');
    console.log(`🔍 [HTTP] Using base URL for detailed calls: ${baseUrl}`);

    return await parseRegistryForServers(content, baseUrl);
  } catch (error) {
    return {
      servers: [],
      error: `Network error while fetching from HTTP endpoint: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
};

/**
 * Discovers servers from a Git repository source
 */
export const discoverServersFromGit = async (
  repository: string,
  branch = 'main',
  path = '',
  baseApiUrl?: string,
): Promise<ServerDiscoveryResult> => {
  try {
    // For GitHub repositories, construct raw content URL
    if (repository.includes('github.com')) {
      // Convert GitHub URL to raw content URL
      // From: https://github.com/user/repo.git or https://github.com/user/repo
      // To: https://raw.githubusercontent.com/user/repo/branch/path

      const repoUrl = repository.replace(/\.git$/, '');
      const parts = repoUrl.replace('https://github.com/', '').split('/');

      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1];
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

        try {
          const response = await fetch(rawUrl);
          if (response.ok) {
            const content = await response.text();
            return await parseRegistryForServers(content, baseApiUrl);
          }
          return {
            servers: [],
            error: `Failed to fetch registry file: ${response.status} ${response.statusText}`,
          };
        } catch (fetchError) {
          return {
            servers: [],
            error: `Network error while fetching registry file: ${
              fetchError instanceof Error ? fetchError.message : 'Unknown error'
            }`,
          };
        }
      }
    }

    // For other Git providers or if GitHub parsing fails, return helpful error
    return {
      servers: [],
      error: 'Server discovery is currently supported for GitHub repositories only',
    };
  } catch (error) {
    return {
      servers: [],
      error: `Failed to discover servers: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
};

/**
 * Discovers servers from a ConfigMap source
 */
export const discoverServersFromConfigMap = async (
  configMap: ConfigMapKind,
  key: string,
  baseApiUrl?: string,
): Promise<ServerDiscoveryResult> => {
  const data = configMap.data?.[key];

  if (!data) {
    return {
      servers: [],
      error: `Key '${key}' not found in ConfigMap`,
    };
  }

  return parseRegistryForServers(data, baseApiUrl);
};

/**
 * Get project logo URL from a Git repository following GitValidationService pattern
 */
export const getProjectLogoUrl = async (
  repositoryUrl: string,
  branch = 'main',
): Promise<string | null> => {
  console.log(`🔍 [LOGO] Starting logo fetch for ${repositoryUrl}:${branch}`);

  try {
    const parsedUrl = new URL(repositoryUrl);
    console.log(`🔍 [LOGO] Parsed URL hostname: ${parsedUrl.hostname}`);

    // For GitHub repositories, get the organization/user avatar
    // GitHub avatars are always available, so we don't need to check
    if (parsedUrl.hostname.includes('github.com')) {
      const pathParts = parsedUrl.pathname.split('/').filter((p) => p.length > 0);
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        // GitHub avatar URL format: https://avatars.githubusercontent.com/USERNAME?v=4
        const avatarUrl = `https://avatars.githubusercontent.com/${owner}?v=4`;
        console.log(`✅ [LOGO] Using GitHub avatar for ${owner}: ${avatarUrl}`);
        return avatarUrl;
      }
    }

    // For GitLab repositories, get the user/group avatar
    // GitLab provides avatar images that are always available
    if (parsedUrl.hostname.includes('gitlab.com')) {
      const pathParts = parsedUrl.pathname.split('/').filter((p) => p.length > 0);
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        // GitLab avatar URL format
        const avatarUrl = `https://gitlab.com/${owner}.png`;
        console.log(`✅ [LOGO] Using GitLab avatar for ${owner}: ${avatarUrl}`);
        return avatarUrl;
      }
    }
  } catch (error) {
    console.error('Error fetching project logo:', error);
  }

  console.log(`📄 [LOGO] No logo found for ${repositoryUrl}`);
  return null;
};
