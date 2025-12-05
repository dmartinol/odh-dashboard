# Model Context Protocol (MCP) Integration Implementation Plan

## 📊 Current Status Overview

**🎯 Overall Progress: Phases 1-4 Complete, Phase 5 In Progress**

**✅ Completed:**

- ✅ **Full Phase 1**: Package structure, navigation, and API foundation
- ✅ MCP package integrated into ODH Dashboard build system
- ✅ Navigation menu items appearing correctly
- ✅ **Navigation Restructure**: Migrate from standalone MCP section to AI Hub and Gen AI Studio integration
- ✅ Basic page layouts with PatternFly components
- ✅ TypeScript type definitions for all MCP resources
- ✅ API client structure for registries, servers, and instances
- ✅ Feature flag system integration
- ✅ Zero lint and type-check errors
- ✅ **Full Phase 2**: Complete registry management with CRUD operations, real-time updates, and professional UX
- ✅ **Registry Dashboard**: Enhanced cards with status indicators, badges, and action buttons
- ✅ **Registry Creation**: Multi-step wizard with Git/ConfigMap sources and advanced filtering
- ✅ **Registry Details**: Dedicated page with comprehensive information and tabbed interface
- ✅ **Registry Operations**: Manual sync, update/edit, and delete with confirmation dialogs
- ✅ **Kubernetes Watch API Integration**: Refactored from REST polling to real-time K8s Watch API for MCP CRDs
- ✅ **Real-time Updates**: MCP registries and servers now update automatically via WebSocket connections
- ✅ **K8s Models & Operations**: Complete CRUD operations using native Kubernetes SDK patterns
- ✅ **Full Phase 3**: Complete server discovery and deployment functionality
- ✅ **Server Browser**: Professional server browsing with real-time filtering by transport, tier, and search
- ✅ **Server Details**: Comprehensive modal with tabbed interface (Overview, Tools, Prompts, Resources)
- ✅ **Server Deployment**: Advanced deployment modal with MCPServer CRD generation and resource configuration
- ✅ **ToolHive Integration**: Full parsing of ToolHive registry format for server metadata extraction
- ✅ **Full Phase 4**: Complete servers management with table-based UI and advanced filtering
- ✅ **Servers Table**: Sortable columns for name, status, registry, endpoint, and transport
- ✅ **Server Filtering**: Search by name, filter by registry/transport/status with namespace selector
- ✅ **Registry Linking**: Label-based server-to-registry matching with support for unregistered servers
- ✅ **Registry Details Updates**: Removed Deployed Servers tab, renamed Available Servers to Servers, added link to Servers page

**⏳ Next Steps:**

- Phase 5: Advanced features and production polish
- Performance optimization and caching strategies
- Accessibility improvements and keyboard navigation
- Comprehensive testing suite and documentation

---

## Phase 1: Foundation (Week 1-2) ✅ **COMPLETED**

**Goal: Basic package structure and navigation**

### Tasks:

1. **Package Setup** ✅ **COMPLETED**

   - ✅ Create `packages/mcp/` directory structure
   - ✅ Configure package.json with proper exports
   - ✅ Set up build and development scripts
   - ✅ Add to turbo.json workspace configuration

2. **Navigation Integration** ✅ **COMPLETED**

   - ✅ Add MCP navigation extensions
   - ✅ Create MCP navigation icon (placeholder)
   - ✅ Add SupportedArea flags for MCP features
   - ✅ Implement basic routing structure

3. **Base Components** ✅ **COMPLETED**

   - ✅ Create placeholder page components (McpRegistriesPage, McpServersPage)
   - ✅ Set up basic layout with ODH styling
   - ✅ Implement responsive navigation patterns
   - ✅ Add error boundaries and loading states

4. **API Foundation** ✅ **COMPLETED**
   - ✅ Define TypeScript interfaces for MCP resources
   - ✅ Create base API client structure
   - ✅ Implement authentication/authorization patterns
   - ✅ Set up mock data for development

