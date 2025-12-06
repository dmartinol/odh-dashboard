# Unregister Instance Feature

## Overview

The Unregister Instance feature allows users to remove registry links from MCP server instances by removing the ToolHive labels.

## Feature Goals

- Enable users to unregister servers from registries
- Remove registry-related labels
- Provide confirmation for the operation

## UI Requirements

### Unregister Flow

1. **Trigger**: Unregister option in row action menu
2. **Confirmation**: Confirmation dialog
3. **Action**: Remove registry labels from server
4. **Feedback**: Success or error notification

## Technical Implementation

### Components

- Unregister functionality integrated into registration modal or separate action

### API

- `patchMcpServer()` - Removes registry labels using K8s API

## Status

✅ **Complete** - Instance unregistration is fully implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

