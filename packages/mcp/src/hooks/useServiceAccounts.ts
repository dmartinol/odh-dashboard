import { K8sResourceCommon, useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as React from 'react';

export interface ServiceAccountKind extends K8sResourceCommon {
  apiVersion: 'v1';
  kind: 'ServiceAccount';
  secrets?: Array<{
    name: string;
  }>;
  imagePullSecrets?: Array<{
    name: string;
  }>;
}

const ServiceAccountModel = {
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  plural: 'serviceaccounts',
};

/**
 * Hook to fetch Kubernetes service accounts from a namespace
 * @param namespace - The namespace to fetch service accounts from
 * @returns Tuple of [serviceAccounts, loaded, error]
 */
export const useServiceAccounts = (
  namespace?: string,
): [ServiceAccountKind[], boolean, Error | undefined] => {
  const [data, loaded, error] = useK8sWatchResource<ServiceAccountKind[]>(
    namespace
      ? {
          groupVersionKind: { version: 'v1', kind: 'ServiceAccount' },
          namespace,
          isList: true,
        }
      : null,
    ServiceAccountModel,
  );

  const loadError = React.useMemo(() => {
    if (error instanceof Error) {
      return error;
    }
    return error ? new Error('Unknown error occurred') : undefined;
  }, [error]);

  const serviceAccounts = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return data || [];
  }, [data]);

  return [serviceAccounts, loaded, loadError];
};
