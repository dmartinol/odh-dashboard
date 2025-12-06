# Register Instance Feature

## Overview

The Register Instance feature allows users to link unregistered MCP server instances to registries by adding the appropriate ToolHive labels.

## Feature Goals

- Enable users to register unregistered servers with registries
- Provide registry selector interface
- Show preview of labels that will be added
- Validate registration configuration

## UI Requirements

### Registration Modal Layout

The registration modal displays:

1. **Registry Selector**
   - Dropdown to select target registry
   - Shows registry name and namespace

2. **Server Information**
   - Server name in registry field
   - Validation for server name format

3. **Label Preview**
   - Preview of labels that will be added:
     - `toolhive.stacklok.io/registry-name`
     - `toolhive.stacklok.io/registry-namespace`
     - `toolhive.stacklok.io/server-registry-name`

## Technical Implementation

### Components

- `McpServerRegisterModal.tsx` - Registration modal

### API

- `patchMcpServer()` - Updates server CRD with labels using K8s API

## Status

✅ **Complete** - Instance registration is fully implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

