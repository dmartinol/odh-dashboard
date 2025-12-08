# Approve Server Feature

## Overview

The Approve Server feature allows users to approve and publish servers from catalogs to multiple project registries. This enables administrators to curate and distribute approved servers across different projects.

## User Flow

1. User navigates to a catalog details page (AI Hub > MCP catalogs > [Catalog Name])
2. User views the list of servers in the catalog
3. For each server, an "Approve" button is displayed alongside the "Deploy" button
4. User clicks "Approve" button
5. A dialog opens allowing selection of multiple projects
6. User selects one or more projects where the server should be published
7. User clicks "Approve Server" button in the dialog
8. System processes each selected project:
   - Verifies registry exists for the project
   - Publishes server to the registry if it exists
   - Skips project if registry doesn't exist
9. A summary report is displayed showing:
   - Successfully published projects
   - Failed publications
   - Skipped projects (no registry)

## Functional Requirements

### UI Components

#### Approve Button
- **Location**: Server card in catalog details view, next to "Deploy" button
- **Visibility**: Always visible for servers in catalog view
- **Action**: Opens approval dialog

#### Approval Dialog
- **Title**: "Approve Server: {serverName}"
- **Content**:
  - Server information (name, description, tier, transport)
  - **Project Selection Section**:
    - **Search/Filter Input**: Filter available projects by name (real-time filtering)
    - **Selected Projects Display**: 
      - Shows selected projects as removable chips/badges
      - Each chip shows project name with remove button
      - Displays count of selected projects
    - **Available Projects List**:
      - Filtered list of projects (based on search input)
      - Click to add project to selection
      - Visual indicator for already selected projects
      - Scrollable list for long project lists
  - Information about what will happen (publish to registry)
- **Actions**:
  - "Cancel" button (closes dialog)
  - "Approve Server" button (starts approval process, shows count of selected projects)
- **Loading State**: Shows spinner and disables buttons during processing

### Backend API

#### Registry Verification
- **Endpoint**: `GET /api/mcpRegistries/:namespace/:registryName/verify`
- **Purpose**: Verify if a registry exists for a project
- **Returns**: `{ exists: boolean, registry?: RegistryApiRegistryResponse }`
- **Note**: Uses project name as registry name

#### Publish Server
- **Endpoint**: `POST /api/mcpRegistries/:namespace/:registryName/publish`
- **Purpose**: Publish a server to a registry
- **Request Body**: Server data in MCP v0.1 format
- **Response**: Success or error message
- **Proxies to**: `POST {endpoint}/registry/{registryName}/v0.1/publish`

### Approval Process

1. **For each selected project**:
   - Extract project name (used as registry name)
   - Call verification API: `GET /api/mcpRegistries/{projectName}/{projectName}/verify`
   - If registry exists:
     - Convert server metadata to MCP v0.1 format
     - Call publish API: `POST /api/mcpRegistries/{projectName}/{projectName}/publish`
     - Track success/failure
   - If registry doesn't exist:
     - Skip project
     - Track as "skipped"

2. **After all projects processed**:
   - Display notifications:
     - Success: "Server approved to {count} project(s): {project names}"
     - Failure: "Failed to approve server to {count} project(s): {project names}"
     - Skipped: "Skipped {count} project(s) (no registry): {project names}"

### Error Handling

- **Network Errors**: Show error notification with project name
- **Registry Not Found**: Skip project with warning (not an error)
- **Publish Failure**: Show error notification with project name and error message
- **Partial Success**: Show all three notification types if applicable

## Technical Requirements

### Data Format

#### Server Data for Publishing
- Server metadata must be converted to MCP v0.1 API format
- Format: `{ server: { name, description, repository, version, packages, ... } }`
- Uses the same format as returned by `/registry/{registryName}/v0.1/servers`

### Backend Proxy

- All API calls go through backend proxy for security
- Backend handles:
  - Kubernetes service name resolution
  - DEV_MODE port forwarding (localhost:8888)
  - Authentication and authorization
  - Error handling and logging

### Frontend Components

- **McpServerApproveModal**: Dialog component for project selection
- **McpServerBrowser**: Updated to include Approve button
- **API Client**: Functions for verification and publishing

## Integration Points

- **Catalogs Epic**: Uses catalog details view and server browsing
- **Registries Epic**: Uses registry verification and publishing APIs
- **Infrastructure Epic**: Uses backend proxy and notification system

## Acceptance Criteria

- [ ] Approve button appears next to Deploy button in catalog server cards
- [ ] Approval dialog opens with project multi-select
- [ ] Verification API is called for each selected project
- [ ] Publish API is called for projects with existing registries
- [ ] Projects without registries are skipped with warning
- [ ] Success/failure/skipped notifications are displayed
- [ ] Loading states are shown during processing
- [ ] Error handling works correctly for all failure scenarios
- [ ] Backend proxy routes are implemented correctly
- [ ] DEV_MODE port forwarding works for local testing

---

_See [tasks.md](./tasks.md) for implementation tasks._