**Deliverables:** ✅ **ALL COMPLETED** _(Completed: January 2025)_

- ✅ Working navigation to MCP sections
- ✅ Basic page layouts with ODH design system
- ✅ TypeScript types and API structure
- ✅ Development environment setup

**🎉 Phase 1 Summary:**

- MCP package successfully integrated into ODH Dashboard
- Navigation restructured to integrate into AI Hub and Gen AI Studio
- Zero build, lint, or type-check errors
- Foundation ready for Phase 2 development

---

## Phase 2: Registry Management (Week 3-4) ✅ **COMPLETED**

**Goal: Complete registry CRUD operations**

### Status Update:

- ✅ **Basic UI Structure**: Registry page layout with PatternFly components
- ✅ **API Foundation**: Registry API client structure and TypeScript types
- ✅ **Registry Dashboard**: Enhanced registry cards with status indicators, badges, and action buttons
- ✅ **Real-time Architecture**: Kubernetes Watch API integration for automatic updates
- ✅ **Event-driven Updates**: MCP resources update instantly via WebSocket connections
- ✅ **Architecture Decision**: Registry Details changed from modal to dedicated page for better UX and content capacity
- ✅ **Registry Details Page**: Complete implementation with routing and breadcrumbs
- ✅ **Registry Creation**: Multi-step creation wizard with comprehensive validation and filtering
- ✅ **Registry Operations**: Complete CRUD operations with sync, update, and delete functionality

### Tasks:

1. **Registry Dashboard** ✅ **COMPLETED**

   - ✅ Registry list component with cards
   - ✅ Status indicators and health monitoring
   - ✅ Search and filtering capabilities
   - ✅ Responsive grid layout implementation

2. **Registry Details Page** ✅ **COMPLETED: Modal → Dedicated Page**

   - ✅ **Dedicated page route**: `/ai-hub/mcp/registries/{registry-name}`
   - ✅ **Breadcrumb navigation**: AI Hub > MCP Registries > {registry-name}
   - ✅ **Tabbed interface**: Overview, Available Servers, Configuration
   - ✅ **Page layout and routing**: Full page implementation with navigation
   - ✅ **Registry information display**: Comprehensive registry details view
   - ⏳ **Server discovery**: Filterable tables with search and pagination (Phase 3)
   - ⏳ **Registry configuration**: YAML/JSON viewing and management (Future)
   - ⏳ **Sync operations**: Manual sync triggers and status monitoring (Future)

3. **Registry Creation** ✅ **COMPLETED**

   - ✅ Multi-step creation wizard (4 tabs: General, Data Sources, Sync Policy, Filter)
   - ✅ Form validation and error handling
   - ✅ Support for Git and ConfigMap sources
   - ✅ Integration with Kubernetes API
   - ✅ Advanced filtering with name patterns and tags
   - ✅ Sync policy configuration with automatic sync intervals

4. **Registry Operations** ✅ **COMPLETED**

   - ✅ Manual sync functionality (per registry)
   - ✅ Registry update (reuse creation modal in edit mode)
   - ✅ Registry deletion with confirmation dialog
   - ✅ Event handling and notifications
   - ✅ Real-time status updates via Kubernetes Watch API

