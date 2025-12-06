# View Server Details Feature

## Overview

The View Server Details feature provides comprehensive server information in a modal dialog with tabbed interface, showing overview, tools, configuration, and manual installation instructions.

## Feature Goals

- Display comprehensive server information
- Show available tools with descriptions and input schemas
- Display server configuration (environment variables, prompts, resources)
- Provide manual installation instructions

## UI Requirements

### Server Details Modal Layout

The server details modal displays:

1. **Modal Header**
   - Server name and logo
   - Transport protocol badge
   - Tier badge

2. **Tabbed Interface**
   - **Overview Tab**: Server metadata, description, transport, tier
   - **Tools Tab**: Available tools with descriptions and input schemas
   - **Config Tab**: Environment variables, prompts, resources
   - **Manual Installation Tab**: Docker commands and source repository links

3. **Server Information**
   - Logo integration from server metadata
   - Technical specifications display
   - Complete metadata presentation

## Technical Implementation

### Components

- `McpServerDetailsModal.tsx` - Server details modal with tabs

### Features

- MCP v0 API support
- Tools parsing for string arrays
- Environment variables display with Required/Secret labels
- Server icon fetching

## Status

✅ **Complete** - Server details modal is fully implemented with comprehensive information display.

---

_See [tasks.md](./tasks.md) for development tasks._

