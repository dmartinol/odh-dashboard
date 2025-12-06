# Delete Instance Feature

## Overview

The Delete Instance feature allows users to remove deployed MCP server instances with a confirmation dialog to prevent accidental deletions.

## Feature Goals

- Enable users to delete server instances
- Provide confirmation dialog for safety
- Handle deletion errors gracefully
- Show success/error notifications

## UI Requirements

### Delete Flow

1. **Trigger**: Delete option in row action menu
2. **Confirmation**: Modal dialog asking for confirmation
3. **Warning**: Display server name and warning message about irreversible action
4. **Action**: Delete button in confirmation dialog
5. **Feedback**: Success or error notification

## Technical Implementation

### Components

- `McpServerDeleteModal.tsx` - Confirmation dialog

### API

- `deleteMcpServer(name, namespace)` - Deletes server CRD

## Status

✅ **Complete** - Instance deletion is fully implemented with confirmation dialog.

---

_See [tasks.md](./tasks.md) for development tasks._

