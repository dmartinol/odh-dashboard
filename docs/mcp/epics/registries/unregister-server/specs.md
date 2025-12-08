# Unregister Server Feature

## Overview

The Unregister Server feature allows users to remove servers from a registry. When a user unregisters a server, all versions of that server are deleted from the registry, and the view is automatically refreshed to reflect the changes.

## User Flow

1. User navigates to a registry details page (AI Hub > MCP registries > [Registry Name])
2. User views the list of servers in the "Available Servers" tab
3. For each server, an "Unregister" button is displayed
4. User clicks "Unregister" button
5. A confirmation dialog opens showing:
   - Server name and description
   - Number of versions that will be deleted
   - Warning message about the action being irreversible
6. User confirms the unregistration
7. System deletes all versions of the server from the registry
8. Success notification is displayed
9. Server list is automatically refreshed to remove the unregistered server

## Functional Requirements

### UI Components

#### Unregister Button
- **Location**: Server card in registry details view, next to "Deploy" button
- **Visibility**: Only visible when viewing servers from a registry (not from catalogs)
- **Action**: Opens confirmation dialog
- **Style**: Secondary variant button with warning icon

#### Confirmation Dialog
- **Title**: "Unregister Server: {serverName}"
- **Content**:
  - Server information (name, description, version)
  - Warning message: "This action will permanently remove all versions of this server from the registry. This action cannot be undone."
  - List of versions that will be deleted (if multiple versions exist)
- **Actions**:
  - "Cancel" button (closes dialog)
  - "Unregister" button (primary, destructive style - starts deletion process)
- **Loading State**: Shows spinner and disables buttons during deletion

### Backend API

#### Delete Server Endpoint
- **Endpoint**: `DELETE /api/mcpRegistries/:namespace/:registryName/servers/:serverName/versions/:version`
- **Purpose**: Delete a specific version of a server from the registry
- **Proxies to**: `DELETE {endpoint}/registry/{registryName}/v0.1/servers/{serverName}/versions/{version}`
- **Response**: Success or error message

### Unregistration Process

1. **When user confirms unregistration**:
   - Extract server name and current version from the server metadata
   - If the server has multiple versions:
     - Fetch all versions of the server from the registry
     - Delete each version sequentially
   - If the server has a single version:
     - Delete that version directly
   - Track success/failure for each deletion

2. **After all versions deleted**:
   - Display success notification: "Server '{serverName}' has been successfully unregistered from the registry"
   - Automatically refresh the server list
   - Close the confirmation dialog

3. **Error Handling**:
   - If any version deletion fails:
     - Display error notification with details
     - Continue deleting remaining versions
     - Show partial success message if some versions were deleted

### Server Version Detection

- Servers may have multiple versions in the registry
- The system must:
  - Identify all versions of a server by name
  - Delete all versions when unregistering
  - Handle the case where a server has only one version

## Technical Requirements

### Data Format

#### Server Name Encoding
- Server names in URLs must be URL-encoded
- Example: `io.github.stacklok/adb-mysql-mcp-server` becomes `io.github.stacklok%2Fadb-mysql-mcp-server`
- Version numbers are used as-is in the URL path

### Backend Proxy

- All API calls go through backend proxy for security
- Backend handles:
  - Kubernetes service name resolution
  - DEV_MODE port forwarding (localhost:8888)
  - Authentication and authorization
  - Error handling and logging
  - URL encoding/decoding

### Frontend Components

- **McpServerUnregisterModal**: Confirmation dialog component
- **McpServerBrowser**: Updated to include Unregister button (only in registry context)
- **API Client**: Function for deleting server versions

## Integration Points

- **Registries Epic**: Uses registry details view and server browsing
- **Infrastructure Epic**: Uses backend proxy and notification system

## Acceptance Criteria

- [ ] Unregister button appears in server cards when viewing from registry details
- [ ] Unregister button does NOT appear when viewing from catalog details
- [ ] Confirmation dialog opens with server information and warning
- [ ] All versions of the server are deleted when confirmed
- [ ] Success notification is displayed after successful unregistration
- [ ] Server list is automatically refreshed after unregistration
- [ ] Error handling works correctly for all failure scenarios
- [ ] Backend proxy routes are implemented correctly
- [ ] DEV_MODE port forwarding works for local testing
- [ ] URL encoding is handled correctly for server names with special characters

---

_See [tasks.md](./tasks.md) for implementation tasks._