5. **Registry Creation Enhancement** ✅ **COMPLETED**
   - ✅ Source validation for Git repositories and ConfigMaps with real-time accessibility testing
   - ✅ Automatic tag discovery from registry sources (extracts from actual ToolHive registry files)
   - ✅ Interactive tag selection interface with clickable tag buttons for include/exclude filtering
   - ✅ Enhanced user experience following reference implementation patterns from `../registry_ui`
   - ✅ Comprehensive error handling and validation feedback for invalid sources
   - ✅ Registry details improvements:
     - ✅ Fixed display logic for different source types (Git, ConfigMap, HTTP)
     - ✅ Added ConfigMap console link integration to view ConfigMaps in OpenShift console
     - ✅ Fixed Edit button functionality to open registry creation modal in edit mode
   - ✅ Registry breadcrumb navigation with proper project context preservation
   - ✅ ConfigMap dropdown selection with available ConfigMaps from current namespace
   - ✅ ConfigMap key dropdown with dynamic key discovery from selected ConfigMap
   - ✅ Branch name validation with proper format checking
   - ✅ Real-time Git repository validation with URL, branch, and path accessibility testing
   - ✅ Tag discovery from actual ToolHive registry format parsing (servers object structure)
   - ✅ Simplified tag selection UX (removed redundant text inputs, kept only clickable interface)

**Deliverables:** ✅ **ALL COMPLETED** _(Completed: January 2025)_

- ✅ Functional registry management UI with professional UX
- ✅ Complete CRUD operations for registries with real-time updates
- ✅ Enhanced registry creation with source validation and tag discovery
- ✅ Interactive tag filtering with ToolHive registry format parsing
- ✅ ConfigMap integration with dropdown selection and console links
- ✅ Git repository validation with real-time accessibility testing
- ✅ Edit functionality with pre-populated modal forms
- ✅ Integration with ToolHive operator via Kubernetes Watch API
- ✅ Responsive design implementation following ODH patterns

**🎉 Phase 2 Summary:**

- Complete registry management system with professional UX and enterprise-grade features
- All CRUD operations (Create, Read, Update, Delete) fully functional with real-time updates
- Enhanced registry creation with comprehensive source validation and tag discovery
- Interactive tag filtering system with ToolHive registry format parsing
- ConfigMap integration with dropdown selection and OpenShift console links
- Git repository validation with real-time accessibility testing and branch validation
- Real-time updates via Kubernetes Watch API integration (no polling required)
- Comprehensive error handling, user notifications, and validation feedback
- Multi-step creation wizard with advanced filtering capabilities and simplified UX
- Dedicated registry details page with tabbed interface and edit functionality
- Professional confirmation dialogs for destructive operations
- Source-aware display logic for Git, ConfigMap, and HTTP registry types
- Foundation ready for Phase 3 server discovery development

---

## Phase 3: Server Discovery (Week 5-6) ✅ **COMPLETED**

**Goal: Server browsing and deployment**

### Status Update:

- ✅ **Basic UI Structure**: Server page layout with search and filter placeholders
- ✅ **API Foundation**: Server API client structure and TypeScript types
- ✅ **Server Browser**: Complete server browsing components with filtering logic
- ✅ **Deployment Workflows**: Full deployment workflows and configuration management

### Tasks:

1. **Server Browser** ✅ **COMPLETED**

   - ✅ Card-based server listing with professional layout
   - ✅ Advanced filtering (transport, tier, tags)
   - ✅ Search functionality with real-time filtering
   - ✅ Server categorization and grouping with badges

2. **Server Details** ✅ **COMPLETED**

   - ✅ Comprehensive server information modal
   - ✅ Tabbed interface (Overview, Tools, Prompts, Resources)
   - ✅ Logo integration from server metadata
   - ✅ Technical specifications display with complete metadata

3. **Server Deployment** ✅ **COMPLETED**

   - ✅ Advanced deployment functionality (replaced quick deploy with full configuration)
   - ✅ Complete deployment configuration dialog
   - ✅ Namespace/project integration with ProjectsContext
   - ✅ Resource validation and form validation

4. **Advanced Deployment** ✅ **COMPLETED**

   - ✅ Full deployment configuration dialog with expandable advanced settings
   - ✅ Environment variables management with add/remove functionality
   - ✅ Resource limits and requests configuration
   - ✅ MCPServer CRD generation with proper metadata and labels

