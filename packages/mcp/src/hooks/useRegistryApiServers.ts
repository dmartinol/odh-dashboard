/**
 * React hook for fetching servers from MCP registry API (v0.1)
 * Automatically handles pagination to fetch all servers
 */

import * as React from 'react';
import { fetchServersFromRegistryApi } from '../api/registryApi';
import { McpServerMetadata } from '../types';

interface UseRegistryApiServersResult {
  servers: McpServerMetadata[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch servers from MCP registry API via backend proxy
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @returns Server list, loading state, error state, and refetch function
 */
export const useRegistryApiServers = (
  namespace: string | undefined,
  registryName: string | undefined,
): UseRegistryApiServersResult => {
  const [servers, setServers] = React.useState<McpServerMetadata[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    if (!namespace || !registryName) {
      setServers([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchServers = async () => {
      setLoading(true);
      setError(null);

      try {
        // fetchServersFromRegistryApi automatically handles pagination
        // and returns all servers from all pages
        const allServers = await fetchServersFromRegistryApi(namespace, registryName);

        setServers(allServers);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch servers');
        setServers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, [namespace, registryName, refreshKey]);

  const refetch = React.useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    servers,
    loading,
    error,
    refetch,
  };
};
