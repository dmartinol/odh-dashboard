import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sUpdateResource,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import {
  McpRegistry,
  McpListOptions,
  McpServerMetadata,
  McpTransport,
  McpServerTier,
} from '../types';

const McpRegistryModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'toolhive.stacklok.dev',
  kind: 'MCPRegistry',
  plural: 'mcpregistries',
};

// List all MCP registries
export const listMcpRegistries = (
  namespace?: string,
  options?: McpListOptions,
): Promise<McpRegistry[]> => {
  const queryOptions = {
    ns: namespace,
    queryParams: {
      ...(options?.labelSelector && { labelSelector: options.labelSelector }),
      ...(options?.fieldSelector && { fieldSelector: options.fieldSelector }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.continue && { continue: options.continue }),
    },
  };

  return k8sListResourceItems<McpRegistry>({
    model: McpRegistryModel,
    queryOptions,
  });
};

// Get a specific MCP registry
export const getMcpRegistry = (name: string, namespace: string): Promise<McpRegistry> => {
  return k8sGetResource<McpRegistry>({
    model: McpRegistryModel,
    queryOptions: { name, ns: namespace },
  });
};

// Create a new MCP registry
export const createMcpRegistry = (registry: McpRegistry): Promise<McpRegistry> => {
  return k8sCreateResource<McpRegistry>({
    model: McpRegistryModel,
    resource: registry,
  });
};

// Update an existing MCP registry
export const updateMcpRegistry = (registry: McpRegistry): Promise<McpRegistry> => {
  return k8sUpdateResource<McpRegistry>({
    model: McpRegistryModel,
    resource: registry,
  });
};

// Delete an MCP registry
export const deleteMcpRegistry = (name: string, namespace: string): Promise<McpRegistry> => {
  return k8sDeleteResource<McpRegistry>({
    model: McpRegistryModel,
    queryOptions: { name, ns: namespace },
  });
};

// Trigger manual sync for a registry
export const syncMcpRegistry = async (name: string, namespace: string): Promise<void> => {
  // This would typically patch the registry with a sync annotation
  // For now, we'll implement this as a mock operation
  const registry = await getMcpRegistry(name, namespace);

  const patchedRegistry: McpRegistry = {
    ...registry,
    metadata: {
      ...registry.metadata,
      annotations: {
        ...registry.metadata?.annotations,
        'mcp.toolhive.stacklok.dev/sync-requested': Date.now().toString(),
      },
    },
  };

  await updateMcpRegistry(patchedRegistry);
};

