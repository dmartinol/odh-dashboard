# Create Registry Feature

## Overview

The Create Registry feature provides a multi-step wizard for creating new MCP registries with support for Git, ConfigMap, and HTTP sources, including source validation and tag discovery.

## Feature Goals

- Enable users to create new MCP registries
- Support multiple source types (Git, ConfigMap, HTTP)
- Validate source accessibility in real-time
- Discover and select tags from registry sources
- Configure sync policies and filtering

## UI Requirements

### Creation Wizard Layout

The registry creation wizard uses a multi-step modal with 4 tabs:

1. **General Tab**
   - Registry name
   - Display name
   - Description

2. **Data Sources Tab**
   - Source type selection (Git, ConfigMap, HTTP)
   - Source-specific configuration:
     - **Git**: URL, branch, path, validation
     - **ConfigMap**: Namespace, ConfigMap name, key selection
     - **HTTP**: URL
   - Real-time source validation

3. **Sync Policy Tab**
   - Sync mode (Manual, Automatic)
   - Sync interval (for automatic sync)
   - Retry policy

4. **Filter Tab**
   - Tag discovery from registry source
   - Tag selection (include/exclude)
   - Name pattern filtering

## Technical Implementation

### Components

- `McpRegistryCreateModal.tsx` - Multi-step creation wizard

### Validation Services

- `GitValidationService.ts` - Git repository validation
- ConfigMap validation
- Tag discovery from ToolHive registry format

### Source Types Supported

- **Git**: GitHub, GitLab, Bitbucket repositories
- **ConfigMap**: Kubernetes ConfigMap resources
- **HTTP**: HTTP/HTTPS endpoints

## Status

✅ **Complete** - Registry creation wizard is fully implemented with source validation and tag discovery.

---

_See [tasks.md](./tasks.md) for development tasks._

