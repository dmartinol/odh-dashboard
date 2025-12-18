import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sPatchResource,
  k8sUpdateResource,
  K8sResourceCommon,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { McpRegistry, McpRegistryRegistryEntry } from '../../types/registry';
import { McpServer } from '../../types/server';
import { McpRegistryModel, McpServerModel } from '../models/mcp';

// Utility to create groupVersionKind
export const groupVersionKind = (
  model: typeof McpRegistryModel | typeof McpServerModel,
): { group: string; version: string; kind: string } => ({
  group: model.apiGroup || '',
  version: model.apiVersion,
  kind: model.kind,
});

// MCP Registry K8s operations
export const createMcpRegistry = (registry: McpRegistry): Promise<K8sResourceCommon> =>
  k8sCreateResource({
    model: McpRegistryModel,
    resource: registry,
  });

export const getMcpRegistry = (name: string, namespace: string): Promise<K8sResourceCommon> =>
  k8sGetResource({
    model: McpRegistryModel,
    queryOptions: { name, ns: namespace },
  });

export const updateMcpRegistry = (registry: McpRegistry): Promise<K8sResourceCommon> =>
  k8sUpdateResource({
    model: McpRegistryModel,
    resource: registry,
  });

export const deleteMcpRegistry = (name: string, namespace: string): Promise<K8sResourceCommon> =>
  k8sDeleteResource({
    model: McpRegistryModel,
    queryOptions: { name, ns: namespace },
  });

export const syncMcpRegistry = async (
  name: string,
  namespace: string,
): Promise<K8sResourceCommon> => {
  // Get the current registry
  const registryResource = await getMcpRegistry(name, namespace);

  // Add/update sync annotation to trigger operator re-sync
  const updatedRegistry = {
    ...registryResource,
    metadata: {
      ...registryResource.metadata,
      annotations: {
        ...registryResource.metadata?.annotations,
        'toolhive.stacklok.dev/sync-trigger': new Date().toISOString(),
      },
    },
  };

  // Update the registry with the sync annotation
  return k8sUpdateResource({
    model: McpRegistryModel,
    resource: updatedRegistry,
  });
};

// MCP Server K8s operations
export const createMcpServer = (server: McpServer): Promise<K8sResourceCommon> =>
  k8sCreateResource({
    model: McpServerModel,
    resource: server,
  });

export const getMcpServer = (name: string, namespace: string): Promise<K8sResourceCommon> =>
  k8sGetResource({
    model: McpServerModel,
    queryOptions: { name, ns: namespace },
  });

export const updateMcpServer = (server: McpServer): Promise<K8sResourceCommon> =>
  k8sUpdateResource({
    model: McpServerModel,
    resource: server,
  });

export const deleteMcpServer = (name: string, namespace: string): Promise<K8sResourceCommon> =>
  k8sDeleteResource({
    model: McpServerModel,
    queryOptions: { name, ns: namespace },
  });

export const patchMcpServer = (
  name: string,
  namespace: string,
  patch: Partial<McpServer>,
): Promise<K8sResourceCommon> =>
  k8sPatchResource({
    model: McpServerModel,
    queryOptions: { name, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/metadata/labels',
        value: patch.metadata?.labels || {},
      },
    ],
  });

/**
 * Create a managed registry entry via the registry API
 * @param projectName Name of the project (used as registry entry name)
 * @param mcpRegistryName Name of the MCPRegistry CRD (used to find the API endpoint)
 * @param mcpRegistryNamespace Namespace of the MCPRegistry instance
 */
export const createManagedRegistryEntry = async (
  projectName: string,
  mcpRegistryName: string,
  mcpRegistryNamespace: string,
): Promise<unknown> => {
  // Import the service function to avoid circular dependencies
  const { createManagedRegistryEntry: createViaApi } = await import('../mcpRegistryService');
  return createViaApi(mcpRegistryNamespace, mcpRegistryName, projectName);
};

/**
 * Import a catalog entry into an existing MCPRegistry's registries array
 * @param mcpRegistryName Name of the MCPRegistry instance to update
 * @param mcpRegistryNamespace Namespace of the MCPRegistry instance
 * @param catalogEntry Catalog entry to add to the registries array
 */
export const importCatalogToRegistry = async (
  mcpRegistryName: string,
  mcpRegistryNamespace: string,
  catalogEntry: McpRegistryRegistryEntry,
): Promise<K8sResourceCommon> => {
  // Get the current MCPRegistry
  const isMcpRegistry = (value: unknown): value is McpRegistry => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'spec' in value &&
      typeof value.spec === 'object' &&
      value.spec !== null
    );
  };
  const registryResourceResult = await getMcpRegistry(mcpRegistryName, mcpRegistryNamespace);
  if (!isMcpRegistry(registryResourceResult)) {
    throw new Error('Invalid MCPRegistry resource');
  }
  const registryResource = registryResourceResult;

  // Check if catalog entry with same name already exists
  const existingRegistries = registryResource.spec.registries || [];
  const existingEntry = existingRegistries.find((entry) => entry.name === catalogEntry.name);
  if (existingEntry) {
    throw new Error(`Catalog entry with name "${catalogEntry.name}" already exists`);
  }

  // Add the new entry to the registries array
  const updatedRegistry: McpRegistry = {
    ...registryResource,
    spec: {
      ...registryResource.spec,
      registries: [...existingRegistries, catalogEntry],
    },
  };

  // Update the MCPRegistry
  return k8sUpdateResource({
    model: McpRegistryModel,
    resource: updatedRegistry,
  });
};

/**
 * Delete a Kubernetes Deployment
 * @param name Name of the deployment
 * @param namespace Namespace of the deployment
 */
export const deleteDeployment = async (name: string, namespace: string): Promise<void> => {
  const DeploymentModel: K8sModelCommon = {
    apiVersion: 'v1',
    apiGroup: 'apps',
    kind: 'Deployment',
    plural: 'deployments',
  };

  try {
    await k8sDeleteResource({
      model: DeploymentModel,
      queryOptions: { name, ns: namespace },
    });
  } catch (error) {
    // If deployment doesn't exist, that's okay (it may have already been deleted)
    // Only throw if it's a different error
    if (error instanceof Error && !error.message.includes('not found')) {
      throw error;
    }
  }
};
