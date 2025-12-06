# Update Registry Feature

## Overview

The Update Registry feature allows users to edit existing MCP registry configurations, reusing the creation wizard in edit mode with pre-populated values.

## Feature Goals

- Enable users to update registry configurations
- Pre-populate form with existing registry values
- Maintain validation and source checking
- Support all source types (Git, ConfigMap, HTTP)

## UI Requirements

### Edit Flow

1. **Trigger**: Edit button on registry card or details page
2. **Modal**: Opens creation wizard in edit mode
3. **Pre-population**: All fields filled with current registry values
4. **Validation**: Same validation as creation
5. **Update**: Saves changes to existing registry

## Technical Implementation

### Components

- `McpRegistryCreateModal.tsx` - Reused in edit mode
- Edit button triggers modal with `editRegistry` prop

### API

- `updateMcpRegistry()` - Updates existing registry CRD

## Status

✅ **Complete** - Registry update functionality is fully implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

