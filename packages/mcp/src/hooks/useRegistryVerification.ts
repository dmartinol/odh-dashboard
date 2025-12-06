/**
 * React hook for verifying registry existence via MCP registry API
 */

import * as React from 'react';
import { verifyRegistryExists } from '../api/registryApi';
import { RegistryApiRegistryResponse } from '../types/registryApi';

interface UseRegistryVerificationResult {
  exists: boolean | null;
  registry: RegistryApiRegistryResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to verify if a registry exists via MCP registry API
 * @param namespace Namespace of the registry
 * @param registryName Name of the registry (typically project name)
 * @returns Verification result, loading state, error state, and refetch function
 */
export const useRegistryVerification = (
  namespace: string | undefined,
  registryName: string | undefined,
): UseRegistryVerificationResult => {
  const [exists, setExists] = React.useState<boolean | null>(null);
  const [registry, setRegistry] = React.useState<RegistryApiRegistryResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    if (!namespace || !registryName) {
      setExists(null);
      setRegistry(null);
      setLoading(false);
      setError(null);
      return;
    }

    const verifyRegistry = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await verifyRegistryExists(namespace, registryName);
        setExists(result.exists);
        setRegistry(result.registry || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify registry');
        setExists(false);
        setRegistry(null);
      } finally {
        setLoading(false);
      }
    };

    verifyRegistry();
  }, [namespace, registryName, refreshKey]);

  const refetch = React.useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    exists,
    registry,
    loading,
    error,
    refetch,
  };
};
