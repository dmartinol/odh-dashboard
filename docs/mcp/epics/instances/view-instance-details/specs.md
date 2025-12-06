# View Instance Details Feature

## Overview

The View Instance Details feature provides comprehensive information about a deployed MCP server instance, including deployment info, specification, status, and metadata.

## Feature Goals

- Display detailed server instance information
- Show deployment configuration and status
- Provide access to server specification
- Display labels and annotations

## UI Requirements

### Instance Details Modal Layout

The instance details modal displays:

1. **Modal Header**
   - Server name
   - Status indicator

2. **Tabbed Interface**
   - **Overview Tab**: Server metadata, deployment info, endpoint with copy functionality
   - **Spec Tab**: Complete server specification in key-value format
   - **Status Tab**: Runtime status and conditions
   - **Labels & Annotations Tab**: All metadata labels and annotations

3. **Links**
   - Link to registry details page if server is registered

## Technical Implementation

### Components

- `McpDeployedServerDetailsModal.tsx` - Instance details modal

### Features

- Endpoint copy-to-clipboard functionality
- Registry link integration
- Complete specification display

## Status

✅ **Complete** - Instance details modal is fully implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