5. **Reference Implementation Fixes** ✅ **COMPLETED**
   - ✅ **Registry card**: Show same details as the reference implementation in ../registry_ui
     - ✅ Format: "git • 24 servers • auto 1h • 10/9/2025 ago"
     - ✅ Time formatting with formatTimeAgo function
     - ✅ Sync interval formatting with formatSyncInterval function
   - ✅ **Registry page**:
     - ✅ Fixed Available servers tab showing (0) until pressed - now loads immediately
     - ✅ Fixed server count in General tab showing (0) - now displays real-time counts
     - ✅ Added Git URL icon to open the URL at the path specified by "File Path"
     - ✅ Added Registry API Endpoint reference from status.apiStatus.endpoint field
   - ✅ **Server card**:
     - ✅ Added tier badge (e.g. "official", "community", "experimental")
     - ✅ Move the transport badge close to the tier badge, not on top of the card
     - ✅ Fixed server card click behavior - now uses eye icon button for consistency with registry cards
   - ✅ **Server details dialog**:
     - ✅ Updated tab schema to match reference implementation: "Overview", "Tools", "Config", "Manual Installation"
     - ✅ Combined prompts and resources into "Config" tab
     - ✅ Added "Manual Installation" tab with Docker commands and source repository links
   - ✅ **Deploy dialog**:
     - ✅ Updated to match reference implementation with 3-tab structure: "Server", "Environment Variables", "Resources"
     - ✅ Replaced expandable sections with proper tabbed interface
     - ✅ Enhanced server configuration with disabled server name field
   - ✅ **Server icon fetching**: Implementation of GitValidationService.ts:208-316 pattern
   - ✅ **Tools list display fix**: Replaced large Card components with compact Label components
   - ✅ **Environment variables in Config tab**: Added env_vars display with Required/Secret labels
   - ✅ **MCP v0 API Support**: Added support for MCP v0 API format with individual server endpoint calls
   - ✅ **Tools Tab Enhancement**: Improved tools tab display with detailed cards showing descriptions and input schemas
   - ✅ **Tools Tab Fixes**: Fixed tool name display and removed unnecessary fallback message for tools without descriptions
   - ✅ **MCP v0 API Tools Parsing**: Fixed tools parsing to handle string arrays from MCP v0 API instead of object arrays

**Deliverables:** ✅ **ALL COMPLETED** _(Completed: January 2025)_

- ✅ Server discovery and browsing UI with real-time filtering
- ✅ Server deployment workflows with MCPServer CRD generation
- ✅ Configuration management system with advanced settings
- ✅ Server details modal with comprehensive information display

**🎉 Phase 3 Summary:**

- Complete server discovery system with ToolHive registry format parsing
- Professional server browser with advanced filtering (transport, tier, tags, search)
- Comprehensive server details modal with tabbed interface showing tools, prompts, and resources
- Advanced deployment functionality with MCPServer CRD generation and resource configuration
- Real-time server discovery integrated with registry details page "Available Servers" tab
- Form validation, error handling, and environment variable management for deployments
- Professional UI components following ODH design patterns with zero linting errors
- Full TypeScript compliance with proper type guards and error boundaries
- Foundation ready for Phase 4 instance management development

---

## Phase 4: Servers Management (Week 7-8) ✅ **COMPLETED**

**Goal: Monitor and manage deployed MCPServer instances**

### Status Update:

- ✅ **Servers Page Implementation**: Complete servers table with namespace selector and filtering
- ✅ **Server-Registry Matching**: Implemented label-based matching logic for linking servers to registries
- ✅ **Sortable Table**: All columns sortable (name, status, registry, transport)
- ✅ **Advanced Filtering**: Search by name, filter by registry/transport/status
- ✅ **Registry Integration**: Removed Deployed Servers tab, renamed Available Servers to Servers
- ✅ **Navigation Links**: Added link from Registry Details to AI Asset Endpoints page with pre-filters
- ✅ **Interactive Server Management**: Clickable server names, row action menus, and modals

### Tasks:

