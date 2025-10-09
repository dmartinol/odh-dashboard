import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export interface McpServer extends K8sResourceCommon {
  apiVersion: 'toolhive.stacklok.dev/v1alpha1';
  kind: 'MCPServer';
  spec: {
    image: string;
    transport: McpTransport;
    tier: McpServerTier;
    config?: McpServerConfig;
    deployment?: McpServerDeployment;
  };
  status?: McpServerStatus;
}

export type McpTransport = 'stdio' | 'sse' | 'http' | 'websocket';

export type McpServerTier = 'official' | 'community' | 'experimental';

export interface McpServerConfig {
  env?: Array<{
    name: string;
    value?: string;
    valueFrom?: {
      secretKeyRef?: {
        name: string;
        key: string;
      };
      configMapKeyRef?: {
        name: string;
        key: string;
      };
    };
  }>;
  args?: string[];
  command?: string[];
  workingDir?: string;
}

export interface McpServerDeployment {
  replicas?: number;
  resources?: {
    requests?: {
      cpu?: string;
      memory?: string;
    };
    limits?: {
      cpu?: string;
      memory?: string;
    };
  };
  nodeSelector?: Record<string, string>;
  tolerations?: Array<{
    key?: string;
    operator?: 'Exists' | 'Equal';
    value?: string;
    effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  }>;
}

export interface McpServerStatus {
  phase: 'Pending' | 'Running' | 'Failed' | 'Unknown';
  message?: string;
  ready: boolean;
  replicas?: number;
  readyReplicas?: number;
  endpoint?: string;
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
  [key: string]: unknown;
}

export interface McpServerMetadata {
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  logo?: string;
  tools?: McpToolMetadata[];
  prompts?: McpPromptMetadata[];
  resources?: McpResourceMetadata[];
}

export interface McpToolMetadata {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpPromptMetadata {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface McpResourceMetadata {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}
