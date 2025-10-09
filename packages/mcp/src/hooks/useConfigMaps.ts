import * as React from 'react';
import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';
import { ConfigMapModel } from '@odh-dashboard/internal/api/models/k8s';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import useFetchState, {
  FetchState,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetchState';

const listConfigMaps = async (namespace?: string): Promise<ConfigMapKind[]> => {
  const queryOptions = {
    ns: namespace,
  };
  return k8sListResourceItems<ConfigMapKind>({
    model: ConfigMapModel,
    queryOptions,
  });
};

const useConfigMaps = (namespace?: string, refreshRate = 0): FetchState<ConfigMapKind[]> => {
  return useFetchState<ConfigMapKind[]>(
    React.useCallback(() => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }
      return listConfigMaps(namespace);
    }, [namespace]),
    [],
    { refreshRate, initialPromisePurity: true },
  );
};

export default useConfigMaps;