1. **Servers Table** ✅ **COMPLETED**

   - ✅ Sortable columns: Name (default), Status, Linked Registry, Endpoint, Transport
   - ✅ Status indicators from Deployment phase (Running/Pending/Failed/Unknown)
   - ✅ Linked registry display with clickable links to registry details
   - ✅ Endpoint display with copy-to-clipboard functionality (checks `status.url` then `status.endpoint`)
   - ✅ Transport protocol badges (stdio/sse/streamable-http)
   - ✅ Support for unregistered servers (missing or incorrect labels)
   - ✅ Clickable server names that open details modal
   - ✅ Row action menus (hamburger) with View details, Register/Unregister, and Delete options

2. **Servers Toolbar** ✅ **COMPLETED**

   - ✅ Namespace selector with project context integration
   - ✅ Search by name with partial matching
   - ✅ Filter by linked registry (including "Unregistered" option)
   - ✅ Filter by transport protocol (stdio/sse/streamable-http)
   - ✅ Filter by deployment status (Running/Pending/Failed/Unknown)
   - ✅ URL query parameter support for pre-filtering

3. **Server-Registry Matching** ✅ **COMPLETED**

   - ✅ Label-based matching using:
     - `toolhive.stacklok.io/registry-name`
     - `toolhive.stacklok.io/registry-namespace`
     - `toolhive.stacklok.io/server-registry-name`
   - ✅ Handle unregistered servers gracefully
   - ✅ Display "Unregistered" label for servers without valid registry links

4. **Registry Details Integration** ✅ **COMPLETED**

   - ✅ Removed "Deployed Servers" tab (functionality moved to Servers page)
   - ✅ Renamed "Available Servers" tab to "Servers"
   - ✅ Added prominent link/button to navigate to AI Asset Endpoints page with pre-filter
   - ✅ Alert component explaining where to find deployed instances
   - ✅ Clean separation between registry metadata and deployed instances

5. **Server Actions & Modals** ✅ **COMPLETED**
   - ✅ **McpDeployedServerDetailsModal**: Comprehensive modal with tabbed interface
     - Overview tab: Server metadata, deployment info, endpoint with copy functionality
     - Spec tab: Complete server specification in key-value format
     - Status tab: Runtime status and conditions
     - Labels & Annotations tab: All metadata labels and annotations
     - Links to registry details page if server is registered
   - ✅ **McpServerRegisterModal**: Register unregistered servers to registries
     - Registry selector dropdown
     - Server name in registry field with validation
     - Preview of labels that will be added (registry-name, registry-namespace, server-registry-name)
     - K8s API integration using patchMcpServer function
   - ✅ **McpServerDeleteModal**: Confirmation dialog for server deletion
     - Warning about irreversible action
     - Server information display for confirmation
     - K8s API integration using deleteMcpServer function
   - ✅ **K8s API Functions**: Added patchMcpServer for label updates

**Deliverables:** ✅ **ALL COMPLETED**

- ✅ Comprehensive servers table with sorting and filtering
- ✅ Namespace-aware server management
- ✅ Server-registry relationship visualization
- ✅ Integration with Registry Details page
- ✅ URL-based pre-filtering for deep linking
- ✅ Interactive server management with modals and actions
- ✅ Server registration/unregistration functionality
- ✅ Server deletion with confirmation

**🎉 Phase 4 Summary:**

- Complete servers management system with table-based UI
- Namespace selector for multi-project server viewing
- Advanced filtering by name, registry, transport (stdio/sse/streamable-http), and status
- Sortable columns with default sort by name
- Server-registry matching using ToolHive label conventions
- Endpoint display with copy functionality (supports both `status.url` and `status.endpoint` fields)
- Clean integration with existing registry management features
- Removed Deployed Servers tab and consolidated server viewing in AI Asset Endpoints page
- **Interactive server management**: Clickable server names with details modal
- **Row action menus**: View details, Register/Unregister (conditional), Delete
- **Server registration**: Connect unregistered servers to registries by adding ToolHive labels
- **Server deletion**: Remove servers with confirmation dialog
- **Comprehensive modals**: Details, register, and delete with professional UX
- **K8s API integration**: Full CRUD operations for server management
- Foundation ready for Phase 5 production features

