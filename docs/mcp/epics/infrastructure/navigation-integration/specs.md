# Navigation Integration Feature

## Overview

The Navigation Integration feature migrates MCP features from a standalone section to an integrated navigation structure within AI Hub and Gen AI Studio sections.

## Feature Goals

- Integrate MCP features into existing ODH navigation sections
- Migrate from standalone "Model Context Protocol" section
- Update all route paths and breadcrumbs
- Create new Gen AI Studio section

## UI Requirements

### Navigation Structure

```
📍 Updated ODH Menu Structure:
├── 🤖 AI Hub (3_ai_hub)
│   ├── Registry (model registry)
│   ├── Catalog (model catalog)
│   ├── 📋 MCP catalogs
│   └── 📋 MCP registries (/ai-hub/mcp/registries)
│       └── 🔍 Registry Details (/ai-hub/mcp/registries/{name})
├── 🎨 Gen AI Studio (NEW SECTION)
│   └── 🔧 AI asset endpoints (/gen-ai-studio/assets)
```

### Route Path Changes

- `/mcp/registries` → `/ai-hub/mcp/registries`
- `/mcp/registries/:name` → `/ai-hub/mcp/registries/:name`
- `/mcp/servers` → `/gen-ai-studio/assets`

### Breadcrumb Updates

- `MCP > Registries > {name}` → `AI Hub > MCP Registries > {name}`
- `MCP > Servers` → `Gen AI Studio > AI Asset Endpoints`

## Technical Implementation

### Extension Configuration

- Gen AI Studio section (depends on MCP feature enablement)
- MCP Registries under AI Hub section
- MCP Catalogs under AI Hub section
- AI Asset Endpoints under Gen AI Studio section

## Status

✅ **Complete** - Navigation integration is fully implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

