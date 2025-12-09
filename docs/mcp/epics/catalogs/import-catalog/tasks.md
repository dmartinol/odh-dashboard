# Import Catalog Feature - Development Tasks

## Overview

This document tracks the development tasks for the Import Catalog feature, which allows users to import catalog configurations into existing MCPRegistry instances.

## Tasks

### Phase 1: Component Creation

- [ ] **Create `McpCatalogImportModal` component**
  - [ ] Copy `McpRegistryCreateModal.tsx` as base
  - [ ] Remove General tab and related form fields
  - [ ] Keep only Data Sources, Sync Policy, and Filter tabs
  - [ ] Change button label from "Create" to "Import"
  - [ ] Update modal title to "Import Catalog"
  - [ ] Remove name/description fields from form data

- [ ] **Add Import Catalog button to catalogs page**
  - [ ] Add button to `McpCatalogsPage.tsx`
  - [ ] Implement logic to check for exactly one MCPRegistry in selected project
  - [ ] Disable button when conditions not met
  - [ ] Wire up button to open import modal

### Phase 2: MCPRegistry Update Logic

- [ ] **Create API function to update MCPRegistry registries array**
  - [ ] Create `importCatalogToRegistry` function in `packages/mcp/src/api/k8s/mcp.ts`
  - [ ] Function should:
    - Fetch current MCPRegistry instance
    - Add new entry to `spec.registries` array
    - Handle catalog name uniqueness validation
    - Update MCPRegistry via Kubernetes API

- [ ] **Implement catalog entry structure**
  - [ ] Map form data to registry entry format
  - [ ] Handle different source types (Git, ConfigMap, HTTP)
  - [ ] Include sync policy configuration
  - [ ] Include filter configuration

### Phase 3: Deployment Restart Workaround

- [ ] **Create deployment deletion API function**
  - [ ] Create `deleteDeployment` function in `packages/mcp/src/api/k8s/deployment.ts`
  - [ ] Function should delete Deployment by name and namespace
  - [ ] Handle errors gracefully (deployment may not exist)

- [ ] **Add information message before restart**
  - [ ] Display Alert component with information about deployment restart
  - [ ] Show message before executing import
  - [ ] Allow user to proceed or cancel

- [ ] **Integrate deployment deletion into import flow**
  - [ ] After successful MCPRegistry update, delete deployment
  - [ ] Deployment name format: `{MCPRegistryName}-api`
  - [ ] Use same namespace as MCPRegistry
  - [ ] Log warning if deletion fails (non-blocking)

### Phase 4: Validation and Error Handling

- [ ] **Implement MCPRegistry instance validation**
  - [ ] Create hook or utility to check MCPRegistry count in namespace
  - [ ] Verify exactly one instance exists
  - [ ] Update button state based on validation

- [ ] **Add catalog name uniqueness validation**
  - [ ] Check if catalog name already exists in registries array
  - [ ] Display error if duplicate name found
  - [ ] Prevent import if validation fails

- [ ] **Error handling**
  - [ ] Handle MCPRegistry update failures
  - [ ] Handle deployment deletion failures (non-blocking)
  - [ ] Display user-friendly error messages
  - [ ] Log errors for debugging

### Phase 5: Testing

- [ ] **Unit tests**
  - [ ] Test import modal component rendering
  - [ ] Test form validation
  - [ ] Test MCPRegistry update logic
  - [ ] Test deployment deletion logic

- [ ] **Integration tests**
  - [ ] Test full import flow
  - [ ] Test button enable/disable logic
  - [ ] Test error scenarios

- [ ] **E2E tests** (if applicable)
  - [ ] Test import catalog flow end-to-end
  - [ ] Test deployment restart behavior

## Dependencies

- `McpRegistryCreateModal` component (to be adapted)
- MCPRegistry CRD API
- Kubernetes Deployment API
- Form validation utilities

## Notes

- The deployment restart is a temporary workaround. A proper solution would be to trigger a sync or restart via the operator API.
- The import modal reuses most of the Create Registry modal logic, but simplifies it by removing the General tab.
- Catalog name must be unique within the registries array of the MCPRegistry.

## Status

⏳ **Pending** - Tasks defined, implementation pending.

