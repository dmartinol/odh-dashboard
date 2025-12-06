# Model Context Protocol (MCP) Integration Specifications

## Overview

This document outlines the software specifications for integrating Model Context Protocol (MCP) functionality into the OpenShift AI (ODH) Dashboard. The goal is to replicate the capabilities of the standalone ToolHive Registry Management Application within the ODH ecosystem, providing a unified experience for AI/ML practitioners.

## Navigation Design Decision

### Menu Placement: Integration into Existing Sections

**Decision: Integrate MCP features into AI Hub and Gen AI Studio sections**

**Rationale:**

- MCP registries align with AI Hub's model registry and catalog concepts
- MCP servers (AI asset endpoints) fit naturally into Gen AI Studio's asset management
- Provides logical grouping with related AI/ML functionality
- Reduces navigation complexity by consolidating related features
- Follows ODH pattern of functional grouping within existing sections

**Navigation Structure:**

```
📍 Updated ODH Menu Structure:
├── 🏠 Home (1_home)
├── 📁 Projects (2_projects)
├── 🤖 AI Hub (3_ai_hub)
│   ├── Registry (model registry)
│   ├── Catalog (model catalog)
│   ├── 📋 MCP catalogs (NEW)
│   └── 📋 MCP registries (/ai-hub/mcp/registries) ← MOVED FROM STANDALONE
│       └── 🔍 Registry Details (/ai-hub/mcp/registries/{name})
├── 🎨 Gen AI Studio (NEW SECTION)
│   └── 🔧 AI asset endpoints (/gen-ai-studio/assets) ← MOVED FROM MCP/SERVERS
├── 🔬 Develop & Train (5_develop_and_train)
├── 📊 Observe & Monitor (6_observe_and_monitor)
├── 📚 Learning Resources (7_other)
├── 🔧 Applications (8_other)
└── ⚙️ Settings (8_settings)
```

## UI Design Vision

### Responsive Design Strategy

The MCP integration will follow ODH's design system while incorporating modern UX patterns from the registry_ui analysis:

#### Core Design Principles

1. **Information Hierarchy**: Critical → Secondary → Tertiary data prioritization
2. **Progressive Disclosure**: Show essential info first, details on demand
3. **Consistent Actions**: Standardized button patterns and placements
4. **Mobile-First**: Responsive layouts for all screen sizes

#### Visual Design Language

- **PatternFly Components**: Leverage ODH's existing component library
- **Card-Based Layout**: Registry and server cards with optimized density
- **Status Indicators**: Clear visual health/connectivity status
- **Action Consolidation**: Primary actions prominent, secondary in menus

### Page Layout Designs

#### 1. Registries Page (`/ai-hub/mcp/registries`)

```
┌─────────────────────────────────────────────────────────┐
│ 📋 MCP Registries                           [+ Create]  │
├─────────────────────────────────────────────────────────┤
│ [🔍 Search] [🏷️ Filter: All] [⚙️ Actions] [🔄 Refresh] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [●] Production Registry            [🔄][⚙️][👁️]  │ │
│ │ 🏷️ git • 24 servers • 30m ago • ✅ healthy       │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ github.com/company/mcp-registry • Created Oct 8   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [●] Development Registry           [🔄][⚙️][👁️]  │ │
│ │ 🏷️ http • 8 servers • 2h ago • ⚠️ sync needed    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 2. Registry Details Page (`/ai-hub/mcp/registries/{name}`)

```
┌─────────────────────────────────────────────────────────┐
│ 🏠 AI Hub > MCP Registries > Production Registry       │
├─────────────────────────────────────────────────────────┤
│ Production Registry                          [Edit][⚙️] │
│ 🏷️ git • ✅ healthy • Last sync: 30m ago              │
│ github.com/company/mcp-registry                         │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Servers (24)] [Configuration]              │
├─────────────────────────────────────────────────────────┤
│ ℹ️ View all deployed servers                           │
│    [Go to Servers page →] to see deployed instances    │
│                                                         │
│ 📋 Available Servers from Registry                      │
│ [Server cards with deploy functionality...]            │
└─────────────────────────────────────────────────────────┘
```

#### 3. AI Asset Endpoints Page (`/gen-ai-studio/assets`)

```
┌─────────────────────────────────────────────────────────┐
│ 🔧 AI Asset Endpoints                                   │
├─────────────────────────────────────────────────────────┤
│ Namespace: [toolhive-system ▼]                          │
├─────────────────────────────────────────────────────────┤
│ [🔍 Search by name...] [🔽 Registry] [🔽 Transport] [🔽 Status] │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┬─────────┬──────────────┬──────────┬────────┐ │
│ │ Name ↑   │ Status  │ Linked Reg.  │ Endpoint │ Trans. │ │
│ ├──────────┼─────────┼──────────────┼──────────┼────────┤ │
│ │ mcp-fetch│ ✅ Run  │ prod-reg →   │ http://..│ 🏷️ http│ │
│ │ mcp-git  │ ⏳ Pend │ prod-reg →   │ —        │ 🏷️ stdio│ │
│ │ mcp-slack│ ❌ Fail │ Unregistered │ —        │ 🏷️ sse │ │
│ └──────────┴─────────┴──────────────┴──────────┴────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Feature Requirements

