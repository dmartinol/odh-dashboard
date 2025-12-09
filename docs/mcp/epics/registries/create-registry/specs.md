# Create Registry Feature

## Overview

The Create Registry feature provides functionality for creating new managed registry entries in existing MCPRegistry instances. When no registry exists for a selected project, users can create a managed registry entry that references a ConfigMap-based catalog source.

**Note**: The Create Registry button has been removed from the MCP Registries page. Registry creation is now initiated from the "No registry exists" information panel.

## Feature Goals

- Enable users to create managed registry entries when no registry exists for a project
- Create ConfigMap-based registry entries in existing MCPRegistry instances
- Support simplified creation flow for managed registries

## UI Requirements

### No Registry Exists Panel

When no registry exists for the selected project, the information panel is updated to:

1. **Display Message**: "No registry exists for this project"
2. **Add Question**: "Do you want to create one?"
3. **Add Action Button**: "Create Registry" button

### Creation Flow

When user clicks "Create Registry" from the information panel:

1. **Check for Existing MCPRegistry Instance**
   - System searches for exactly one MCPRegistry instance (may be in a different namespace than selected project)
   - If exactly one instance is found, proceed with creation
   - If zero or multiple instances exist, show appropriate error message

2. **Create Managed Registry Entry**
   - Create a new entry in the `registries` array of the existing ConfigMap names as:
   `{MCPRegistryName}-registry-server-config`.
   - DO NOT update the `MCPRegistry` insytance for now as it does not support managed registries.
   - Entry structure:
     ```json
     {
       "name": "project-name",
       "format": "upstream",
       "managed": {}
     }
     ```
   - ConfigMap reference:
     - ConfigMap name: `{MCPRegistryName}-registry-server-config`
     - ConfigMap namespace: Same namespace as the MCPRegistry instance (may differ from selected project)
     - The ConfigMap should already exist or be created by the operator

### Example Registry Entry

Based on the requirement, the created entry should match this format:
```yaml
- name: PROJECT NAME
  format: ""
  managed: {}
```

## Technical Implementation

### Components

- `McpRegistriesPage.tsx` - Updated to remove Create Registry button and modify "No registry exists" panel

### API Operations

1. **Find MCPRegistry Instance**
   - Search across all namespaces (or specific scope) for MCPRegistry instances
   - Verify exactly one instance exists
   - Get the instance details (name, namespace)
  
2. **Find ConfigMap Instance**
   - Search across the same namespace the ConfigMap with name `{MCPRegistryName}-registry-server-config`

3. **Create Managed Registry Entry**
   - Fetch the existing ConfigMap
   - Add new entry to `registries` array
   - Entry name: Selected project name
   - Format: Empty string
   - Managed: Empty object
   - Update ConfigMap via Kubernetes API
  
4. **Restart the Deployment**
   - Fetch existing deployment names as `{MCPRegistryName}-api`
   - Show a confirmation dialog saying that the deployment needs to restart and it will be deleted 
   - (remark that's a temporary workaround until the API endpoints are added)


### Validation

- Verify exactly one MCPRegistry instance exists before allowing creation
- Ensure project name is valid Kubernetes name
- Check if registry entry with same name already exists (prevent duplicates)

### Error Handling

- Display error if no MCPRegistry instance found
- Display error if multiple MCPRegistry instances found
- Display error if no ConfigMap instance found (by name)
- Display error if ConfigMap update fails
- Show user-friendly error messages

## User Flow

1. User navigates to MCP Registries page
2. User selects a project
3. System checks for registry existence in selected project
4. If no registry exists, information panel displays:
   - "No registry exists for this project"
   - "Do you want to create one?"
   - "Create Registry" button
5. User clicks "Create Registry" button
6. System searches for exactly one MCPRegistry instance
7. System searches for the related ConfigMap instance
8. If both are found, system creates managed registry entry:
   - Adds entry to `registries` array
   - Entry name: Project name
   - Format: Empty string
   - Managed: Empty object
9. Success notification is displayed
10. Page refreshes to show new registry

## Status

🟡 **In Progress** - Create Registry button removed. Simplified creation flow for managed registries pending implementation.

---

_See [tasks.md](./tasks.md) for development tasks._

