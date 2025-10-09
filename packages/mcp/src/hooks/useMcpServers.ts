import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as React from 'react';
import { McpServer } from '../types/server';
import { McpServerModel } from '../api/models/mcp';
import { groupVersionKind } from '../api/k8s/mcp';

export const useMcpServers = (namespace: string): [McpServer[], boolean, Error | undefined] => {
  const [data, loaded, error] = useK8sWatchResource<McpServer[]>(
    namespace
      ? {
          groupVersionKind: groupVersionKind(McpServerModel),
          namespace,
          isList: true,
        }
      : null,
    McpServerModel,
  );

  const loadError = React.useMemo(() => {
    if (error instanceof Error) {
      return error;
    }

    return error ? new Error('Unknown error occurred') : undefined;
  }, [error]);

  // SDK returns array directly, handle undefined case
  // disable as data can be `undefined` by the type in the SDK is incorrect
  const servers = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return data || [];
  }, [data]);

  return [servers, loaded, loadError];
};

// Hook with filtering capabilities for server browsing
export const useMcpServersWithFilters = (
  namespace: string,
  filters?: {
    transport?: string;
    tier?: string;
    search?: string;
  },
): [McpServer[], boolean, Error | undefined] => {
  const [allServers, loaded, error] = useMcpServers(namespace);

  const filteredServers = React.useMemo(() => {
    if (!filters) return allServers;

    return allServers.filter((server) => {
      // Transport filter
      if (filters.transport && server.spec.transport !== filters.transport) {
        return false;
      }

      // Tier filter
      if (filters.tier && server.spec.tier !== filters.tier) {
        return false;
      }

      // Search filter (name or metadata)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const name = server.metadata?.name?.toLowerCase() || '';
        const displayName = server.metadata?.annotations?.['display-name']?.toLowerCase() || '';

        if (!name.includes(searchLower) && !displayName.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [allServers, filters]);

  return [filteredServers, loaded, error];
};
