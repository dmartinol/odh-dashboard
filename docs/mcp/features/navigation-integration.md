# Navigation Integration Feature

**Phase**: 5.1 | **Status**: ✅ Complete | **Duration**: Week 9

## Overview

Migration of MCP features from standalone section to integrated navigation structure within AI Hub and Gen AI Studio sections.

## Goal

Integrate MCP features into existing ODH navigation sections (AI Hub and Gen AI Studio) instead of maintaining a standalone "Model Context Protocol" section.

## Tasks

### 1. Navigation Restructure ✅ **COMPLETED**

- ✅ Migrate MCP Registries from standalone section to AI Hub section
- ✅ Create new "Gen AI Studio" section dependent on MCP feature enablement
- ✅ Migrate MCP Servers (AI Asset Endpoints) to Gen AI Studio section
- ✅ Update all route paths from `/mcp/*` to `/ai-hub/mcp/*` and `/gen-ai-studio/assets`
- ✅ Update breadcrumb navigation to reflect new structure
- ✅ Update extension configuration to use `section: 'ai-hub'` and `section: 'gen-ai-studio'`
- ✅ Add MCP Catalogs placeholder under AI Hub (future feature)
- ✅ Test navigation and routing after migration

## Deliverables

✅ **ALL COMPLETED**

- ✅ Navigation restructure completed (MCP features integrated into AI Hub and Gen AI Studio)
- ✅ All route paths updated
- ✅ Breadcrumb navigation updated
- ✅ Extension configuration updated
- ✅ MCP Catalogs placeholder added

## Technical Details

### Route Path Changes

**Old Routes**:
- `/mcp/registries` → **New:** `/ai-hub/mcp/registries`
- `/mcp/registries/:name` → **New:** `/ai-hub/mcp/registries/:name`
- `/mcp/servers` → **New:** `/gen-ai-studio/assets`

### Navigation Structure

```
📍 Updated ODH Menu Structure:
├── 🤖 AI Hub (3_ai_hub)
│   ├── Registry (model registry)
│   ├── Catalog (model catalog)
│   ├── 📋 MCP catalogs (NEW - placeholder)
│   └── 📋 MCP registries (/ai-hub/mcp/registries)
│       └── 🔍 Registry Details (/ai-hub/mcp/registries/{name})
├── 🎨 Gen AI Studio (NEW SECTION)
│   └── 🔧 AI asset endpoints (/gen-ai-studio/assets)
```

### Extension Configuration

```typescript
// Gen AI Studio section (depends on MCP feature)
{
  type: 'app.navigation/section',
  flags: { required: [PLUGIN_MCP] },
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
  flags: { required: [PLUGIN_MCP] },
  properties: {
    id: 'ai-asset-endpoints',
    title: 'AI asset endpoints',
    href: '/gen-ai-studio/assets',
    section: 'gen-ai-studio',
    path: '/gen-ai-studio/assets/*',
  },
},
```

### Breadcrumb Updates

**Old Breadcrumbs**:
- `MCP > Registries > {name}`

**New Breadcrumbs**:
- `AI Hub > MCP Registries > {name}`
- `Gen AI Studio > AI Asset Endpoints`

## Files Modified

**Extensions**:
- `packages/mcp/extensions.ts` - Updated navigation extensions

**Pages**:
- `packages/mcp/src/pages/McpRegistryDetailsPage.tsx` - Updated breadcrumbs
- `packages/mcp/src/pages/McpServersPage.tsx` - Updated route paths

**Components**:
- `packages/mcp/src/components/McpRegistryCard.tsx` - Updated navigation links
- `packages/mcp/src/components/McpServersTable.tsx` - Updated navigation links
- `packages/mcp/src/components/GenAiStudioNavIcon.tsx` - New icon component

**Routes**:
- `packages/mcp/src/McpRoutes.tsx` - Updated route paths

## Dependencies

- MCP feature flag (`disableMcp: false`) must be enabled
- `PLUGIN_MCP` area must be available
- Gen AI module federation remote must be running (for Gen AI Studio section)

## Summary

Successfully migrated MCP features from standalone section to integrated navigation structure. MCP Registries now appear under AI Hub section. AI Asset Endpoints now appear under new Gen AI Studio section. All route paths and breadcrumbs updated. Extension configuration updated to use new section structure. MCP Catalogs placeholder added for future feature. Navigation and routing tested and verified.

---

_See [plan.md](../plan.md) for phase overview._

