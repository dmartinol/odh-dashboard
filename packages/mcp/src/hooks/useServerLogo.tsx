import * as React from 'react';
import { ServerIcon } from '@patternfly/react-icons';
import { McpServer, McpServerMetadata } from '../types/server';
import { McpRegistry } from '../types/registry';
import { getProjectLogoUrl } from '../utils/registryValidation';
import { getServerMetadataFromRegistry } from '../api/registries';

// Cache for fetched logos to avoid repeated API calls
const logoCache = new Map<string, string | null>();

// Type guard to check if server is McpServer
const isMcpServer = (s: McpServer | McpServerMetadata): s is McpServer => {
  return 'metadata' in s && s.metadata !== undefined && 'name' in s.metadata;
};

interface UseServerLogoOptions {
  server: McpServer | McpServerMetadata;
  linkedRegistry?: McpRegistry;
  size?: number;
}

/**
 * Hook to get server logo URL with automatic derivation from repository
 * Supports both McpServer (deployed) and McpServerMetadata (catalog) types
 */
export const useServerLogo = ({
  server,
  linkedRegistry,
  size = 24,
}: UseServerLogoOptions): React.ReactNode => {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

  // Determine server identifier for caching
  const serverId = React.useMemo(() => {
    if (isMcpServer(server)) {
      return server.metadata?.name || null;
    }
    // It's McpServerMetadata
    return server.name || null;
  }, [server]);

  React.useEffect(() => {
    if (!serverId) {
      return;
    }

    // Check cache first
    const cachedLogo = logoCache.get(serverId);
    if (cachedLogo !== undefined) {
      setLogoUrl(cachedLogo);
      return;
    }

    // Priority 1: Check for explicit logo annotation (for McpServer)
    if (isMcpServer(server) && server.metadata?.annotations) {
      const annotationLogo = server.metadata.annotations['mcp.toolhive.stacklok.dev/server-logo'];
      if (annotationLogo) {
        logoCache.set(serverId, annotationLogo);
        setLogoUrl(annotationLogo);
        return;
      }
    }

    // Priority 2: Check for logo property (for McpServerMetadata)
    if ('logo' in server && server.logo) {
      logoCache.set(serverId, server.logo);
      setLogoUrl(server.logo);
      return;
    }

    // Priority 3: Try to derive from repository URL
    let repositoryUrl: string | undefined;

    // For McpServerMetadata, repository is directly available
    if ('repository' in server && server.repository) {
      repositoryUrl = server.repository;
    }
    // For McpServer, try to get repository from linked registry
    else if (isMcpServer(server) && linkedRegistry) {
      // Fetch metadata from registry asynchronously
      const registryName = linkedRegistry.metadata?.name;
      const registryNamespace = linkedRegistry.metadata?.namespace;
      const serverName =
        server.metadata?.labels?.['toolhive.stacklok.io/server-name'] || server.metadata?.name;

      if (registryName && registryNamespace && serverName) {
        getServerMetadataFromRegistry(registryName, registryNamespace, serverName)
          .then((metadata) => {
            if (metadata?.repository) {
              repositoryUrl = metadata.repository;
              // Derive logo from repository
              return getProjectLogoUrl(repositoryUrl);
            }
            return null;
          })
          .then((derivedLogo) => {
            if (derivedLogo) {
              logoCache.set(serverId, derivedLogo);
              setLogoUrl(derivedLogo);
            } else {
              logoCache.set(serverId, null);
              setLogoUrl(null);
            }
          })
          .catch((error) => {
            console.warn(`Failed to fetch server metadata for logo:`, error);
            logoCache.set(serverId, null);
            setLogoUrl(null);
          });
      }
      return;
    }

    // If we have a repository URL, derive logo asynchronously
    if (repositoryUrl) {
      getProjectLogoUrl(repositoryUrl)
        .then((derivedLogo) => {
          if (derivedLogo) {
            logoCache.set(serverId, derivedLogo);
            setLogoUrl(derivedLogo);
          } else {
            logoCache.set(serverId, null);
            setLogoUrl(null);
          }
        })
        .catch((error) => {
          console.warn(`Failed to derive logo from repository:`, error);
          logoCache.set(serverId, null);
          setLogoUrl(null);
        });
    } else {
      // No logo available
      logoCache.set(serverId, null);
      setLogoUrl(null);
    }
  }, [server, linkedRegistry, serverId]);

  // Return logo image or default icon
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Server logo"
        style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
        onError={(e) => {
          // If image fails to load, cache null and hide image
          logoCache.set(serverId || '', null);
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Show default icon (even while loading)
  return <ServerIcon style={{ width: `${size}px`, height: `${size}px` }} />;
};
