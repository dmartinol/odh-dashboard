# Create Registry - Development Tasks

## Status: 🟡 In Progress

## Completed Tasks (Legacy)

- ✅ Multi-step creation wizard (4 tabs: General, Data Sources, Sync Policy, Filter)
- ✅ Form validation and error handling
- ✅ Support for Git and ConfigMap sources
- ✅ Integration with Kubernetes API
- ✅ Advanced filtering with name patterns and tags
- ✅ Sync policy configuration with automatic sync intervals
- ✅ Source validation for Git repositories and ConfigMaps with real-time accessibility testing
- ✅ Automatic tag discovery from registry sources (extracts from actual ToolHive registry files)
- ✅ Interactive tag selection interface with clickable tag buttons for include/exclude filtering
- ✅ ConfigMap dropdown selection with available ConfigMaps from current namespace
- ✅ ConfigMap key dropdown with dynamic key discovery
- ✅ Branch name validation with proper format checking
- ✅ Real-time Git repository validation with URL, branch, and path accessibility testing
- ✅ Tag discovery from actual ToolHive registry format parsing

## New Tasks: Simplified Create Registry Flow

### Phase 1: Remove Create Registry Button

- [ ] **Remove Create Registry button from MCP Registries page**
  - [ ] Remove button from `McpRegistriesPage.tsx` header
  - [ ] Remove `createModalOpen` state and related handlers
  - [ ] Remove `McpRegistryCreateModal` import and usage for create flow
  - [ ] Keep modal for edit flow (if still needed)

### Phase 2: Update No Registry Exists Panel

- [ ] **Update information panel message**
  - [ ] Change message to: "No registry exists for this project"
  - [ ] Add question: "Do you want to create one?"
  - [ ] Add "Create Registry" button to panel
  - [ ] Style button appropriately (primary variant)

### Phase 3: Implement MCPRegistry Discovery

- [ ] **Create utility to find MCPRegistry instances**
  - [ ] Create function to search for MCPRegistry instances across namespaces
  - [ ] Verify exactly one instance exists
  - [ ] Return instance details (name, namespace)
  - [ ] Handle cases: zero instances, multiple instances

- [ ] **Add MCPRegistry discovery hook**
  - [ ] Create `useMcpRegistryInstance` hook
  - [ ] Hook should search across all namespaces (or appropriate scope)
  - [ ] Return instance count and instance details
  - [ ] Handle loading and error states

### Phase 4: Implement Managed Registry Creation

- [ ] **Create API function for managed registry entry**
  - [ ] Create `createManagedRegistryEntry` function in `packages/mcp/src/api/k8s/mcp.ts`
  - [ ] Function should:
    - Accept project name and MCPRegistry instance details
    - Fetch current MCPRegistry
    - Add new entry to `spec.registries` array
    - Entry format:
      ```json
      {
        "name": "project-name",
        "format": "upstream",
        "managed": {}
      }
      ```
    - Update MCPRegistry via Kubernetes API

- [ ] **Add validation**
  - [ ] Validate project name is valid Kubernetes name
  - [ ] Check if registry entry with same name already exists
  - [ ] Prevent duplicate entries

### Phase 5: Integrate Creation Flow

- [ ] **Wire up Create Registry button**
  - [ ] Add click handler to "Create Registry" button in information panel
  - [ ] Call MCPRegistry discovery function
  - [ ] If exactly one instance found, proceed with creation
  - [ ] If zero or multiple instances, show error message

- [ ] **Handle creation success**
  - [ ] Display success notification
  - [ ] Refresh registry data
  - [ ] Update UI to show new registry

- [ ] **Handle creation errors**
  - [ ] Display error if no MCPRegistry instance found
  - [ ] Display error if multiple MCPRegistry instances found
  - [ ] Display error if MCPRegistry update fails
  - [ ] Show user-friendly error messages

### Phase 6: Testing

- [ ] **Unit tests**
  - [ ] Test MCPRegistry discovery logic
  - [ ] Test managed registry entry creation
  - [ ] Test validation logic
  - [ ] Test error handling

- [ ] **Integration tests**
  - [ ] Test full creation flow
  - [ ] Test button visibility logic
  - [ ] Test error scenarios

## Components Modified

- `McpRegistriesPage.tsx` - Remove Create Registry button, update information panel
- `packages/mcp/src/api/k8s/mcp.ts` - Add managed registry creation function
- `packages/mcp/src/hooks/useMcpRegistries.ts` - Add discovery hook (or create new hook)

## Notes

- The Create Registry modal (`McpRegistryCreateModal`) may still be used for editing existing registries
- The new flow creates a simplified managed registry entry, not a full registry configuration
- The ConfigMap `{MCPRegistryName}-registry-server-config` should already exist or be managed by the operator
- The registry entry is created in the namespace of the existing MCPRegistry, which may differ from the selected project

---

_See [specs.md](./specs.md) for specifications._

