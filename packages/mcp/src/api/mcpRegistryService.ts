import { McpRegistry, McpRegistryList } from '../types/registry';

export const getMcpRegistries = (
  namespace: string,
  opts?: RequestInit,
): Promise<McpRegistryList> => {
  const url = `/api/mcpRegistries/${namespace}`;
  return fetch(url, opts).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch MCP registries: ${response.statusText}`);
    }
    return response.json();
  });
};

export const getMcpRegistry = (
  namespace: string,
  registryName: string,
  opts?: RequestInit,
): Promise<McpRegistry> => {
  const url = `/api/mcpRegistries/${namespace}/${registryName}`;
  return fetch(url, opts).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch MCP registry ${registryName}: ${response.statusText}`);
    }
    return response.json();
  });
};

export const createMcpRegistry = (
  namespace: string,
  registry: McpRegistry,
  opts?: RequestInit,
): Promise<McpRegistry> => {
  const url = `/api/mcpRegistries/${namespace}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registry),
    ...opts,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to create MCP registry: ${response.statusText}`);
    }
    return response.json();
  });
};

export const deleteMcpRegistry = (
  namespace: string,
  registryName: string,
  opts?: RequestInit,
): Promise<void> => {
  const url = `/api/mcpRegistries/${namespace}/${registryName}`;
  return fetch(url, {
    method: 'DELETE',
    ...opts,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to delete MCP registry ${registryName}: ${response.statusText}`);
    }
  });
};
