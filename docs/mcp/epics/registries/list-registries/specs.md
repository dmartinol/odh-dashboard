# List Registries Feature

## Overview

The List Registries feature provides a dashboard view of all MCP registries with status indicators, health monitoring, search, and filtering capabilities.

## Feature Goals

- Display all MCP registries in a card-based layout
- Show registry status, health, and metadata
- Enable search and filtering
- Provide responsive grid layout

## UI Requirements

### Registry Dashboard Layout

The registry dashboard displays:

1. **Page Header**
   - Title: "MCP Registries"
   - Create button for new registry

2. **Project Selector**
   - Filter registries by project/namespace
   - Defaults to preferred project

3. **Registry Cards**
   - Card-based layout for displaying registries
   - Each card shows:
     - Registry name and status indicator
     - Source type (git, http, configmap)
     - Server count
     - Sync policy and last sync time
     - Health status
     - Action buttons (sync, edit, delete, view)

### Visual Design

- Follows ODH design system patterns
- Uses PatternFly Card components
- Responsive grid layout
- Status indicators with color coding

## Technical Implementation

### Components

- `McpRegistriesPage.tsx` - Main registry list page
- `McpRegistryCard.tsx` - Individual registry card component

### Hooks

- `useMcpRegistries(namespace)` - Real-time registry list via Kubernetes Watch API

### Real-time Updates

- Uses `useK8sWatchResource` for real-time updates
- WebSocket communication via Kubernetes Watch API
- No polling required

## Status

✅ **Complete** - Registry dashboard is fully implemented with real-time updates.

---

_See [tasks.md](./tasks.md) for development tasks._