### Phase 4 UI Refinements ✅ **COMPLETED**

- ✅ **Registry Card Visual Improvements**:
  - Enhanced metadata display with proper icons (CodeBranchIcon for git, CubeIcon for configmap)
  - Improved layout using Flex components for better spacing
  - Format: `<icon> <type> • <# servers> • <sync policy> • <last sync>`
  - Removed cluttered text aggregation in favor of clean, icon-based presentation
- ✅ **Deploy Dialog Form Layout**:
  - Grouped related fields on same row for stdio transport: Proxy Mode + Port
  - Grouped Port + Target Port for non-stdio transports (SSE, streamable-http)
  - Updated default proxy mode from SSE to Streamable HTTP (SSE is legacy)
  - Moved placeholder examples to HelperText to avoid confusion with actual values
  - Added password visibility toggle for secret environment variables
  - Fixed validation to only check required environment variables
- ✅ **Transport Filtering**:
  - Fixed transport filter to match only `server.transport` field
  - Resolved issue where "sse" filter was incorrectly matching servers with "sse" in tags/description
  - Applied fix to both registry browser and deployed servers page
- ✅ **Modal Rendering Issues**:
  - Fixed double modal rendering in McpRegistryDetailsPage
  - Removed duplicate McpServerDeployModal that was conflicting with McpServerBrowser's modal
  - Resolved issue requiring clicking "Cancel" twice to close deploy dialog

### Phase 4 Advanced Deployment Configuration ✅ **COMPLETED**

**Problem Statement**: MCP servers fail to deploy when pulling images from authenticated container registries (e.g., quay.io, private registries). Users need advanced pod configuration options without understanding Kubernetes CRD internals.

**Solution**: New **Advanced** tab in deployment dialog with user-friendly abstractions for `podTemplateSpec` configuration.

#### Implementation Details

**New Components & Hooks**:

- [`useSecrets.ts`](packages/mcp/src/hooks/useSecrets.ts) - K8s secrets discovery hook
- [`useServiceAccounts.ts`](packages/mcp/src/hooks/useServiceAccounts.ts) - Service accounts discovery hook
- Enhanced [`McpServerDeployModal.tsx`](packages/mcp/src/components/McpServerDeployModal.tsx) with Advanced tab
- Updated [`server.ts`](packages/mcp/src/types/server.ts) types with `podTemplateSpec` support

**Advanced Tab Features**:

1. **Image Pull Secrets** 🔐
   - Multi-select dropdown populated from namespace secrets
   - Add/remove secrets with visual labels
   - Solves authenticated registry access (quay.io, DockerHub, etc.)
   - Maps to `podTemplateSpec.spec.imagePullSecrets`

2. **Service Account** 👤
   - Optional service account selector
   - Auto-populated from namespace service accounts
   - Enables custom RBAC and authentication
   - Maps to `podTemplateSpec.spec.serviceAccountName`

3. **Node Selector** 🎯
   - Dynamic key-value pair editor
   - Schedule pods on specific nodes (e.g., GPU nodes)
   - Add/remove label selectors
   - Maps to `podTemplateSpec.spec.nodeSelector`

4. **Security Context** 🔒
   - Run as non-root user checkbox
   - User ID and Group ID configuration
   - Enhanced security posture
   - Maps to `podTemplateSpec.spec.securityContext`

**Technical Implementation**:

- **Container Name**: Uses `mcp` as per MCPServer CRD specification
- **Pod Template Merging**: Provides minimal container spec that operator merges with generated configuration
- **Registry Context**: Automatically adds ToolHive registry tracking labels:
  - `toolhive.stacklok.io/registry-name`
  - `toolhive.stacklok.io/registry-namespace`
  - `toolhive.stacklok.io/server-registry-name`
