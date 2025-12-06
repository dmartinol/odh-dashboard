/**
 * Custom hook for fetching and managing catalog data from MCP registry API endpoints via backend proxy
 */

import React from 'react';
import { useMcpRegistries } from './useMcpRegistries';
import { fetchRegistryList, fetchRegistryDetails } from '../api/catalog';
import { CatalogData, RegistryListItem } from '../types/catalog';

interface UseCatalogDataResult {
  catalogs: CatalogData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch catalog data from MCP registry API endpoints via backend proxy
 * @param namespace Namespace to fetch registries from (empty string for all namespaces)
 * @returns Catalog data, loading state, error state, and refetch function
 */
export const useCatalogData = (namespace: string): UseCatalogDataResult => {
  const [catalogs, setCatalogs] = React.useState<CatalogData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch MCPRegistry instances
  // Empty string means all namespaces
  const [registries, registriesLoaded, registriesError] = useMcpRegistries(
    namespace === '' ? undefined : namespace,
  );

  // Fetch catalog data from API endpoints via backend proxy
  React.useEffect(() => {
    if (!registriesLoaded) {
      return;
    }

    if (registriesError) {
      setError(`Failed to fetch registries: ${registriesError.message}`);
      setLoading(false);
      return;
    }

    const fetchCatalogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const catalogPromises: Promise<CatalogData[]>[] = [];

        // Process each registry
        for (const registry of registries) {
          const endpoint = registry.status?.apiStatus?.endpoint;
          const registryName = registry.metadata?.name ?? '';
          const registryNamespace = registry.metadata?.namespace ?? '';

          // Skip registries without API endpoint
          if (!endpoint || !registryName || !registryNamespace) {
            console.warn(
              `Registry ${registryNamespace}/${registryName} has no API endpoint or missing metadata`,
            );
            continue;
          }

          // Fetch registry list from API via backend proxy
          const catalogPromise = (async (): Promise<CatalogData[]> => {
            try {
              const registryList = await fetchRegistryList(registryNamespace, registryName);

              // Filter out KUBERNETES and MANAGED types
              const filteredRegistries = registryList.registries.filter(
                (reg: RegistryListItem) => reg.type !== 'KUBERNETES' && reg.type !== 'MANAGED',
              );

              // Process each filtered registry
              const catalogDataPromises = filteredRegistries.map(
                async (reg: RegistryListItem): Promise<CatalogData | null> => {
                  try {
                    // Fetch registry details via backend proxy
                    const details = await fetchRegistryDetails(
                      registryNamespace,
                      registryName,
                      reg.name,
                    );

                    return {
                      name: reg.name,
                      description: `MCP catalog ${reg.name}`,
                      endpoint,
                      registryName,
                      registryNamespace,
                      type: reg.type,
                      syncStatus: reg.syncStatus,
                      createdAt: reg.createdAt,
                      updatedAt: reg.updatedAt,
                      details,
                    };
                  } catch (err) {
                    console.warn(
                      `Failed to fetch details for registry ${reg.name} from ${registryNamespace}/${registryName}:`,
                      err,
                    );
                    // Return basic catalog data even if details fetch fails
                    return {
                      name: reg.name,
                      description: `MCP catalog ${reg.name}`,
                      endpoint,
                      registryName,
                      registryNamespace,
                      type: reg.type,
                      syncStatus: reg.syncStatus,
                      createdAt: reg.createdAt,
                      updatedAt: reg.updatedAt,
                    };
                  }
                },
              );

              const catalogData = await Promise.all(catalogDataPromises);
              return catalogData.filter((c): c is CatalogData => c !== null);
            } catch (err) {
              console.warn(
                `Failed to fetch registry list from ${registryNamespace}/${registryName}:`,
                err instanceof Error ? err.message : String(err),
              );
              return [];
            }
          })();

          catalogPromises.push(catalogPromise);
        }

        // Wait for all catalog fetches to complete
        const catalogResults = await Promise.all(catalogPromises);
        const allCatalogs = catalogResults.flat();

        setCatalogs(allCatalogs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch catalogs');
        setCatalogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogs();
  }, [registries, registriesLoaded, registriesError, refreshKey]);

  const refetch = React.useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    catalogs,
    loading: loading || !registriesLoaded,
    error: error || (registriesError ? registriesError.message : null),
    refetch,
  };
};
