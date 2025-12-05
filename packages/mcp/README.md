# Model Context Protocol (MCP) Package

This package provides Model Context Protocol (MCP) integration for the OpenShift AI Dashboard. It enables users to manage MCP registries, discover and deploy MCP servers, and monitor running instances.

## Features

### Registry Management
- List and manage MCP registries
- Support for Git, HTTP, and ConfigMap sources
- Manual and automatic synchronization
- Registry health monitoring

### Server Discovery
- Browse available MCP servers from registries
- Filter by transport type (stdio, SSE, HTTP, WebSocket)
- Filter by tier (official, community, experimental)
- Search and categorization

### Instance Management
- Monitor deployed MCP server instances
- Lifecycle operations (start, stop, restart, delete)
- Resource scaling and metrics
- Instance health monitoring

## Package Structure

```
src/
├── api/                    # Kubernetes API clients
│   ├── registries.ts      # Registry CRUD operations
│   ├── servers.ts         # Server operations
│   └── instances.ts       # Instance management
├── components/            # React components
│   ├── registries/       # Registry UI components
│   ├── servers/          # Server UI components
│   ├── instances/        # Instance UI components
│   └── shared/           # Shared components
├── hooks/                # React hooks
│   ├── useRegistries.ts  # Registry state management
│   ├── useServers.ts     # Server state management
│   └── useInstances.ts   # Instance state management
├── pages/                # Full page components
│   ├── McpRegistriesPage.tsx
│   └── McpServersPage.tsx
├── types/                # TypeScript definitions
│   ├── registry.ts       # Registry types
│   ├── server.ts         # Server types
│   └── instance.ts       # Instance types
└── utils/                # Utility functions
```

## Extensions

### Navigation Extensions
- MCP Registries integrated into AI Hub section
- AI Asset Endpoints integrated into Gen AI Studio section

### Route Extensions
- `/ai-hub/mcp/registries/*` - Registry management (under AI Hub)
- `/gen-ai-studio/ai-asset-endpoints/*` - Server discovery and deployment (under Gen AI Studio)

### Extension Points
- `mcp.registry` - For registry plugins
- `mcp.server` - For server plugins
- `mcp.instance` - For instance plugins

## API Reference

### Registry Operations
```typescript
// List registries
const registries = await listMcpRegistries(namespace);

// Create registry
const newRegistry = await createMcpRegistry(registrySpec);

// Sync registry
await syncMcpRegistry(name, namespace);
```

### Server Operations
```typescript
// List servers
const servers = await listMcpServers(namespace);

// Deploy server
const deployedServer = await deployMcpServer(serverSpec);

// Filter by transport
const stdioServers = await listServersByTransport('stdio');
```

### Instance Operations
```typescript
// List instances
const instances = await listMcpInstances(namespace);

// Scale instance
await scaleMcpInstance(name, namespace, replicas);

// Get summary
const summary = await getMcpInstancesSummary(namespace);
```

## React Hooks

### useRegistries
```typescript
const { registries, loading, error, createRegistry, deleteRegistry } = useRegistries(namespace);
```

### useServers
```typescript
const { servers, loading, error, deployServer, undeployServer } = useServers(namespace);
```

### useInstances
```typescript
const { instances, loading, error, scaleInstance, deleteInstance } = useInstances(namespace);
```

## Types

### McpRegistry
- Registry configuration and status
- Source definitions (Git, HTTP, ConfigMap)
- Sync policies and filters

### McpServer
- Server metadata and configuration
- Transport and deployment settings
- Status and health information

### McpInstance
- Kubernetes deployment representation
- Instance metrics and logs
- Lifecycle management

## Development

### Prerequisites
- ODH Dashboard development environment
- ToolHive operator deployed in cluster
- Proper RBAC permissions for MCP resources

### Testing
```bash
# Unit tests
npm run test-unit

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building
The package is automatically included in the main ODH Dashboard build process through the workspace configuration.

## Integration Notes

- Uses ODH's extension system for seamless integration
- Follows ODH design patterns and component library
- Integrates with ODH's authentication and authorization
- Respects ODH project/namespace context
- Compatible with ODH's responsive design system

## Future Enhancements

- Custom server templates
- Advanced deployment configurations
- Metrics and monitoring integration
- Multi-cluster support
- Automated CI/CD pipelines