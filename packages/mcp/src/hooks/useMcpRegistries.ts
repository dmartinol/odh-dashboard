import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as React from 'react';
import { McpRegistry } from '../types/registry';
import { McpRegistryModel } from '../api/models/mcp';
import { groupVersionKind } from '../api/k8s/mcp';

export const useMcpRegistries = (
  namespace?: string,
): [McpRegistry[], boolean, Error | undefined] => {
  // If namespace is provided, watch that namespace
  // If namespace is empty string or undefined, watch all namespaces
  const watchConfig =
    namespace === undefined
      ? null
      : {
          groupVersionKind: groupVersionKind(McpRegistryModel),
          ...(namespace ? { namespace } : {}), // Omit namespace to watch all
          isList: true,
        };

  const [data, loaded, error] = useK8sWatchResource<McpRegistry[]>(watchConfig, McpRegistryModel);

  const loadError = React.useMemo(() => {
    if (error instanceof Error) {
      return error;
    }

    return error ? new Error('Unknown error occurred') : undefined;
  }, [error]);

  // SDK returns array directly, handle undefined case
  // disable as data can be `undefined` by the type in the SDK is incorrect
  const registries = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return data || [];
  }, [data]);

  return [registries, loaded, loadError];
};
