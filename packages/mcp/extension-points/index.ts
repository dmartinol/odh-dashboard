import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

// MCP Registry Extension Point
export type McpRegistryExtension = Extension<
  'mcp.registry',
  {
    id: string;
    registryComponent: CodeRef<
      React.ComponentType<{
        registryConfig: Record<string, unknown>;
      }>
    >;
  }
>;

export const isMcpRegistryExtension = (extension: Extension): extension is McpRegistryExtension =>
  extension.type === 'mcp.registry';

// MCP Server Extension Point
export type McpServerExtension = Extension<
  'mcp.server',
  {
    id: string;
    serverComponent: CodeRef<
      React.ComponentType<{
        serverConfig: Record<string, unknown>;
      }>
    >;
  }
>;

export const isMcpServerExtension = (extension: Extension): extension is McpServerExtension =>
  extension.type === 'mcp.server';

// MCP Instance Extension Point
export type McpInstanceExtension = Extension<
  'mcp.instance',
  {
    id: string;
    instanceComponent: CodeRef<
      React.ComponentType<{
        instanceConfig: Record<string, unknown>;
      }>
    >;
  }
>;

export const isMcpInstanceExtension = (extension: Extension): extension is McpInstanceExtension =>
  extension.type === 'mcp.instance';
