import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
  K8sResourceCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { McpRegistry } from '../../types/registry';
import { McpServer } from '../../types/server';
import { McpRegistryModel, McpServerModel } from '../models/mcp';

// Utility to create groupVersionKind
export const groupVersionKind = (
  model: typeof McpRegistryModel | typeof McpServerModel,
): { group: string; version: string; kind: string } => ({
  group: model.apiGroup,
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
