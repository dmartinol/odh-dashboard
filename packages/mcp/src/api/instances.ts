import {
  k8sDeleteResource,
  k8sGetResource,
  k8sListResourceItems,
  k8sPatchResource,
  K8sModelCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
import { McpInstance, McpListOptions, McpInstanceSummary } from '../types';

const DeploymentModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'apps',
  kind: 'Deployment',
  plural: 'deployments',
};

// List all MCP server instances (deployments with MCP labels)
export const listMcpInstances = (
  namespace?: string,
  options?: McpListOptions,
): Promise<McpInstance[]> => {
  const mcpLabelSelector = 'mcp.toolhive.stacklok.dev/server';
  const finalLabelSelector = options?.labelSelector
    ? `${mcpLabelSelector},${options.labelSelector}`
    : mcpLabelSelector;

  const queryOptions = {
    ns: namespace,
    queryParams: {
      labelSelector: finalLabelSelector,
      ...(options?.fieldSelector && { fieldSelector: options.fieldSelector }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.continue && { continue: options.continue }),
    },
  };

  return k8sListResourceItems<McpInstance>({
    model: DeploymentModel,
    queryOptions,
  });
};

// Get a specific MCP instance
export const getMcpInstance = (name: string, namespace: string): Promise<McpInstance> => {
  return k8sGetResource<McpInstance>({
    model: DeploymentModel,
    queryOptions: { name, ns: namespace },
  });
};

// Delete an MCP instance
export const deleteMcpInstance = (name: string, namespace: string): Promise<McpInstance> => {
  return k8sDeleteResource<McpInstance>({
    model: DeploymentModel,
    queryOptions: { name, ns: namespace },
  });
};

// Scale an MCP instance
export const scaleMcpInstance = (
  name: string,
  namespace: string,
  replicas: number,
): Promise<McpInstance> => {
  const patch = [
    {
      op: 'replace',
      path: '/spec/replicas',
      value: replicas,
    },
  ];

  return k8sPatchResource<McpInstance>({
    model: DeploymentModel,
    queryOptions: { name, ns: namespace },
    patches: patch,
  });
};

// Stop an MCP instance (scale to 0)
export const stopMcpInstance = (name: string, namespace: string): Promise<McpInstance> => {
  return scaleMcpInstance(name, namespace, 0);
};

// Start an MCP instance (scale to 1)
export const startMcpInstance = (name: string, namespace: string): Promise<McpInstance> => {
  return scaleMcpInstance(name, namespace, 1);
};

// Restart an MCP instance (trigger rolling update)
export const restartMcpInstance = (name: string, namespace: string): Promise<McpInstance> => {
  const patch = [
    {
      op: 'replace',
      path: '/spec/template/metadata/annotations/kubectl.kubernetes.io~1restartedAt',
      value: new Date().toISOString(),
    },
  ];

  return k8sPatchResource<McpInstance>({
    model: DeploymentModel,
    queryOptions: { name, ns: namespace },
    patches: patch,
  });
};

// Get summary information for all instances
export const getMcpInstancesSummary = async (namespace?: string): Promise<McpInstanceSummary[]> => {
  const instances = await listMcpInstances(namespace);

  return instances.map((instance): McpInstanceSummary => {
    const serverName = instance.metadata?.labels?.['mcp.toolhive.stacklok.dev/server'];
    const registryName = instance.metadata?.labels?.['mcp.toolhive.stacklok.dev/registry'];
    const desired = instance.spec.replicas || 0;
    const ready = instance.status?.readyReplicas || 0;
    const available = instance.status?.availableReplicas || 0;

    // Calculate age
    const creationTime = new Date(instance.metadata?.creationTimestamp || Date.now());
    const now = new Date();
    const ageMs = now.getTime() - creationTime.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const ageMinutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));

    let age: string;
    if (ageDays > 0) {
      age = `${ageDays}d${ageHours}h`;
    } else if (ageHours > 0) {
      age = `${ageHours}h${ageMinutes}m`;
    } else {
      age = `${ageMinutes}m`;
    }

    // Determine status
    let status: McpInstanceSummary['status'];
    if (desired === 0) {
      status = 'Unknown';
    } else if (ready === desired) {
      status = 'Running';
    } else if (ready === 0) {
      status = 'Failed';
    } else {
      status = 'Pending';
    }

    return {
      name: instance.metadata?.name || 'unknown',
      namespace: instance.metadata?.namespace || 'default',
      serverName,
      registryName,
      status,
      ready: ready > 0 && ready === desired,
      replicas: {
        desired,
        ready,
        available,
      },
      age,
      image: instance.spec.template.spec.containers[0]?.image || 'unknown',
    };
  });
};

// List instances for a specific server
export const listInstancesForServer = (
  serverName: string,
  namespace?: string,
): Promise<McpInstance[]> => {
  const labelSelector = `mcp.toolhive.stacklok.dev/server=${serverName}`;
  return listMcpInstances(namespace, { labelSelector });
};

// List instances from a specific registry
export const listInstancesFromRegistry = (
  registryName: string,
  namespace?: string,
): Promise<McpInstance[]> => {
  const labelSelector = `mcp.toolhive.stacklok.dev/registry=${registryName}`;
  return listMcpInstances(namespace, { labelSelector });
};
