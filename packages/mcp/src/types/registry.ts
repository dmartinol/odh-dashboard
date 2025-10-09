import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export interface McpRegistry extends K8sResourceCommon {
  apiVersion: 'toolhive.stacklok.dev/v1alpha1';
  kind: 'McpRegistry';
  spec: {
    catalogs?: Array<{
      name: string;
      url?: string;
    }>;
    description?: string;
    source?: McpRegistrySource;
    syncPolicy?: McpRegistrySyncPolicy;
    filter?: McpRegistryFilter;
  };
  status?: McpRegistryStatus;
}

export interface McpRegistrySource {
  type: 'git' | 'http' | 'configmap';
  git?: {
    url: string;
    branch?: string;
    path?: string;
    auth?: {
      secretRef?: {
        name: string;
        namespace?: string;
      };
    };
  };
  http?: {
    url: string;
    headers?: Record<string, string>;
    auth?: {
      secretRef?: {
        name: string;
        namespace?: string;
      };
    };
  };
  configmap?: {
    name: string;
    namespace?: string;
    key: string;
  };
}

export interface McpRegistrySyncPolicy {
  enabled: boolean;
  interval?: string;
  autoSync?: boolean;
}

export interface McpRegistryFilter {
  include?: string[];
  exclude?: string[];
  tags?: string[];
}

export interface McpRegistryStatus {
  phase: 'Pending' | 'Syncing' | 'Ready' | 'Failed';
  message?: string;
  lastSyncTime?: string;
  serverCount?: number;
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
  [key: string]: unknown;
}

export interface McpRegistryList {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion: string;
    continue?: string;
  };
  items: McpRegistry[];
}
