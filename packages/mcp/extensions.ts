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
    // MCP Catalogs under AI Hub section
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'mcp-catalogs',
        title: 'MCP catalogs',
        href: '/ai-hub/mcp/catalogs',
        section: 'ai-hub',
        path: '/ai-hub/mcp/catalogs/*',
      },
    },
    // MCP Registries under AI Hub section
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'mcp-registries',
        title: 'MCP registries',
        href: '/ai-hub/mcp/registries',
        section: 'ai-hub',
        path: '/ai-hub/mcp/registries/*',
      },
    },
    // Route for AI Hub MCP registries
    {
      type: 'app.route',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        path: '/ai-hub/mcp/*',
        component: () => import('./src/McpRoutes'),
      },
    },
    // Gen AI Studio section (depends on MCP feature)
    {
      type: 'app.navigation/section',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'gen-ai-studio',
        title: 'Gen AI studio',
        group: '4_gen_ai_studio',
        iconRef: () => import('./src/components/GenAiStudioNavIcon'),
      },
    },
    // AI Asset Endpoints under Gen AI Studio section
    {
      type: 'app.navigation/href',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        id: 'ai-asset-endpoints',
        title: 'AI asset endpoints',
        href: '/gen-ai-studio/assets',
        section: 'gen-ai-studio',
        path: '/gen-ai-studio/assets/*',
      },
    },
    // Route for Gen AI Studio AI Asset Endpoints
    {
      type: 'app.route',
      flags: {
        required: [PLUGIN_MCP],
      },
      properties: {
        path: '/gen-ai-studio/assets/*',
        component: () => import('./src/pages/McpServersPage'),
      },
    },
  ];

export default extensions;