- **K8s Watch API**: Real-time secret and service account discovery via `useK8sWatchResource`
- **Conditional Rendering**: Only includes `podTemplateSpec` when advanced options are configured

**User Experience**:

- Clean, abstracted interface - no CRD knowledge required
- Helper text for all configuration options
- Real-time resource discovery from selected namespace
- Optional fields - only applied when actually configured
- Preserves settings when editing existing servers

**Example podTemplateSpec Generated**:

```yaml
spec:
  podTemplateSpec:
    spec:
      containers:
        - name: mcp
      imagePullSecrets:
        - name: quay-pull-secret
      serviceAccountName: mcp-server-sa
      nodeSelector:
        kubernetes.io/hostname: gpu-node-1
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
```

**Files Modified**:

- [McpServerDeployModal.tsx](packages/mcp/src/components/McpServerDeployModal.tsx#L773-L1011) - Advanced tab UI (238 lines)
- [McpServerBrowser.tsx](packages/mcp/src/components/McpServerBrowser.tsx#L419-L426) - Registry context passing
- [McpRegistryDetailsPage.tsx](packages/mcp/src/pages/McpRegistryDetailsPage.tsx#L482) - Registry prop added
- [server.ts](packages/mcp/src/types/server.ts#L47-L64) - `podTemplateSpec` types
- [useSecrets.ts](packages/mcp/src/hooks/useSecrets.ts) - New hook (48 lines)
- [useServiceAccounts.ts](packages/mcp/src/hooks/useServiceAccounts.ts) - New hook (53 lines)

---

## Phase 5: Navigation Restructure & Advanced Features (Week 9-10)

**Goal: Navigation integration and production-ready features**

### Tasks:

1. **Navigation Restructure** ✅ **COMPLETED**

   - ✅ Migrate MCP Registries from standalone section to AI Hub section
   - ✅ Create new "Gen AI Studio" section dependent on MCP feature enablement
   - ✅ Migrate MCP Servers (AI Asset Endpoints) to Gen AI Studio section
   - ✅ Update all route paths from `/mcp/*` to `/ai-hub/mcp/*` and `/gen-ai-studio/assets`
   - ✅ Update breadcrumb navigation to reflect new structure
   - ✅ Update extension configuration to use `section: 'ai-hub'` and `section: 'gen-ai-studio'`
   - ✅ Add MCP Catalogs placeholder under AI Hub (future feature)
   - ✅ Test navigation and routing after migration

2. **Integration Features** ⏳ **PENDING**

   - ⏳ Project/namespace context switching
   - ⏳ RBAC permission integration
   - ⏳ Resource quota validation
   - ⏳ Multi-cluster support preparation

3. **User Experience** ⏳ **PENDING**

   - ⏳ Keyboard navigation shortcuts
   - ⏳ Accessibility improvements (WCAG 2.1 AA)
   - ⏳ Loading states and skeleton screens
   - ⏳ Error recovery mechanisms

4. **Performance Optimization** ⏳ **PENDING**

   - ⏳ Virtual scrolling for large lists
   - ⏳ Lazy loading of server details
   - ⏳ Caching strategies implementation
   - ⏳ Bundle size optimization

5. **Testing & Documentation** ⏳ **PENDING**
   - ⏳ Unit test coverage (>90%)
   - ⏳ Integration testing setup
   - ⏳ E2E testing scenarios
   - ⏳ User documentation

**Deliverables:**

- ✅ Navigation restructure completed (MCP features integrated into AI Hub and Gen AI Studio)
- ⏳ Production-ready MCP integration
- ⏳ Comprehensive testing suite
- ⏳ Performance optimizations
- ⏳ Complete documentation

---

_This implementation plan will be updated as tasks are completed._

