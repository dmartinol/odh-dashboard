import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';

export interface GitValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    urlValid: boolean;
    branchValid: boolean;
    pathValid: boolean;
  };
}

export interface ConfigMapValidationResult {
  isValid: boolean;
  error?: string;
  availableKeys?: string[];
}

export interface TagDiscoveryResult {
  tags: string[];
  error?: string;
}

interface ServerType {
  tags?: string[];
  [key: string]: unknown;
}

const isServerType = (server: unknown): server is ServerType => {
  return typeof server === 'object' && server !== null;
};

/**
 * Validates a Git repository URL format
 */
export const validateGitUrl = (url: string): boolean => {
  if (!url.trim()) return false;

  // Basic URL format validation
  try {
    const parsedUrl = new URL(url);
    // Must be http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    // Should look like a git repository
    return (
      parsedUrl.pathname.includes('/') &&
      (url.endsWith('.git') ||
        parsedUrl.hostname.includes('github') ||
        parsedUrl.hostname.includes('gitlab'))
    );
  } catch {
    return false;
  }
};

/**
 * Validates Git repository accessibility (mock for now, can be enhanced to actually test)
 */
export const validateGitRepository = async (
  repository: string,
  branch = 'main',
  path = '',
): Promise<GitValidationResult> => {
  // URL validation
  const urlValid = validateGitUrl(repository);
  if (!urlValid) {
    return {
      isValid: false,
      error: 'Invalid Git repository URL format',
      details: { urlValid: false, branchValid: true, pathValid: true },
    };
  }

  // Branch validation (basic check)
  const branchValid = branch.trim().length > 0 && !/[^a-zA-Z0-9._/-]/.test(branch);
  if (!branchValid) {
    return {
      isValid: false,
      error: 'Invalid branch name format',
      details: { urlValid: true, branchValid: false, pathValid: true },
    };
  }

  // Path validation (basic check)
  const pathValid = path.trim().length > 0 && !path.includes('..') && !path.startsWith('/');
  if (!pathValid) {
    return {
      isValid: false,
      error: 'Invalid file path format',
      details: { urlValid: true, branchValid: true, pathValid: false },
    };
  }

  // TODO: In a real implementation, this could make an actual HTTP request to validate accessibility
  // For now, we'll just validate the format
  return {
    isValid: true,
    details: { urlValid: true, branchValid: true, pathValid: true },
  };
};

/**
 * Validates ConfigMap and key existence
 */
export const validateConfigMap = (
  configMapName: string,
  configMapKey: string,
  availableConfigMaps: ConfigMapKind[],
): ConfigMapValidationResult => {
  if (!configMapName.trim()) {
    return {
      isValid: false,
      error: 'ConfigMap name is required',
    };
  }

  if (!configMapKey.trim()) {
    return {
      isValid: false,
      error: 'ConfigMap key is required',
    };
  }

  // Find the ConfigMap
  const configMap = availableConfigMaps.find((cm) => cm.metadata.name === configMapName);
  if (!configMap) {
    return {
      isValid: false,
      error: `ConfigMap '${configMapName}' not found in namespace`,
    };
  }

  // Get available keys
  const availableKeys = Object.keys(configMap.data || {});
  if (availableKeys.length === 0) {
    return {
      isValid: false,
      error: `ConfigMap '${configMapName}' has no data keys`,
      availableKeys: [],
    };
  }

  // Check if the specified key exists
  if (!availableKeys.includes(configMapKey)) {
    return {
      isValid: false,
      error: `Key '${configMapKey}' not found in ConfigMap '${configMapName}'`,
      availableKeys,
    };
  }

  return {
    isValid: true,
    availableKeys,
  };
};

/**
 * Parse ToolHive registry format and extract tags
 * ToolHive format has servers as an object where each key is a server name
 * and the value contains a tags array
 */
export const parseRegistryForTags = async (content: string): Promise<TagDiscoveryResult> => {
  try {
    // Parse as JSON (ToolHive format)
    const registryData = JSON.parse(content);

    // Extract tags from servers object
    const allTags = new Set<string>();

    // ToolHive format: { "servers": { "server-name": { "tags": [...], ... }, ... } }
    if (registryData.servers && typeof registryData.servers === 'object') {
      Object.values(registryData.servers).forEach((server) => {
        if (isServerType(server) && server.tags && Array.isArray(server.tags)) {
          server.tags.forEach((tag: string) => {
            if (typeof tag === 'string' && tag.trim()) {
              allTags.add(tag.trim());
            }
          });
        }
      });
    }

    return {
      tags: Array.from(allTags).toSorted(),
    };
  } catch (error) {
    return {
      tags: [],
      error: 'Failed to parse registry data for tags',
    };
  }
};

/**
 * Discovers tags from a Git repository source
 */
export const discoverTagsFromGit = async (
  repository: string,
  branch = 'main',
  path = '',
): Promise<TagDiscoveryResult> => {
  try {
    // For GitHub repositories, construct raw content URL
    if (repository.includes('github.com')) {
      // Convert GitHub URL to raw content URL
      // From: https://github.com/user/repo.git or https://github.com/user/repo
      // To: https://raw.githubusercontent.com/user/repo/branch/path

      const repoUrl = repository.replace(/\.git$/, '');
      const parts = repoUrl.replace('https://github.com/', '').split('/');

      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1];
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

        try {
          const response = await fetch(rawUrl);
          if (response.ok) {
            const content = await response.text();
            return await parseRegistryForTags(content);
          }
          return {
            tags: [],
            error: `Failed to fetch registry file: ${response.status} ${response.statusText}`,
          };
        } catch (fetchError) {
          return {
            tags: [],
            error: `Network error while fetching registry file: ${
              fetchError instanceof Error ? fetchError.message : 'Unknown error'
            }`,
          };
        }
      }
    }

    // For other Git providers or if GitHub parsing fails, return helpful error
    return {
      tags: [],
      error: 'Tag discovery is currently supported for GitHub repositories only',
    };
  } catch (error) {
    return {
      tags: [],
      error: `Failed to discover tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Discovers tags from a ConfigMap source
 */
export const discoverTagsFromConfigMap = async (
  configMap: ConfigMapKind,
  key: string,
): Promise<TagDiscoveryResult> => {
  const data = configMap.data?.[key];

  if (!data) {
    return {
      tags: [],
      error: `Key '${key}' not found in ConfigMap`,
    };
  }

  return parseRegistryForTags(data);
};
