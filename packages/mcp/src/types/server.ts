import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export interface McpServer extends K8sResourceCommon {
  apiVersion: 'toolhive.stacklok.dev/v1alpha1';
  kind: 'MCPServer';
  spec: McpServerSpec;
  status?: McpServerStatus;
}

export interface McpServerSpec {
  image: string;
  transport?: McpTransport;
  tier?: McpServerTier;
  proxyMode?: McpProxyMode;
  port?: number;
  targetPort?: number;
  args?: string[];
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
  volumes?: Array<{
    name: string;
    mountPath: string;
    [key: string]: unknown;
  }>;
  podTemplateSpec?: {
    metadata?: {
      labels?: Record<string, string>;
      annotations?: Record<string, string>;
    };
    spec?: {
      imagePullSecrets?: Array<{ name: string }>;
      serviceAccountName?: string;
      nodeSelector?: Record<string, string>;
      securityContext?: {
        runAsNonRoot?: boolean;
        runAsUser?: number;
        runAsGroup?: number;
        fsGroup?: number;
      };
    };
  };
  [key: string]: unknown; // Index signature for K8sResourceCommon compatibility
}

export type McpTransport = 'stdio' | 'streamable-http' | 'sse';

export type McpProxyMode = 'sse' | 'streamable-http';

export type McpServerTier = 'official' | 'community' | 'experimental';

export interface McpServerStatus {
  phase: 'Pending' | 'Running' | 'Failed' | 'Unknown';
  message?: string;
  ready: boolean;
  replicas?: number;
  readyReplicas?: number;
  endpoint?: string;
  url?: string; // Alternative endpoint field
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
  image?: string;
  transport?: McpTransport;
  target_port?: number;
  args?: string[];
  tools?: McpToolMetadata[];
  prompts?: McpPromptMetadata[];
  resources?: McpResourceMetadata[];
  env_vars?: McpEnvironmentVariable[];
}

export interface McpEnvironmentVariable {
  name: string;
  description?: string;
  required?: boolean;
  secret?: boolean;
  default?: string;
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
