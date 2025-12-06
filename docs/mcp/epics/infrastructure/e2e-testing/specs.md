# E2E Testing Feature

## Overview

The E2E Testing feature establishes end-to-end tests covering critical user workflows using Cypress or Playwright.

## Feature Goals

- Test complete user workflows
- Test registry creation and management
- Test server deployment workflows
- Test navigation and routing
- Test error handling scenarios

## Technical Implementation

### Testing Framework

- Cypress or Playwright
- Full user workflows
- Cross-browser testing
- Performance testing

### E2E Test Scenarios

**Registry Management**:
1. Create registry with Git source
2. Create registry with ConfigMap source
3. View registry details
4. Edit registry
5. Delete registry
6. Sync registry

**Server Management**:
1. Browse available servers
2. View server details
3. Deploy server with basic config
4. Deploy server with advanced config
5. View deployed servers
6. Register unregistered server
7. Delete server

**Navigation**:
1. Navigate to MCP Registries
2. Navigate to AI Asset Endpoints
3. Breadcrumb navigation
4. Deep linking with query parameters

## Status

⏳ **Pending** - E2E testing is not yet implemented.

---

_See [tasks.md](./tasks.md) for development tasks._

