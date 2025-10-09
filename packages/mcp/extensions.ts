import type {
  HrefNavItemExtension,
  RouteExtension,
  NavSectionExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax, import/no-extraneous-dependencies
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_MCP = 'plugin-mcp';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension | NavSectionExtension)[] =
  [
    {
      type: 'app.area',
      properties: {
        id: PLUGIN_MCP,
        reliantAreas: [SupportedArea.MCP_REGISTRIES, SupportedArea.MCP_SERVERS],
        featureFlags: ['disableMcp'],
      },
    },
    {
      type: 'app.navigation/section',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'mcp',
        title: 'Model Context Protocol',
        group: '4_mcp',
        // iconRef: () => import('#~/images/icons/McpNavIcon'),
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'mcp-registries',
        title: 'Registries',
        href: '/mcp/registries',
        section: 'mcp',
        path: '/mcp/registries/*',
      },
    },
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'mcp-servers',
        title: 'Servers',
        href: '/mcp/servers',
        section: 'mcp',
        path: '/mcp/servers/*',
      },
    },
    {
      type: 'app.route',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        path: '/mcp/*',
        component: () => import('./src/McpRoutes'),
      },
    },
  ];

export default extensions;