MCP features are organized into **epics**, each containing multiple **features**. For detailed specifications and tasks, see the individual epic and feature documentation.

### Epics Overview

1. **[Registries Epic](./epics/registries/epic.md)** - Managing MCP registries (CRUD operations, synchronization)
2. **[Catalogs Epic](./epics/catalogs/epic.md)** - Browsing catalogs from registry API endpoints
3. **[Servers Epic](./epics/servers/epic.md)** - Server discovery and deployment
4. **[Instances Epic](./epics/instances/epic.md)** - Managing deployed server instances
5. **[Infrastructure Epic](./epics/infrastructure/epic.md)** - Cross-cutting concerns (foundation, navigation, integration, UX, performance, testing)

### Registry Management Epic

**Epic**: [Registries](./epics/registries/epic.md)

**Features**:
- [List Registries](./epics/registries/list-registries/specs.md) - Dashboard view with registry cards
- [View Registry Details](./epics/registries/view-registry-details/specs.md) - Comprehensive registry information
- [Create Registry](./epics/registries/create-registry/specs.md) - Multi-step creation wizard
- [Update Registry](./epics/registries/update-registry/specs.md) - Edit existing registries
- [Delete Registry](./epics/registries/delete-registry/specs.md) - Remove registries with confirmation
- [Sync Registry](./epics/registries/sync-registry/specs.md) - Manual and automatic synchronization

### Catalog Management Epic

**Epic**: [Catalogs](./epics/catalogs/epic.md)

**Features**:
- [List Catalogs](./epics/catalogs/list-catalogs/specs.md) - Browse catalogs from registry API endpoints
- [View Catalog Details](./epics/catalogs/view-catalog-details/specs.md) - Detailed catalog information (pending)

### Server Discovery & Deployment Epic

**Epic**: [Servers](./epics/servers/epic.md)

**Features**:
- [Browse Servers](./epics/servers/browse-servers/specs.md) - Filterable card interface for server discovery
- [View Server Details](./epics/servers/view-server-details/specs.md) - Comprehensive server information modal
- [Deploy Server](./epics/servers/deploy-server/specs.md) - Advanced deployment with custom configurations

### Instance Management Epic

**Epic**: [Instances](./epics/instances/epic.md)

**Features**:
- [List Instances](./epics/instances/list-instances/specs.md) - Table-based interface for deployed servers
- [View Instance Details](./epics/instances/view-instance-details/specs.md) - Detailed instance information
- [Register Instance](./epics/instances/register-instance/specs.md) - Link servers to registries
- [Unregister Instance](./epics/instances/unregister-instance/specs.md) - Remove registry links
- [Delete Instance](./epics/instances/delete-instance/specs.md) - Remove deployed server instances

