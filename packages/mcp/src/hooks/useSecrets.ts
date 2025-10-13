import { K8sResourceCommon, useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as React from 'react';

export interface SecretKind extends K8sResourceCommon {
  apiVersion: 'v1';
  kind: 'Secret';
  type?: string;
  data?: Record<string, string>;
  stringData?: Record<string, string>;
}

const SecretModel = {
  apiVersion: 'v1',
  kind: 'Secret',
  plural: 'secrets',
};

/**
 * Hook to fetch Kubernetes secrets from a namespace
 * @param namespace - The namespace to fetch secrets from
 * @returns Tuple of [secrets, loaded, error]
 */
export const useSecrets = (namespace?: string): [SecretKind[], boolean, Error | undefined] => {
  const [data, loaded, error] = useK8sWatchResource<SecretKind[]>(
    namespace
      ? {
          groupVersionKind: { version: 'v1', kind: 'Secret' },
          namespace,
          isList: true,
        }
      : null,
    SecretModel,
  );

  const loadError = React.useMemo(() => {
    if (error instanceof Error) {
      return error;
    }
    return error ? new Error('Unknown error occurred') : undefined;
  }, [error]);

  const secrets = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return data || [];
  }, [data]);

  return [secrets, loaded, loadError];
};

/**
 * Extract keys from a secret's data field
 * @param secret - The secret to extract keys from
 * @returns Array of key names
 */
export const getSecretKeys = (secret: SecretKind): string[] => {
  const dataKeys = secret.data ? Object.keys(secret.data) : [];
  const stringDataKeys = secret.stringData ? Object.keys(secret.stringData) : [];
  return [...new Set([...dataKeys, ...stringDataKeys])];
};
