/**
 * Type definitions for MCP Catalog API responses
 */

export interface RegistrySyncStatus {
  phase?: 'complete' | 'pending' | 'failed';
  lastAttempt?: string;
  lastSyncTime?: string;
  attemptCount?: number;
  serverCount?: number;
  message?: string;
}

export interface RegistryListItem {
  name: string;
  type: 'KUBERNETES' | 'MANAGED' | 'REMOTE' | string;
  syncStatus?: RegistrySyncStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistryListResponse {
  registries: RegistryListItem[];
}

export interface RegistryDetailsResponse {
  name: string;
  type: string;
  syncStatus?: RegistrySyncStatus;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CatalogData {
  name: string;
  description: string;
  endpoint: string;
  registryName: string;
  registryNamespace: string;
  details?: RegistryDetailsResponse;
}
