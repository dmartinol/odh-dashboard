import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sUpdateResource,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { McpRegistry, McpListOptions, McpServerMetadata } from '../types';

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
    if (!registryDataKey) {
      console.warn(`Storage configmap has no data keys`);
      return null;
    }

    const registryDataStr = configMap.data[registryDataKey];
    const registryData = JSON.parse(registryDataStr);

    // Find the server in the registry data
    if (registryData.servers && typeof registryData.servers === 'object') {
      const serverData = registryData.servers[serverName];
      if (!serverData) {
        console.warn(`Server ${serverName} not found in registry ${registryName}`);
        return null;
      }

      // Convert ToolHive format to McpServerMetadata
      const server: McpServerMetadata = {
        name: serverName,
        displayName: serverData.displayName || serverName,
        description: serverData.description,
        version: serverData.version,
        author: serverData.author,
        homepage: serverData.homepage,
        repository: serverData.repository || serverData.repository_url,
        license: serverData.license,
        tags: serverData.tags || [],
        logo: serverData.logo,
        image: serverData.image,
        transport: serverData.transport,
        // eslint-disable-next-line camelcase
        target_port: serverData.target_port,
        args: serverData.args,
        // eslint-disable-next-line camelcase
        env_vars: serverData.env_vars || [],
        tools: serverData.tools?.map(
          (tool: { name: string; description?: string; inputSchema?: unknown } | string) =>
            typeof tool === 'string'
              ? { name: tool, description: undefined, inputSchema: undefined }
              : {
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.inputSchema,
                },
        ),
        prompts: serverData.prompts?.map(
          (prompt: { name: string; description?: string; arguments?: unknown[] }) => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments || [],
          }),
        ),
        resources: serverData.resources?.map(
          (resource: { uri: string; name?: string; description?: string; mimeType?: string }) => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          }),
        ),
        tier: serverData.tier,
      };

      return server;
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to fetch server metadata from registry ${registryNamespace}/${registryName}:`,
      error,
    );
    return null;
  }
};
