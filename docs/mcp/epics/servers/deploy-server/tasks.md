# Deploy Server - Development Tasks

## Status: ✅ Complete

## Completed Tasks

- ✅ Advanced deployment functionality (replaced quick deploy with full configuration)
- ✅ Complete deployment configuration dialog
- ✅ Namespace/project integration with ProjectsContext
- ✅ Resource validation and form validation
- ✅ Full deployment configuration dialog with expandable advanced settings
- ✅ Environment variables management with add/remove functionality
- ✅ Resource limits and requests configuration
- ✅ MCPServer CRD generation with proper metadata and labels
- ✅ Updated to 3-tab structure: "Server", "Environment Variables", "Resources"
- ✅ Replaced expandable sections with proper tabbed interface
- ✅ Enhanced server configuration
- ✅ Deploy Dialog Form Layout: Grouped related fields on same row
- ✅ Updated default proxy mode from SSE to Streamable HTTP
- ✅ Added password visibility toggle for secret environment variables
- ✅ Advanced Tab Features:
  - ✅ Image Pull Secrets: Multi-select dropdown for authenticated registries
  - ✅ Service Account: Optional service account selector
  - ✅ Node Selector: Dynamic key-value pair editor
  - ✅ Security Context: Run as non-root user, User ID/Group ID configuration

## Components Created

- `McpServerDeployModal.tsx` - Deployment configuration dialog

## Hooks Created

- `useSecrets.ts` - K8s secrets discovery hook
- `useServiceAccounts.ts` - Service accounts discovery hook

## Files Modified

- `packages/mcp/src/components/McpServerDeployModal.tsx`
- `packages/mcp/src/hooks/useSecrets.ts` (new)
- `packages/mcp/src/hooks/useServiceAccounts.ts` (new)
- `packages/mcp/src/types/server.ts` - Added `podTemplateSpec` support

---

_This feature is complete. See [specs.md](./specs.md) for specifications._

