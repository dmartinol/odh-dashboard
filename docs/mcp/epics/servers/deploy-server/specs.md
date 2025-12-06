# Deploy Server Feature

## Overview

The Deploy Server feature enables users to deploy MCP servers with custom configurations, including environment variables, resource limits, and advanced settings like image pull secrets and service accounts.

## Feature Goals

- Enable users to deploy MCP servers with custom configurations
- Support basic and advanced deployment settings
- Generate MCPServer CRDs with proper metadata and labels
- Validate deployment configurations

## UI Requirements

### Deployment Dialog Layout

The deployment dialog uses a 3-tab structure:

1. **Server Tab**
   - Server name
   - Namespace/project selection
   - Transport configuration
   - Server-specific settings

2. **Environment Variables Tab**
   - Add/remove environment variables
   - Secret environment variable support
   - Password visibility toggle
   - Validation and error handling

3. **Resources Tab**
   - CPU limits and requests
   - Memory limits and requests
   - Resource validation

4. **Advanced Tab** (Expandable)
   - **Image Pull Secrets**: Multi-select dropdown for authenticated registries
   - **Service Account**: Optional service account selector
   - **Node Selector**: Dynamic key-value pair editor
   - **Security Context**: Run as non-root user, User ID/Group ID configuration

## Technical Implementation

### Components

- `McpServerDeployModal.tsx` - Deployment configuration dialog

### Hooks

- `useSecrets.ts` - K8s secrets discovery hook
- `useServiceAccounts.ts` - Service accounts discovery hook

### MCPServer CRD Generation

```yaml
apiVersion: toolhive.stacklok.dev/v1alpha1
kind: MCPServer
metadata:
  name: {server-name}
  namespace: {namespace}
  labels:
    toolhive.stacklok.io/registry-name: {registry-name}
    toolhive.stacklok.io/registry-namespace: {registry-namespace}
    toolhive.stacklok.io/server-registry-name: {server-registry-name}
spec:
  server: {server-config}
  podTemplateSpec: {advanced-config}
```

## Status

✅ **Complete** - Server deployment is fully implemented with advanced configuration options.

---

_See [tasks.md](./tasks.md) for development tasks._

