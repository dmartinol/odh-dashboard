# Delete Registry Feature

## Overview

The Delete Registry feature allows users to remove MCP registries with a confirmation dialog to prevent accidental deletions.

## Feature Goals

- Enable users to delete registries
- Provide confirmation dialog for safety
- Handle deletion errors gracefully
- Show success/error notifications

## UI Requirements

### Delete Flow

1. **Trigger**: Delete button on registry card or details page
2. **Confirmation**: Modal dialog asking for confirmation
3. **Warning**: Display registry name and warning message
4. **Action**: Delete button in confirmation dialog
5. **Feedback**: Success or error notification

## Technical Implementation

### Components

- `McpRegistryDeleteModal.tsx` - Confirmation dialog
- Delete button on registry cards

### API

- `deleteMcpRegistry(name, namespace)` - Deletes registry CRD

## Status

✅ **Complete** - Registry deletion is fully implemented with confirmation dialog.

---

_See [tasks.md](./tasks.md) for development tasks._