### Infrastructure Epic

**Epic**: [Infrastructure](./epics/infrastructure/epic.md)

**Features**:
- [Package Foundation](./epics/infrastructure/package-foundation/specs.md) - Package structure and navigation
- [Navigation Integration](./epics/infrastructure/navigation-integration/specs.md) - Menu restructuring
- [RBAC Integration](./epics/infrastructure/rbac-integration/specs.md) - Permission integration (pending)
- [Resource Quota Validation](./epics/infrastructure/resource-quota-validation/specs.md) - Quota checks (pending)
- [Multi-cluster Support](./epics/infrastructure/multi-cluster-support/specs.md) - Multi-cluster architecture (pending)
- [Keyboard Navigation](./epics/infrastructure/keyboard-navigation/specs.md) - Keyboard shortcuts (pending)
- [Accessibility Improvements](./epics/infrastructure/accessibility-improvements/specs.md) - WCAG compliance (pending)
- [Loading States](./epics/infrastructure/loading-states/specs.md) - Skeleton screens (pending)
- [Error Recovery](./epics/infrastructure/error-recovery/specs.md) - Retry mechanisms (pending)
- [Virtual Scrolling](./epics/infrastructure/virtual-scrolling/specs.md) - Performance optimization (pending)
- [Lazy Loading](./epics/infrastructure/lazy-loading/specs.md) - Code splitting (pending)
- [Caching Strategies](./epics/infrastructure/caching-strategies/specs.md) - Caching implementation (pending)
- [Bundle Optimization](./epics/infrastructure/bundle-optimization/specs.md) - Bundle size reduction (pending)
- [Unit Testing](./epics/infrastructure/unit-testing/specs.md) - Test coverage (pending)
- [Integration Testing](./epics/infrastructure/integration-testing/specs.md) - Integration tests (pending)
- [E2E Testing](./epics/infrastructure/e2e-testing/specs.md) - End-to-end tests (pending)
- [User Documentation](./epics/infrastructure/user-documentation/specs.md) - User guides (pending)

### Integration Features

- **Project Context**: Filter by current ODH project/namespace
- **RBAC Integration**: Respect ODH user permissions and roles
- **Resource Quotas**: Validate deployments against namespace limits
- **Event Notifications**: Success/failure notifications using ODH patterns

## Technical Architecture

### Package Structure

```
packages/mcp/
├── package.json                    # Package definition
├── extensions.ts                   # Navigation and route extensions
├── src/
│   ├── components/                # React components
│   │   ├── registries/           # Registry management components
│   │   ├── servers/              # Server discovery components
│   │   ├── instances/            # Instance management components
│   │   └── shared/               # Shared MCP components
│   ├── pages/                    # Full page components
│   │   ├── McpRegistriesPage.tsx
│   │   ├── McpRegistryDetailsPage.tsx
│   │   ├── McpServersPage.tsx
│   │   └── McpCatalogsPage.tsx
│   ├── hooks/                    # MCP-specific React hooks
│   │   ├── useRegistries.ts
│   │   ├── useServers.ts
│   │   └── useInstances.ts
│   ├── api/                      # API integration layer
│   │   ├── registries.ts
│   │   ├── servers.ts
│   │   └── instances.ts
│   ├── types/                    # TypeScript type definitions
│   │   ├── registry.ts
│   │   ├── server.ts
│   │   └── instance.ts
│   └── utils/                    # Utility functions
└── README.md
```

### Real-time Data Management Architecture

**🔄 Event-Driven Updates with Kubernetes Watch API**

The MCP integration follows ODH Dashboard's established pattern for real-time data management:

#### **Kubernetes Watch API Integration**

- **Direct K8s Connection**: Uses `useK8sWatchResource` for real-time updates
- **WebSocket Communication**: Efficient event-driven updates via Kubernetes Watch API
- **No Polling Required**: Eliminates REST API polling overhead

#### **Architecture Components**

