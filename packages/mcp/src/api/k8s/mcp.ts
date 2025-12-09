import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sPatchResource,
  k8sUpdateResource,
  K8sResourceCommon,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import YAML from 'yaml';
import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';
import { ConfigMapModel } from '@odh-dashboard/internal/api/models/k8s';
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
 * Create a managed registry entry in the ConfigMap's registries array
 * @param projectName Name of the project (used as registry entry name)
 * @param mcpRegistryName Name of the MCPRegistry instance (used to find ConfigMap)
 * @param mcpRegistryNamespace Namespace of the MCPRegistry instance
 */
export const createManagedRegistryEntry = async (
  projectName: string,
  mcpRegistryName: string,
  mcpRegistryNamespace: string,
): Promise<K8sResourceCommon> => {
  // Find the ConfigMap named {MCPRegistryName}-registry-server-config
  const configMapName = `${mcpRegistryName}-registry-server-config`;

  let configMap: ConfigMapKind;
  try {
    const resource = await k8sGetResource<ConfigMapKind>({
      model: ConfigMapModel,
      queryOptions: {
        name: configMapName,
        ns: mcpRegistryNamespace,
      },
    });
    configMap = resource;
  } catch (error) {
    throw new Error(
      `ConfigMap "${configMapName}" not found in namespace "${mcpRegistryNamespace}". ` +
        `The ConfigMap should be created by the operator.`,
    );
  }

  // Parse the ConfigMap data - look for config.yaml key first, then fall back to any key
  const dataKeys = Object.keys(configMap.data || {});
  if (dataKeys.length === 0) {
    throw new Error(`ConfigMap "${configMapName}" has no data keys`);
  }

  // Prefer config.yaml if it exists, otherwise use the first key
  const dataKey = dataKeys.includes('config.yaml') ? 'config.yaml' : dataKeys[0];
  const registryDataStr = configMap.data?.[dataKey];

  if (!registryDataStr || typeof registryDataStr !== 'string') {
    throw new Error(`ConfigMap "${configMapName}" data key "${dataKey}" is not a valid string`);
  }

  // Parse the YAML data (ConfigMap uses YAML format, not JSON)
  type RegistryData = { registries?: Array<{ name: string; [key: string]: unknown }> };
  const isRegistryData = (value: unknown): value is RegistryData => {
    return (
      typeof value === 'object' &&
      value !== null &&
      (!('registries' in value) || Array.isArray(value.registries))
    );
  };
  let registryData: RegistryData;
  try {
    const parsed = YAML.parse(registryDataStr);
    if (isRegistryData(parsed)) {
      registryData = parsed;
    } else {
      throw new Error('Invalid registry data structure');
    }
  } catch (error) {
    throw new Error(
      `ConfigMap "${configMapName}" contains invalid YAML in key "${dataKey}": ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }

  // Initialize registries array if it doesn't exist
  if (!registryData.registries) {
    registryData.registries = [];
  }

  // Check if registry entry with same name already exists
  const existingEntry = registryData.registries.find((entry) => entry.name === projectName);
  if (existingEntry) {
    const existingNames = registryData.registries.map((e) => e.name).join(', ');
    throw new Error(
      `Registry entry with name "${projectName}" already exists in ConfigMap "${configMapName}". ` +
        `Existing entries: ${existingNames || 'none'}.`,
    );
  }

  // Create new managed registry entry
  const newEntry = {
    name: projectName,
    format: '',
    managed: {},
  };

  // Add the new entry to the registries array
  registryData.registries.push(newEntry);

  // Update the ConfigMap with the modified data (convert back to YAML)
  const updatedConfigMap: ConfigMapKind = {
    ...configMap,
    data: {
      ...configMap.data,
      [dataKey]: YAML.stringify(registryData, { indent: 2 }),
    },
  };

  // Update the ConfigMap
  return k8sUpdateResource({
    model: ConfigMapModel,
    resource: updatedConfigMap,
  });
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
