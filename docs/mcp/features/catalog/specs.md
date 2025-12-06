# MCP Catalog Feature Specifications

## Overview

The MCP Catalog feature allows users to browse and view catalogs from MCP registries through their API endpoints. Catalogs are displayed in a card-based interface with project/namespace filtering capabilities.

## Feature Goals

- Display available MCP catalogs from registry API endpoints
- Support project/namespace filtering with "All projects" option
- Provide card-based catalog browsing interface
- Enable navigation to catalog details (future implementation)

## UI Requirements

### Catalog View Layout

The catalog view displays:

1. **Project Selector**
   - Includes "All projects" option (when `selectAllProjects` prop is enabled)
   - Defaults to the value selected in the Projects menu, or to no value (empty string)
   - Uses `ProjectSelector` component with `selectAllProjects={true}`

2. **Catalog Cards**
   - Card-based layout for displaying catalogs
   - Each card contains:
     - **Title**: Registry name from API response
     - **Description**: Fixed format "MCP catalog {registryName}"
     - **Link**: Placeholder link to catalog details page (not implemented yet)

### Visual Design

- Follows ODH design system patterns
- Uses PatternFly Card components
- Responsive grid layout
- Consistent with other MCP feature pages (Registries, Servers)

## Development Mode (DEV_MODE) Requirements

### Port Forwarding Setup

**⚠️ IMPORTANT: For local development testing, port forwarding MUST be configured manually.**

When running the ODH dashboard backend in development mode (`DEV_MODE=true`), the backend expects all internal Kubernetes service endpoints to be accessible via `localhost:8888` through port forwarding.

**Required Setup:**

1. **Identify the MCP Registry API Service**
   - Find the service name from the MCPRegistry CRD status: `status.apiStatus.endpoint`
   - Example: `http://toolhive-git-registry-api.toolhive-system:8080`
   - Service name: `toolhive-git-registry-api`
   - Namespace: `toolhive-system`
   - Service port: `8080`

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
   - If the port-forward is interrupted, catalog fetching will fail
   - The backend will automatically convert service URLs to `localhost:8888` in DEV_MODE

**General Approach:**

This `localhost:8888` approach is the standard pattern for testing internal Kubernetes services in DEV_MODE across all ODH dashboard features. Developers must remember to:

- Set up port forwarding before testing catalog features
- Use port `8888` consistently for all internal service port-forwards in DEV_MODE
- Keep port-forward sessions active during development

**Environment Variable Override:**

If you need to use a different host/port, you can set environment variables:
- `MCP_REGISTRY_API_HOST` - Override host (default: `localhost`)
- `MCP_REGISTRY_API_PORT` - Override port (default: `8888`)
- `MCP_REGISTRY_<SERVICE_NAME>_HOST` - Service-specific host override
- `MCP_REGISTRY_<SERVICE_NAME>_PORT` - Service-specific port override

## API Integration

### Data Fetching Flow

1. **Fetch MCPRegistry Instances**
   - Query MCPRegistry CRDs from the selected project namespace
   - If "All projects" is selected (empty string), query from all namespaces
   - Use `useMcpRegistries` hook with appropriate namespace parameter

2. **Extract API Endpoints**
   - For each MCPRegistry instance, extract the endpoint from:
     ```typescript
     registry.status?.apiStatus?.endpoint
     ```
   - Example: `http://toolhive-git-registry-api.toolhive-system:8080`

3. **Fetch Registry List**
   - For each registry with a valid endpoint, construct API URL:
     ```
     {endpoint}/extension/v0/registries
     ```
   - Example: `http://toolhive-git-registry-api.toolhive-system:8080/extension/v0/registries`
   - Make HTTP GET request to fetch registry list

4. **Parse API Response**
   - Expected response format:
     ```json
     {
       "registries": [
         {
           "name": "default",
           "type": "KUBERNETES",
           "syncStatus": {...},
           "createdAt": "...",
           "updatedAt": "..."
         },
         {
           "name": "toolhive-git-registry",
           "type": "REMOTE",
           "syncStatus": {...},
           "createdAt": "...",
           "updatedAt": "..."
         }
       ]
     }
     ```

5. **Filter Registries**
   - Remove registries with `type` set to:
     - `"KUBERNETES"`
     - `"MANAGED"`
   - Keep only registries with other types (e.g., `"REMOTE"`)

6. **Fetch Registry Details**
   - For each remaining registry, fetch detailed information:
     ```
     {endpoint}/extension/v0/registries/{registryName}
     ```
   - Example: `http://toolhive-git-registry-api.toolhive-system:8080/extension/v0/registries/toolhive-git-registry`
   - Use the `name` field from the registry list response

