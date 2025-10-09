import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const McpRegistryModel: K8sModelCommon = {
  apiGroup: 'toolhive.stacklok.dev',
  apiVersion: 'v1alpha1',
  kind: 'MCPRegistry',
  plural: 'mcpregistries',
};

export const McpServerModel: K8sModelCommon = {
  apiGroup: 'toolhive.stacklok.dev',
  apiVersion: 'v1alpha1',
  kind: 'MCPServer',
  plural: 'mcpservers',
};