```typescript
// K8s Models for MCP CRDs
export const McpRegistryModel: K8sModelCommon = {
  apiGroup: 'toolhive.stacklok.dev',
  apiVersion: 'v1alpha1',
  kind: 'McpRegistry',
  plural: 'mcpregistries',
};

// Real-time Hooks
const [registries, loaded, error] = useMcpRegistries(namespace);
const [servers, loaded, error] = useMcpServers(namespace);
```

#### **Benefits**

- ⚡ **Instant Updates**: Changes appear immediately in UI
- 🏗️ **Consistent Patterns**: Same approach as Projects, ImageStreams, etc.
- 📱 **Better UX**: No manual refresh needed
- 🔧 **Performance**: Eliminates REST API overhead for basic operations

### Extension Configuration

```typescript
// packages/mcp/extensions.ts
const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension | NavSectionExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MCP,
      reliantAreas: [SupportedArea.MCP_REGISTRIES, SupportedArea.MCP_SERVERS],
      featureFlags: ['disableMcp'],
    },
  },
  // MCP Catalogs under AI Hub section
  {
    type: 'app.navigation/href',
    flags: { required: [PLUGIN_MCP] },
    properties: {
      id: 'mcp-catalogs',
      title: 'MCP catalogs',
      href: '/ai-hub/mcp/catalogs',
      section: 'ai-hub',
      path: '/ai-hub/mcp/catalogs/*',
    },
  },
  // MCP Registries under AI Hub section
  {
    type: 'app.navigation/href',
    flags: { required: [PLUGIN_MCP] },
    properties: {
      id: 'mcp-registries',
      title: 'MCP registries',
      href: '/ai-hub/mcp/registries',
      section: 'ai-hub',
      path: '/ai-hub/mcp/registries/*',
    },
  },
  // Gen AI Studio section (depends on MCP feature)
  {
    type: 'app.navigation/section',
    flags: { required: [PLUGIN_MCP] },
    properties: {
      id: 'gen-ai-studio',
      title: 'Gen AI studio',
      group: '4_gen_ai_studio',
      iconRef: () => import('./src/components/GenAiStudioNavIcon'),
    },
  },
  // AI Asset Endpoints under Gen AI Studio section
  {
    type: 'app.navigation/href',
    flags: { required: [PLUGIN_MCP] },
    properties: {
      id: 'ai-asset-endpoints',
      title: 'AI asset endpoints',
      href: '/gen-ai-studio/assets',
      section: 'gen-ai-studio',
      path: '/gen-ai-studio/assets/*',
    },
  },
];
```

## Navigation Migration Guide

### Code Changes Required

The following changes need to be implemented to migrate from the standalone MCP section to the integrated structure:

#### 1. **Route Path Updates**

**Old Routes:**
- `/mcp/registries` → **New:** `/ai-hub/mcp/registries`
- `/mcp/registries/:name` → **New:** `/ai-hub/mcp/registries/:name`
- `/mcp/servers` → **New:** `/gen-ai-studio/assets`

**Files to Update:**
- `packages/mcp/extensions.ts` - Update all `href` and `path` properties
- All page components that use route paths
- Breadcrumb components
- Navigation links between pages

#### 2. **Navigation Extension Updates**

**Changes:**
- Remove standalone `app.navigation/section` for MCP
- Update `section` property from `'mcp'` to `'ai-hub'` for registries
- Add new `section: 'gen-ai-studio'` for AI asset endpoints
- Update menu item titles:
  - "Registries" → "MCP registries"
  - "Servers" → "AI asset endpoints"

#### 3. **Breadcrumb Updates**

**Old Breadcrumbs:**
- `MCP > Registries > {name}`

**New Breadcrumbs:**
- `AI Hub > MCP Registries > {name}`
- `Gen AI Studio > AI Asset Endpoints`

#### 4. **Component & Page Updates**

**Files Requiring Updates:**
- `McpRegistriesPage.tsx` - Update route path references
- `McpRegistryDetailsPage.tsx` - Update breadcrumbs and route paths
- `McpServersPage.tsx` - Update routes to `/gen-ai-studio/assets`
- All components with hardcoded `/mcp/*` paths
- Link components that navigate between MCP pages

