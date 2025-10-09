import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export interface McpInstance extends K8sResourceCommon {
  apiVersion: 'apps/v1';
  kind: 'Deployment';
  spec: {
    replicas: number;
    selector: {
      matchLabels: Record<string, string>;
    };
    template: {
      metadata: {
        labels: Record<string, string>;
      };
      spec: {
        containers: Array<{
          name: string;
          image: string;
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
            requests?: Record<string, string>;
            limits?: Record<string, string>;
          };
          ports?: Array<{
            containerPort: number;
            protocol?: string;
            name?: string;
          }>;
        }>;
      };
    };
  };
  status?: McpInstanceStatus;
}

export interface McpInstanceStatus {
  replicas?: number;
  readyReplicas?: number;
  availableReplicas?: number;
  unavailableReplicas?: number;
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
  [key: string]: unknown;
}

export interface McpInstanceMetrics {
  cpu: {
    current: string;
    requested?: string;
    limit?: string;
  };
  memory: {
    current: string;
    requested?: string;
    limit?: string;
  };
  network?: {
    receivedBytes: number;
    transmittedBytes: number;
  };
}

export interface McpInstanceLogs {
  container: string;
  logs: string;
  timestamp: string;
}

export interface McpInstanceEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  timestamp: string;
  count?: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
}

// Derived types for UI components
export interface McpInstanceSummary {
  name: string;
  namespace: string;
  serverName?: string;
  registryName?: string;
  status: 'Running' | 'Pending' | 'Failed' | 'Unknown';
  ready: boolean;
  replicas: {
    desired: number;
    ready: number;
    available: number;
  };
  age: string;
  image: string;
  endpoint?: string;
}
