# Import Catalog Feature

## Overview

The Import Catalog feature allows users to import a catalog configuration into an existing MCPRegistry instance. This feature enables users to add new catalog entries to the `registries` field of an MCPRegistry, configuring data sources, sync policies, and filters without creating a new registry.

## Feature Goals

- Enable importing catalog configurations into existing MCPRegistry instances
- Support importing catalogs with Data Sources, Sync Policy, and Filter configurations
- Automatically restart the registry API deployment after import (temporary workaround)
- Provide a streamlined import flow without General tab configuration

## UI Requirements

### Import Catalog Button

- **Location**: MCP Catalogs page (or appropriate location in catalogs epic)
- **Visibility**: Button is only enabled when exactly one MCPRegistry instance exists in the selected project
- **State**: Disabled when:
  - No MCPRegistry instance exists in the selected project
  - Multiple MCPRegistry instances exist in the selected project
  - No project is selected

### Import Catalog Modal

The import catalog modal is a simplified version of the Create Registry modal with only 3 tabs:

1. **Data Sources Tab**
   - Source type selection (Git, ConfigMap, HTTP)
   - Source-specific configuration:
     - **Git**: URL, branch, path, validation
     - **ConfigMap**: Namespace, ConfigMap name, key selection
     - **HTTP**: URL
   - Real-time source validation
   - **Note**: General tab (name, display name, description) is NOT included

2. **Sync Policy Tab**
   - Sync mode (Manual, Automatic)
   - Sync interval (for automatic sync)
   - Retry policy

3. **Filter Tab**
   - Tag discovery from registry source
   - Tag selection (include/exclude)
   - Name pattern filtering

### Import Button

- **Label**: "Import" (instead of "Create")
- **Action**: Adds a new entry to the `registries` array of the existing MCPRegistry
- **Confirmation**: Shows information message before executing deployment restart

### Deployment Restart Workaround

As a temporary workaround, after successfully importing a catalog:

1. Display an information message explaining that the registry API deployment will be restarted
2. Delete the Deployment named `{MCPRegistryName}-api` in the same namespace as the MCPRegistry
3. The operator will automatically recreate the deployment, picking up the new registry configuration

**Information Message**:
```
The registry API deployment will be restarted to apply the new catalog configuration. 
This may cause a brief service interruption.
```

## Technical Implementation

### Components

- `McpCatalogImportModal.tsx` - Import catalog modal component (based on `McpRegistryCreateModal.tsx`)
  - Removes General tab
  - Changes button label to "Import"
  - Adds deployment restart logic

### API Operations

1. **Fetch MCPRegistry Instance**
   - Query MCPRegistry CRDs from selected project namespace
   - Verify exactly one instance exists
   - Get the registry instance for modification

2. **Update MCPRegistry**
   - Patch the MCPRegistry to add a new entry to `spec.registries` array
   - New entry structure:
     ```json
     {
       "name": "catalog-name",
       "format": "toolhive",
       "configMapRef": {
         "name": "config-map-name",
         "key": "key-name"
       },
       "git": {
         "repository": "https://github.com/example/repo",
         "branch": "main",
         "path": "path/to/file"
       },
       "http": {
         "url": "https://example.com/registry.json"
       },
       "syncPolicy": {
         "interval": "1h",
         "enabled": true
       },
       "filter": {
         "include": ["tag1", "tag2"],
         "exclude": ["tag3"],
         "tags": {
           "include": ["tag1"],
           "exclude": ["tag2"]
         }
       }
     }
     ```

3. **Delete Deployment** (Temporary Workaround)
   - Delete Deployment named `{MCPRegistryName}-api` in the MCPRegistry namespace
   - Use Kubernetes API to delete the deployment
   - Handle errors gracefully

### Validation

- Verify exactly one MCPRegistry exists in selected project before enabling button
- Validate source configuration (same as Create Registry modal)
- Validate catalog name uniqueness within the registries array
- Ensure required fields are filled before allowing import

### Error Handling

- Display error if MCPRegistry update fails
- Display error if deployment deletion fails (non-blocking, log warning)
- Show user-friendly error messages

## User Flow

1. User navigates to MCP Catalogs page
2. User selects a project
3. System checks for MCPRegistry instances in the selected project
4. If exactly one instance exists, "Import Catalog" button is enabled
5. User clicks "Import Catalog" button
6. Import Catalog modal opens with Data Sources, Sync Policy, and Filter tabs
7. User configures the catalog:
   - Selects data source type and configures it
   - Configures sync policy
   - Configures filters (optional)
8. User clicks "Import" button
9. System displays information message about deployment restart
10. User confirms import
11. System updates MCPRegistry with new catalog entry
12. System deletes the `{MCPRegistryName}-api` deployment
13. Success notification is displayed
14. Modal closes and catalog list refreshes

## Status

⏳ **Pending** - Feature specification complete, implementation pending.

---

_See [tasks.md](./tasks.md) for development tasks._