#### 5. **Feature Flag Updates**

Ensure feature flags remain the same:
- `SupportedArea.MCP_REGISTRIES` - For MCP registries
- `SupportedArea.MCP_SERVERS` - For AI asset endpoints
- Add `SupportedArea.MCP_CATALOGS` - For future MCP catalogs feature

## Success Criteria

### Functional Requirements

- Users can manage MCP registries (create, view, sync, delete)
- Users can browse and search available MCP servers
- Users can deploy MCP servers with custom configurations
- Users can monitor and manage deployed servers
- Integration respects ODH permissions and project context

### Performance Requirements

- Registry list loads in <2 seconds with 100+ registries
- Server search results appear in <500ms
- Instance status updates refresh every 30 seconds
- UI remains responsive on mobile devices

### User Experience Requirements

- Consistent design language with ODH Dashboard
- Intuitive navigation and task flows
- Comprehensive error handling and recovery
- Accessibility compliance (WCAG 2.1 AA)
- Mobile-first responsive design

### Technical Requirements

- Package-based integration following ODH patterns
- TypeScript strict mode compliance
- Zero TypeScript type-check errors (`npm run type-check`)
- Zero ESLint errors (`npm run lint`)
- >90% test coverage (unit + integration)
- Bundle size impact <200KB gzipped

## Development Mode (DEV_MODE) Testing Requirements

### Port Forwarding for Internal Services

**⚠️ IMPORTANT: For local development testing, port forwarding MUST be configured manually.**

When running the ODH dashboard backend in development mode (`DEV_MODE=true`), the backend expects all internal Kubernetes service endpoints to be accessible via `localhost:8888` through port forwarding.

**General Approach:**

This is a **standard pattern** for testing internal Kubernetes services in DEV_MODE across all ODH dashboard features:

1. **Identify the Internal Service**
   - Extract service name, namespace, and port from the resource status or configuration
   - Example: Service `toolhive-git-registry-api` in namespace `toolhive-system` on port `8080`

2. **Set up Port Forwarding**
   ```bash
   kubectl port-forward -n <namespace> svc/<service-name> 8888:<service-port>
   ```
   
   Example:
   ```bash
   kubectl port-forward -n toolhive-system svc/toolhive-git-registry-api 8888:8080
   ```

3. **Keep Port Forwarding Active**
   - The port-forward command must remain running in a separate terminal
   - If the port-forward is interrupted, API calls to internal services will fail
   - The backend automatically converts service URLs to `localhost:8888` in DEV_MODE

**Developer Responsibilities:**

- **MUST** remember to set up port forwarding before testing features that interact with internal services
- **MUST** use port `8888` consistently for all internal service port-forwards in DEV_MODE
- **MUST** keep port-forward sessions active during development
- **MUST** document port-forwarding requirements in feature specifications

**Environment Variable Override:**

Feature-specific environment variables can override the default `localhost:8888`:
- `{FEATURE}_SERVICE_HOST` - Override host (default: `localhost`)
- `{FEATURE}_SERVICE_PORT` - Override port (default: `8888`)

**Production Mode:**

In production (non-DEV_MODE), the backend automatically converts service names to Kubernetes FQDN format (`.svc.cluster.local`) and no port forwarding is required.

### Code Quality Standards

All MCP feature implementations must adhere to the following code quality requirements:

1. **Type Safety**
   - Avoid type assertions (`as` keyword) - use type guards instead
   - Handle optional properties with explicit checks or nullish coalescing
   - Use template literals only with guaranteed non-undefined values
   - No `any` types

2. **Linting Compliance**
   - No unused imports or variables
   - Follow React best practices
   - Proper formatting (Prettier compliance)
   - All code must pass `npm run lint` with zero errors

3. **Type Checking**
   - All code must pass `npm run type-check` with zero errors
   - Use proper type narrowing for optional properties
   - Validate API responses with type guards

