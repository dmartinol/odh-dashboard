import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const McpRegistryModel: K8sModelCommon = {
  apiGroup: 'toolhive.stacklok.dev',
  apiVersion: 'v1alpha1',
  kind: 'McpRegistry',
  plural: 'mcpregistries',
};

export const McpServerModel: K8sModelCommon = {
  apiGroup: 'toolhive.stacklok.dev',
  apiVersion: 'v1alpha1',
  kind: 'McpServer',
  plural: 'mcpservers',
};
