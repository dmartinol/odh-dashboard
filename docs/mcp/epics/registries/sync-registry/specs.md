# Sync Registry Feature

## Overview

The Sync Registry feature enables users to manually trigger synchronization of a registry with its source repository, updating the available servers and metadata.

## Feature Goals

- Enable manual registry synchronization
- Provide visual feedback during sync
- Show sync status and results
- Support automatic sync configuration

## UI Requirements

### Sync Flow

1. **Trigger**: Sync button on registry card or details page
2. **Action**: Initiates sync operation
3. **Feedback**: Loading state, then success/error notification
4. **Status**: Real-time sync status updates

## Technical Implementation

### Components

- Sync button on registry cards
- Sync button on registry details page

### API

- `syncMcpRegistry(name, namespace)` - Triggers registry sync

## Status

✅ **Complete** - Manual registry sync is fully implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