7. **Display Catalog Cards**
   - Use the `name` field as the card title
   - Set description as: `"MCP catalog {registryName}"`
   - Store full registry details for future catalog details page

### Error Handling

- Handle missing `apiStatus.endpoint` gracefully (skip registry)
- Handle API request failures (show error state, allow retry)
- Handle invalid API responses (log error, skip invalid entries)
- Handle network timeouts (show timeout message)

### Loading States

- Show loading spinner while fetching MCPRegistry instances
- Show loading state while fetching API data
- Show skeleton cards during data loading
- Display empty state when no catalogs are found

## Technical Implementation

### Components

- **McpCatalogsPage**: Main page component
- **McpCatalogCard**: Individual catalog card component (to be created)
- **ProjectSelector**: Reuse existing component with `selectAllProjects={true}`

### Hooks

- **useMcpRegistries**: Fetch MCPRegistry CRDs from Kubernetes
- **useCatalogData**: Custom hook to fetch and process catalog data from API endpoints (to be created)

### API Client

- Frontend API client functions (in `packages/mcp/src/api/catalog.ts`):
  - `fetchRegistryList(namespace: string, registryName: string): Promise<RegistryListResponse>`
    - Calls backend API: `GET /api/mcpCatalogs/{namespace}/{registryName}`
  - `fetchRegistryDetails(namespace: string, registryName: string, registryNameInCatalog: string): Promise<RegistryDetailsResponse>`
    - Calls backend API: `GET /api/mcpCatalogs/{namespace}/{registryName}/{registryNameInCatalog}`
- Backend proxy routes (in `backend/src/routes/api/mcpCatalogs/index.ts`):
  - Proxies requests to MCP registry API endpoints
  - Extracts endpoint from MCPRegistry CRD status
  - Handles authentication and error responses

### Type Definitions

- Define TypeScript interfaces for:
  - `RegistryListResponse`
  - `RegistryDetailsResponse`
  - `CatalogData` (processed catalog information)

## Code Quality Requirements

### TypeScript & Linting Standards

All code must pass TypeScript type checking and ESLint validation before being considered complete:

1. **Type Safety**
   - Avoid type assertions (`as` keyword) - use type guards instead
   - Use proper type narrowing for optional properties
   - Handle `undefined` and `null` values explicitly
   - Use template literals only with guaranteed non-undefined values

2. **ESLint Compliance**
   - No unused imports or variables
   - Follow React best practices (e.g., boolean props without `={true}`)
   - Proper formatting (Prettier compliance)
   - No `any` types or type assertions

3. **Type Guards**
   - When validating API responses, use type guard functions instead of type assertions
   - Example:
     ```typescript
     // ❌ Bad: Type assertion
     // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
     const data = response as RegistryListResponse;
     
     // ✅ Good: Type guard
     const isRegistryListResponse = (responseData: unknown): responseData is RegistryListResponse => {
       return typeof responseData === 'object' && responseData !== null && 'registries' in responseData;
     };
     if (isRegistryListResponse(data)) {
       // data is now properly typed
     }
     ```

4. **Optional Property Handling**
   - Always check for `undefined` before using optional properties in template literals
   - Use nullish coalescing (`??`) or conditional checks
   - Example:
     ```typescript
     // ❌ Bad: Template literal with potentially undefined
     const message = `Registry ${registry.metadata?.name} in ${registry.metadata?.namespace}`;
     
     // ✅ Good: Explicit checks or fallbacks
     const name = registry.metadata?.name ?? 'unknown';
     const namespace = registry.metadata?.namespace ?? 'unknown';
     const message = `Registry ${name} in ${namespace}`;
     ```

5. **Pre-commit Validation**
   - All code must pass `npm run type-check` with zero errors
   - All code must pass `npm run lint` with zero errors
   - Fix linting issues using `npm run lint -- --fix` when possible
   - Manual fixes required for logic-related linting errors

## Data Flow

```
User selects project/namespace
    ↓
Fetch MCPRegistry CRDs from namespace(s)
    ↓
Extract status.apiStatus.endpoint from each registry
    ↓
For each endpoint, fetch /extension/v0/registries
    ↓
Filter out KUBERNETES and MANAGED types
    ↓
For each remaining registry, fetch /extension/v0/registries/{name}
    ↓
Process and display catalog cards
```

## Future Enhancements

- Catalog details page implementation
- Catalog search and filtering
- Catalog metadata display
- Catalog synchronization status
- Catalog management operations (create, update, delete)

---

_See [plan.md](./plan.md) for development tasks and implementation phases._

