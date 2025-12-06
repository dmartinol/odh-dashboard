/**
 * API client functions for fetching catalog data from MCP registry endpoints via backend proxy
 */

import { RegistryListResponse, RegistryDetailsResponse } from '../types/catalog';

/**
 * Type guard to check if value is a Record (object but not array)
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard to validate RegistryListResponse
 */
const isRegistryListResponse = (data: unknown): data is RegistryListResponse => {
  if (!isRecord(data)) {
    return false;
  }
  // Check if 'registries' property exists and is an array
  if (!('registries' in data)) {
    return false;
  }
  return Array.isArray(data.registries);
};

/**
 * Type guard to validate RegistryDetailsResponse
 */
const isRegistryDetailsResponse = (data: unknown): data is RegistryDetailsResponse => {
  return typeof data === 'object' && data !== null && 'name' in data;
};

/**
 * Fetch registry list from a registry API endpoint via backend proxy
 * @param namespace Namespace of the MCPRegistry
 * @param registryName Name of the MCPRegistry
 * @returns Promise with registry list response
 */
export const fetchRegistryList = async (
  namespace: string,
  registryName: string,
): Promise<RegistryListResponse> => {
  const url = `/api/mcpCatalogs/${encodeURIComponent(namespace)}/${encodeURIComponent(
    registryName,
  )}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch registry list: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate response structure using type guard
    if (!isRegistryListResponse(data)) {
      throw new Error('Invalid registry list response: missing registries array');
    }

    return data;
  } catch (error) {
    console.error(`Error fetching registry list from ${url}:`, error);
    throw error;
  }
};

/**
 * Fetch detailed registry information from a registry API endpoint via backend proxy
 * @param namespace Namespace of the MCPRegistry
 * @param registryName Name of the MCPRegistry
 * @param registryNameInCatalog Name of the registry within the catalog to fetch details for
 * @returns Promise with registry details response
 */
export const fetchRegistryDetails = async (
  namespace: string,
  registryName: string,
  registryNameInCatalog: string,
): Promise<RegistryDetailsResponse> => {
  const url = `/api/mcpCatalogs/${encodeURIComponent(namespace)}/${encodeURIComponent(
    registryName,
  )}/${encodeURIComponent(registryNameInCatalog)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch registry details: ${response.status} ${response.statusText}`,
      );
    }

    const data: unknown = await response.json();

    // Validate response structure using type guard
    if (!isRegistryDetailsResponse(data)) {
      throw new Error('Invalid registry details response: expected object with name property');
    }

    return data;
  } catch (error) {
    console.error(`Error fetching registry details from ${url}:`, error);
    throw error;
  }
};
