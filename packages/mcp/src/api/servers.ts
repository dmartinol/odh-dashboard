import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { McpServer, McpListOptions } from '../types';

const McpServerModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'toolhive.stacklok.dev',
  kind: 'MCPServer',
  plural: 'mcpservers',
};

// List all MCP servers
export const listMcpServers = (
  namespace?: string,
  options?: McpListOptions,
): Promise<McpServer[]> => {
  const queryOptions = {
    ns: namespace,
    queryParams: {
      ...(options?.labelSelector && { labelSelector: options.labelSelector }),
      ...(options?.fieldSelector && { fieldSelector: options.fieldSelector }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.continue && { continue: options.continue }),
    },
  };

  return k8sListResourceItems<McpServer>({
    model: McpServerModel,
    queryOptions,
  });
};

// Get a specific MCP server
export const getMcpServer = (name: string, namespace: string): Promise<McpServer> => {
  return k8sGetResource<McpServer>({
    model: McpServerModel,
    queryOptions: { name, ns: namespace },
  });
};

// Deploy (create) a new MCP server
export const deployMcpServer = (server: McpServer): Promise<McpServer> => {
  return k8sCreateResource<McpServer>({
    model: McpServerModel,
    resource: server,
  });
};

// Undeploy (delete) an MCP server
export const undeployMcpServer = (name: string, namespace: string): Promise<McpServer> => {
  return k8sDeleteResource<McpServer>({
    model: McpServerModel,
    queryOptions: { name, ns: namespace },
  });
};

// List servers from a specific registry
export const listServersFromRegistry = (
  registryName: string,
  namespace?: string,
): Promise<McpServer[]> => {
  const labelSelector = `mcp.toolhive.stacklok.dev/registry=${registryName}`;
  return listMcpServers(namespace, { labelSelector });
};

// Search servers by transport type
export const listServersByTransport = (
  transport: string,
  namespace?: string,
): Promise<McpServer[]> => {
  const labelSelector = `mcp.toolhive.stacklok.dev/transport=${transport}`;
  return listMcpServers(namespace, { labelSelector });
};

// Search servers by tier
export const listServersByTier = (tier: string, namespace?: string): Promise<McpServer[]> => {
  const labelSelector = `mcp.toolhive.stacklok.dev/tier=${tier}`;
  return listMcpServers(namespace, { labelSelector });
};
