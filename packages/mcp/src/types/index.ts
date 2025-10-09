// Types entry point - re-exports are intentional for this barrel file
/* eslint-disable no-barrel-files/no-barrel-files */
export * from './registry';
export * from './server';
export * from './instance';

// Common types
export interface McpApiResponse<T> {
  data: T;
  metadata?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface McpApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface McpListOptions {
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continue?: string;
}

export interface McpWatchEvent<T> {
  type: 'ADDED' | 'MODIFIED' | 'DELETED';
  object: T;
}
