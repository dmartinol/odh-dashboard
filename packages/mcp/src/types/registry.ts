import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export interface McpRegistry extends K8sResourceCommon {
  apiVersion: 'toolhive.stacklok.dev/v1alpha1';
  kind: 'MCPRegistry';
  spec: {
    catalogs?: Array<{
      name: string;
      url?: string;
    }>;
    displayName?: string;
    description?: string;
    source?: McpRegistrySource;
    syncPolicy?: McpRegistrySyncPolicy;
    filter?: McpRegistryFilter;
  };
  status?: McpRegistryStatus;
}

export interface McpRegistrySource {
  type: 'git' | 'http' | 'configmap';
  format?: string;
  git?: {
    repository: string;
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
  tags?: {
    include?: string[];
    exclude?: string[];
  };
}

export interface McpRegistryStatus {
  phase: 'Pending' | 'Syncing' | 'Ready' | 'Complete' | 'Failed';
  message?: string;
  lastSyncTime?: string; // Deprecated: kept for backward compatibility
  serverCount?: number;
  syncStatus?: {
    lastAttempt?: string;
    lastSyncHash?: string;
    lastSyncTime?: string;
    message?: string;
    phase?: 'Pending' | 'Syncing' | 'Ready' | 'Complete' | 'Failed';
    serverCount?: number;
  };
  apiStatus?: {
    endpoint?: string;
    phase?: 'Ready' | 'NotReady';
    message?: string;
    readySince?: string;
  };
  storageRef?: {
    type?: string;
    configMapRef?: {
      name?: string;
    };
  };
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