4. **Pre-commit Validation**
   - Run `npm run type-check` before committing
   - Run `npm run lint` before committing
   - Fix auto-fixable issues with `npm run lint -- --fix`

## Dependencies & Prerequisites

### Technical Dependencies

- OpenShift AI Dashboard framework
- ToolHive operator deployed in cluster
- Kubernetes RBAC configured for MCP resources
- PatternFly React components v6+

### Operator Integration

- MCP operator integration into ODH operator (in progress)
- MCPRegistry and MCPServer CRDs available
- Proper RBAC roles and bindings configured
- Namespace isolation and resource quotas

### Development Dependencies

- Node.js 20+ and npm 10+
- TypeScript 5.8+
- React 18+ with hooks
- Jest and Testing Library for testing

## Development Setup

### Module Federation Requirements

The ODH Dashboard uses module federation to load plugins dynamically. For the Gen AI Studio section and AI Asset Endpoints to appear, you must run the gen-ai module federation remote server.

#### Starting the Gen AI Dev Server

The gen-ai package must be running as a module federation remote for the main dashboard to load its extensions:

```bash
# From the project root
cd packages/gen-ai
npm run cypress:server:dev
```

This starts the gen-ai dev server on port **9102** (as configured in `packages/gen-ai/package.json`).

#### Verifying the Remote Entry

You can verify the remote entry is accessible:

```bash
curl http://localhost:9102/remoteEntry.js
```

Should return HTTP 200 with the module federation remote entry file.

#### Starting the Main Dashboard

Once the gen-ai dev server is running, start the main dashboard:

```bash
# From the project root
cd frontend
npm run start:dev
```

The main dashboard will automatically discover and load the gen-ai module federation remote from `http://localhost:9102`.

#### Troubleshooting

**Error: "Failed to load module extensions for genAi: remoteEntryExports is undefined"**

- **Cause**: The gen-ai dev server is not running on port 9102
- **Solution**: Start the gen-ai dev server using `npm run cypress:server:dev` in `packages/gen-ai`

**Gen AI Studio menu not appearing**

- **Cause**: The MCP feature flag (`disableMcp`) is enabled, or the `PLUGIN_MCP` area is not available
- **Solution**: 
  1. Ensure `disableMcp: false` in the dashboard configuration
  2. Verify the MCP package extensions are loaded correctly
  3. Refresh the browser after starting the dev server

**Port conflicts**

- If port 9102 is already in use, you can override it:
  ```bash
  cd packages/gen-ai/frontend
  DEPLOYMENT_MODE=federated PORT=9103 npm run start:dev
  ```
  Then set the environment variable for the main dashboard:
  ```bash
  MF_GENAI_LOCAL_PORT=9103 npm run start:dev
  ```

## Risk Mitigation

### Technical Risks

- **Risk**: MCP operator API changes during development
  - **Mitigation**: Implement API abstraction layer, mock data for development
- **Risk**: Performance issues with large server counts
  - **Mitigation**: Virtual scrolling, pagination, caching strategies
- **Risk**: Complex deployment configurations
  - **Mitigation**: Progressive disclosure, sensible defaults, validation

### Integration Risks

- **Risk**: ODH design system breaking changes
  - **Mitigation**: Pin PatternFly versions, component isolation
- **Risk**: Navigation conflicts with other features
  - **Mitigation**: Follow ODH extension patterns, coordinated planning
- **Risk**: User workflow disruption
  - **Mitigation**: Iterative rollout, feature flags, user feedback

## Future Considerations

### Extensibility

- Support for custom MCP server types
- Plugin system for additional server sources
- Integration with external CI/CD pipelines
- Multi-cluster federation support

### Advanced Features

- Server template library
- Automated deployment pipelines
- Cost optimization recommendations
- Security scanning integration

### Analytics & Insights

- Usage analytics and reporting
- Performance monitoring and alerting
- Deployment success metrics
- Resource utilization tracking

---

_This specification document will be updated as requirements evolve._

