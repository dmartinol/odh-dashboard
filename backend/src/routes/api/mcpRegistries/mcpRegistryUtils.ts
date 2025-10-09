import { KubeFastifyInstance, McpRegistry, McpRegistryList } from '../../../types';

const MCP_REGISTRY_API_GROUP = 'toolhive.stacklok.dev';
const MCP_REGISTRY_API_VERSION = 'v1alpha1';
const MCP_REGISTRY_PLURAL = 'mcpregistries';

// Remove getMcpNamespace - namespace is now passed as parameter

export const listMcpRegistries = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  labelSelector?: string,
): Promise<McpRegistryList> => {
  const response = await (fastify.kube.customObjectsApi.listNamespacedCustomObject(
    MCP_REGISTRY_API_GROUP,
    MCP_REGISTRY_API_VERSION,
    namespace,
    MCP_REGISTRY_PLURAL,
    undefined,
    undefined,
    undefined,
    labelSelector,
    // listNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: McpRegistryList }>);
  return response.body;
};

export const getMcpRegistry = async (
  fastify: KubeFastifyInstance,
  registryName: string,
  namespace: string,
): Promise<McpRegistry> => {
  const response = await (fastify.kube.customObjectsApi.getNamespacedCustomObject(
    MCP_REGISTRY_API_GROUP,
    MCP_REGISTRY_API_VERSION,
    namespace,
    MCP_REGISTRY_PLURAL,
    registryName,
    // getNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: McpRegistry }>);
  return response.body;
};

export const createMcpRegistry = async (
  fastify: KubeFastifyInstance,
  registry: McpRegistry,
  namespace: string,
): Promise<McpRegistry> => {
  const response = await (fastify.kube.customObjectsApi.createNamespacedCustomObject(
    MCP_REGISTRY_API_GROUP,
    MCP_REGISTRY_API_VERSION,
    namespace,
    MCP_REGISTRY_PLURAL,
    registry,
    // createNamespacedCustomObject doesn't support TS generics and returns body as `object`, so we assert its real type
  ) as Promise<{ body: McpRegistry }>);
  return response.body;
};

export const deleteMcpRegistry = async (
  fastify: KubeFastifyInstance,
  registryName: string,
  namespace: string,
): Promise<{ body: object }> => {
  return fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
    MCP_REGISTRY_API_GROUP,
    MCP_REGISTRY_API_VERSION,
    namespace,
    MCP_REGISTRY_PLURAL,
    registryName,
  );
};