// Fetch complete server metadata from a linked registry
export const getServerMetadataFromRegistry = async (
  registryName: string,
  registryNamespace: string,
  serverName: string,
): Promise<McpServerMetadata | null> => {
  try {
    // Fetch the registry resource
    const registry = await getMcpRegistry(registryName, registryNamespace);

    // Get the storage ref from registry status
    const storageRef = registry.status?.storageRef;
    if (!storageRef?.configMapRef?.name) {
      console.warn(`Registry ${registryNamespace}/${registryName} has no storage configmap`);
      return null;
    }

    // Fetch the storage configmap
    const ConfigMapModel: K8sModelCommon = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      plural: 'configmaps',
    };

    const configMap = await k8sGetResource({
      model: ConfigMapModel,
      queryOptions: {
        name: storageRef.configMapRef.name,
        ns: registryNamespace,
      },
    });

    // Parse the registry data from the configmap
    const registryDataKey = Object.keys(configMap.data || {})[0];
    if (!registryDataKey || !configMap.data) {
      console.warn(`Storage configmap has no data keys`);
      return null;
    }

    const registryDataStr = configMap.data[registryDataKey];
    if (typeof registryDataStr !== 'string') {
      console.warn(`Registry data is not a string`);
      return null;
    }
    const parsedData: unknown = JSON.parse(registryDataStr);
    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      !('servers' in parsedData) ||
      !parsedData.servers ||
      typeof parsedData.servers !== 'object'
    ) {
      return null;
    }

    const { servers } = parsedData;
    if (!(serverName in servers)) {
      console.warn(`Server ${serverName} not found in registry ${registryName}`);
      return null;
    }

    // Type guard helpers
    const isString = (value: unknown): value is string => typeof value === 'string';
    const isNumber = (value: unknown): value is number => typeof value === 'number';
    const isStringArray = (value: unknown): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === 'string');
    const isMcpTransport = (value: unknown): value is McpTransport =>
      value === 'stdio' || value === 'sse' || value === 'streamable-http';
    const isMcpServerTier = (value: unknown): value is McpServerTier =>
      value === 'official' || value === 'community' || value === 'experimental';
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value);

    if (!isRecord(servers)) {
      return null;
    }
    const serverDataRaw = servers[serverName];
    if (!isRecord(serverDataRaw)) {
      return null;
    }
    const serverData = serverDataRaw;

    // Helper to safely get string property
    const getString = (obj: Record<string, unknown>, key: string): string | undefined => {
      const value = obj[key];
      return isString(value) ? value : undefined;
    };

    // Helper to safely get array property
    const getStringArray = (obj: Record<string, unknown>, key: string): string[] => {
      const value = obj[key];
      return isStringArray(value) ? value : [];
    };

    // Helper to process tools
    const processTools = (tools: unknown): McpServerMetadata['tools'] => {
      if (!Array.isArray(tools)) {
        return undefined;
      }
      return tools.map((tool) => {
        if (typeof tool === 'string') {
          return { name: tool, description: undefined, inputSchema: undefined };
        }
        if (tool && typeof tool === 'object' && 'name' in tool && typeof tool.name === 'string') {
          return {
            name: tool.name,
            description:
              'description' in tool && typeof tool.description === 'string'
                ? tool.description
                : undefined,
            inputSchema:
              'inputSchema' in tool && isRecord(tool.inputSchema) ? tool.inputSchema : undefined,
          };
        }
        return { name: '', description: undefined, inputSchema: undefined };
      });
    };

    // Helper to process prompts
    const processPrompts = (prompts: unknown): McpServerMetadata['prompts'] => {
      if (!Array.isArray(prompts)) {
        return undefined;
      }
      return prompts.map((prompt) => {
        if (
          prompt &&
          typeof prompt === 'object' &&
          'name' in prompt &&
          typeof prompt.name === 'string'
        ) {
          const args =
            'arguments' in prompt && Array.isArray(prompt.arguments)
              ? prompt.arguments
                  .filter(
                    (
                      arg: unknown,
                    ): arg is { name: string; description?: string; required?: boolean } =>
                      arg !== null &&
                      typeof arg === 'object' &&
                      'name' in arg &&
                      typeof arg.name === 'string',
                  )
                  .map((arg: { name: string; description?: string; required?: boolean }) => ({
                    name: arg.name,
                    description:
                      'description' in arg && typeof arg.description === 'string'
                        ? arg.description
                        : undefined,
                    required:
                      'required' in arg && typeof arg.required === 'boolean'
                        ? arg.required
                        : undefined,
                  }))
              : [];
          return {
            name: prompt.name,
            description:
              'description' in prompt && typeof prompt.description === 'string'
                ? prompt.description
                : undefined,
            arguments: args,
          };
        }
        return { name: '', description: undefined, arguments: [] };
      });
    };

    // Helper to process resources
    const processResources = (resources: unknown): McpServerMetadata['resources'] => {
      if (!Array.isArray(resources)) {
        return undefined;
      }
      return resources
        .filter(
          (resource): resource is Record<string, unknown> =>
            resource !== null && typeof resource === 'object',
        )
        .map((resource) => ({
          uri: 'uri' in resource && typeof resource.uri === 'string' ? resource.uri : '',
          name: 'name' in resource && typeof resource.name === 'string' ? resource.name : undefined,
          description:
            'description' in resource && typeof resource.description === 'string'
              ? resource.description
              : undefined,
          mimeType:
            'mimeType' in resource && typeof resource.mimeType === 'string'
              ? resource.mimeType
              : undefined,
        }));
    };

    // Helper to process env_vars
    const processEnvVars = (envVars: unknown): McpServerMetadata['env_vars'] => {
      if (!Array.isArray(envVars)) {
        return [];
      }
      return envVars
        .filter(
          (envVar): envVar is Record<string, unknown> =>
            envVar !== null && typeof envVar === 'object' && 'name' in envVar,
        )
        .map((envVar) => ({
          name: typeof envVar.name === 'string' ? envVar.name : '',
          description:
            'description' in envVar && typeof envVar.description === 'string'
              ? envVar.description
              : undefined,
          required:
            'required' in envVar && typeof envVar.required === 'boolean'
              ? envVar.required
              : undefined,
          secret:
            'secret' in envVar && typeof envVar.secret === 'boolean' ? envVar.secret : undefined,
          default:
            'default' in envVar && typeof envVar.default === 'string' ? envVar.default : undefined,
        }));
    };

    // Convert ToolHive format to McpServerMetadata
    const server: McpServerMetadata = {
      name: serverName,
      displayName: getString(serverData, 'displayName') || serverName,
      description: getString(serverData, 'description'),
      version: getString(serverData, 'version'),
      author: getString(serverData, 'author'),
      homepage: getString(serverData, 'homepage'),
      repository: getString(serverData, 'repository') || getString(serverData, 'repository_url'),
      license: getString(serverData, 'license'),
      tags: getStringArray(serverData, 'tags'),
      logo: getString(serverData, 'logo'),
      image: getString(serverData, 'image'),
      transport:
        'transport' in serverData && isMcpTransport(serverData.transport)
          ? serverData.transport
          : undefined,
      // eslint-disable-next-line camelcase
      target_port:
        'target_port' in serverData && isNumber(serverData.target_port)
          ? serverData.target_port
          : undefined,
      args:
        'args' in serverData && Array.isArray(serverData.args)
          ? serverData.args.filter((arg: unknown): arg is string => typeof arg === 'string')
          : undefined,
      // eslint-disable-next-line camelcase
      env_vars: processEnvVars(serverData.env_vars),
      tools: processTools(serverData.tools),
      prompts: processPrompts(serverData.prompts),
      resources: processResources(serverData.resources),
      tier: 'tier' in serverData && isMcpServerTier(serverData.tier) ? serverData.tier : undefined,
    };

    return server;
  } catch (error) {
    console.error(
      `Failed to fetch server metadata from registry ${registryNamespace}/${registryName}:`,
      error,
    );
    return null;
  }
};
