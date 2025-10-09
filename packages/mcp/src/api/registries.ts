import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sUpdateResource,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { McpRegistry, McpListOptions } from '../types';

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
