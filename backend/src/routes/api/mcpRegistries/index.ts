import { FastifyRequest, FastifyReply } from 'fastify';
import { KubeFastifyInstance, McpRegistry } from '../../../types';
import {
  listMcpRegistries,
  getMcpRegistry,
  createMcpRegistry,
  deleteMcpRegistry,
} from './mcpRegistryUtils';
import { DEV_MODE } from '../../../utils/constants';
import http from 'http';
import https from 'https';

/**
 * Type guard to check if value is a Record (object but not array)
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Type guard to check if apiStatus has an endpoint property
 */
const hasApiStatusEndpoint = (status: unknown): status is { apiStatus: { endpoint: string } } => {
  if (!isRecord(status)) {
    return false;
  }
  if (!('apiStatus' in status)) {
    return false;
  }
  const apiStatus = status.apiStatus;
  if (!isRecord(apiStatus)) {
    return false;
  }
  if (!('endpoint' in apiStatus)) {
    return false;
  }
  return typeof apiStatus.endpoint === 'string';
};

/**
 * Normalize endpoint URL for Kubernetes internal services
 * Converts service names to FQDN format for cluster-internal resolution
 * In DEV_MODE, uses localhost with port forwarding or environment variables
 */
const normalizeEndpointUrl = (endpoint: string, namespace: string, serviceName: string): string => {
  try {
    const url = new URL(endpoint);
    const hostname = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');

    // In DEV_MODE, check for environment variable override or use localhost with port forwarding
    if (DEV_MODE) {
      // Check for environment variable override (e.g., MCP_REGISTRY_API_HOST, MCP_REGISTRY_API_PORT)
      const envHost =
        process.env[`MCP_REGISTRY_${serviceName.toUpperCase().replace(/-/g, '_')}_HOST`] ||
        process.env.MCP_REGISTRY_API_HOST;
      const envPort =
        process.env[`MCP_REGISTRY_${serviceName.toUpperCase().replace(/-/g, '_')}_PORT`] ||
        process.env.MCP_REGISTRY_API_PORT ||
        '8888';

      if (envHost) {
        return `${url.protocol}//${envHost}:${envPort}${url.pathname}${url.search}${url.hash}`;
      }

      // In DEV_MODE, if it's a service.namespace format, assume port forwarding to localhost:8888
      // User MUST run: kubectl port-forward -n <namespace> svc/<service-name> 8888:<service-port>
      // This is a general approach for testing in DEV mode - all internal services should use localhost:8888
      if (
        hostname.includes('.') &&
        !hostname.includes('.svc.cluster.local') &&
        !hostname.includes('localhost')
      ) {
        const parts = hostname.split('.');
        if (parts.length === 2) {
          // service.namespace format - use localhost:8888 for port forwarding
          // Remove trailing slash from pathname to avoid double slashes
          const pathname = url.pathname === '/' ? '' : url.pathname;
          return `${url.protocol}//localhost:8888${pathname}${url.search}${url.hash}`;
        }
      }

      // If it's already localhost or external URL, return as-is
      return endpoint;
    }

    // Production mode: convert to .svc.cluster.local format
    // Check if this looks like a Kubernetes service name (service-name.namespace format)
    // or if it's missing .svc.cluster.local
    if (hostname.includes('.') && !hostname.includes('.svc.cluster.local')) {
      // Split by dots to check if it's service.namespace format
      const parts = hostname.split('.');
      if (parts.length === 2) {
        // Likely service.namespace format, convert to FQDN
        const serviceNameFromHost = parts[0];
        const serviceNamespace = parts[1];
        // Use the provided namespace if it matches, otherwise use the one from the hostname
        const targetNamespace = serviceNamespace === namespace ? namespace : serviceNamespace;
        const normalizedHostname = `${serviceNameFromHost}.${targetNamespace}.svc.cluster.local`;
        return `${url.protocol}//${normalizedHostname}:${port}${url.pathname}${url.search}${url.hash}`;
      }
    }

    // If it already has .svc.cluster.local or is an external URL, return as-is
    return endpoint;
  } catch {
    // If URL parsing fails, try to detect service.namespace:port format
    // Pattern: http://service-name.namespace:port or service-name.namespace:port
    const servicePattern = /^(https?:\/\/)?([^:]+)\.([^:]+):(\d+)(\/.*)?$/;
    const match = endpoint.match(servicePattern);
    if (match) {
      const [, protocol = 'http://', serviceNameFromPattern, serviceNamespace, port, path = ''] =
        match;

      if (DEV_MODE) {
        // In DEV_MODE, use localhost:8888 for port forwarding
        // User MUST run: kubectl port-forward -n <namespace> svc/<service-name> 8888:<service-port>
        return `${protocol}localhost:8888${path}`;
      }

      // Production: convert to FQDN
      const targetNamespace = serviceNamespace === namespace ? namespace : serviceNamespace;
      return `${protocol}${serviceNameFromPattern}.${targetNamespace}.svc.cluster.local:${port}${path}`;
    }

    // If we can't parse it, return as-is (might be external URL or already correct)
    return endpoint;
  }
};

/**
 * Make a simple HTTP request without Kubernetes authentication
 * Used for proxying to external registry APIs that don't require K8s auth
 */
const makeSimpleHttpRequest = <T>(
  url: string,
  method: string,
  fastify: KubeFastifyInstance,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const requestModule = urlObj.protocol === 'https:' ? https : http;

      const req = requestModule.request(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
          ...(urlObj.protocol === 'https:' && DEV_MODE ? { rejectUnauthorized: false } : {}),
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (parseError) {
                fastify.log.error(
                  `Failed to parse registry API response. Error: ${parseError}, Response: ${data.substring(
                    0,
                    500,
                  )}`,
                );
                reject(new Error('Failed to parse JSON response from registry API'));
              }
            } else {
              fastify.log.error(
                `Registry API returned status ${res.statusCode}. Response: ${data.substring(
                  0,
                  500,
                )}`,
              );
              reject(
                new Error(`HTTP ${res.statusCode} ${res.statusMessage}: ${data.substring(0, 100)}`),
              );
            }
          });
        },
      );

      req.on('error', (err) => {
        fastify.log.error(`HTTP request error to ${url}: ${err.message}`);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        fastify.log.error(`HTTP request to ${url} timed out.`);
        reject(new Error('Request to registry API timed out'));
      });

      req.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
};

/**
 * Extract error message from various error types
 */
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error)) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return JSON.stringify(error);
  }
  return String(error);
};

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  // List MCP registries for a specific namespace
  fastify.get(
    '/:namespace',
    async (
      request: FastifyRequest<{
        Params: { namespace: string };
      }>,
    ) => {
      const { namespace } = request.params;
      try {
        return await listMcpRegistries(fastify, namespace);
      } catch (e) {
        fastify.log.error(
          `MCP Registries could not be listed in namespace ${namespace}, ${e.message}`,
        );
        // Return empty list on error for now (until MCP CRD is available)
        return {
          apiVersion: 'toolhive.stacklok.dev/v1alpha1',
          kind: 'McpRegistryList',
          metadata: {
            resourceVersion: '1',
          },
          items: [],
        };
      }
    },
  );

  // Get a specific MCP registry
  fastify.get(
    '/:namespace/:registryName',
    async (
      request: FastifyRequest<{
        Params: { namespace: string; registryName: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, registryName } = request.params;
      try {
        return await getMcpRegistry(fastify, registryName, namespace);
      } catch (e) {
        fastify.log.error(
          `MCP Registry ${registryName} could not be read from namespace ${namespace}, ${e.message}`,
        );
        reply.code(404).send({ error: 'Registry not found' });
      }
    },
  );

  // Create a new MCP registry
  fastify.post(
    '/:namespace',
    async (
      request: FastifyRequest<{
        Params: { namespace: string };
        Body: McpRegistry;
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace } = request.params;
      const registry = request.body;
      try {
        return await createMcpRegistry(fastify, registry, namespace);
      } catch (e) {
        fastify.log.error(
          `MCP Registry could not be created in namespace ${namespace}, ${e.message}`,
        );
        reply.code(500).send({ error: 'Failed to create registry' });
      }
    },
  );

  // Delete an MCP registry
  fastify.delete(
    '/:namespace/:registryName',
    async (
      request: FastifyRequest<{
        Params: { namespace: string; registryName: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, registryName } = request.params;
      try {
        return await deleteMcpRegistry(fastify, registryName, namespace);
      } catch (e) {
        fastify.log.error(
          `MCP Registry ${registryName} could not be deleted from namespace ${namespace}, ${e.message}`,
        );
        reply.code(500).send({ error: 'Failed to delete registry' });
      }
    },
  );

  /**
   * Verify registry exists via MCP registry API
   * GET /api/mcpRegistries/:namespace/:registryName/verify
   * Proxies to: {endpoint}/extension/v0/registries/{registryName}
   * Note: registryName is the name in the API (typically project name),
   * not necessarily the MCPRegistry CRD name. We find any MCPRegistry CRD in the namespace
   * to get the API endpoint.
   */
  fastify.get(
    '/:namespace/:registryName/verify',
    async (
      request: FastifyRequest<{
        Params: { namespace: string; registryName: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, registryName } = request.params;

      try {
        // Find any MCPRegistry CRD in the namespace to get the API endpoint
        // The registryName parameter is the name in the API, not the CRD name
        const registries = await listMcpRegistries(fastify, namespace);
        const registry = registries.items.find((reg) => {
          // Check if this registry has an API endpoint
          return hasApiStatusEndpoint(reg.status);
        });

        if (!registry) {
          reply.code(404).send({
            exists: false,
            error: 'No registry with API endpoint found',
            message: `No MCPRegistry with API endpoint found in namespace ${namespace}`,
          });
          return;
        }

        // Use type guard to safely extract endpoint
        if (!hasApiStatusEndpoint(registry.status)) {
          reply.code(404).send({
            error: 'Registry API endpoint not available',
            message: `MCPRegistry in namespace ${namespace} has no API endpoint configured`,
          });
          return;
        }

        let endpoint = registry.status.apiStatus.endpoint;

        // Normalize the endpoint URL for Kubernetes internal services
        endpoint = normalizeEndpointUrl(endpoint, namespace, registry.metadata?.name || 'registry');
        fastify.log.info(
          `Normalized endpoint for verification: ${endpoint} (original: ${registry.status.apiStatus.endpoint})`,
        );

        // Construct the registry API URL
        // registryName is the name in the API (e.g., project name), not the CRD name
        const registryApiUrl = `${endpoint}/extension/v0/registries/${encodeURIComponent(
          registryName,
        )}`;
        fastify.log.info(`Verifying registry existence at: ${registryApiUrl}`);

        // Make a simple HTTP request to the registry API
        const response = await makeSimpleHttpRequest<unknown>(registryApiUrl, 'GET', fastify);

        reply.send({ exists: true, registry: response });
      } catch (e) {
        const errorMessage = extractErrorMessage(e);
        fastify.log.error(
          `Failed to verify registry ${registryName} in namespace ${namespace}: ${errorMessage}`,
        );

        // If it's a 404, registry doesn't exist
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          reply.code(404).send({
            exists: false,
            error: 'Registry not found',
            message: `Registry ${registryName} does not exist in the registry API`,
          });
          return;
        }

        // Other errors
        reply.code(500).send({
          exists: false,
          error: 'Failed to verify registry',
          message: errorMessage,
        });
      }
    },
  );

  /**
   * Proxy request to MCP registry API to fetch servers
   * GET /api/mcpRegistries/:namespace/:registryName/servers
   * Proxies to: {endpoint}/registry/{registryName}/v0.1/servers
   * Supports pagination via query parameters: cursor, limit
   * Note: registryName is the name in the API (typically project name),
   * not necessarily the MCPRegistry CRD name. We find any MCPRegistry CRD in the namespace
   * to get the API endpoint.
   *
   * Query Parameters:
   * - cursor: Optional cursor for pagination (opaque string from previous response)
   * - limit: Optional limit for page size (default: API default, typically 50)
   */
  fastify.get(
    '/:namespace/:registryName/servers',
    async (
      request: FastifyRequest<{
        Params: { namespace: string; registryName: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, registryName } = request.params;
      const { cursor, limit } = request.query;

      try {
        // Find any MCPRegistry CRD in the namespace to get the API endpoint
        // The registryName parameter is the name in the API, not the CRD name
        const registries = await listMcpRegistries(fastify, namespace);
        const registry = registries.items.find((reg) => {
          // Check if this registry has an API endpoint
          return hasApiStatusEndpoint(reg.status);
        });

        if (!registry) {
          reply.code(404).send({
            error: 'No registry with API endpoint found',
            message: `No MCPRegistry with API endpoint found in namespace ${namespace}`,
          });
          return;
        }

        // Use type guard to safely extract endpoint
        if (!hasApiStatusEndpoint(registry.status)) {
          reply.code(404).send({
            error: 'Registry API endpoint not available',
            message: `MCPRegistry in namespace ${namespace} has no API endpoint configured`,
          });
          return;
        }

        let endpoint = registry.status.apiStatus.endpoint;

        // Normalize the endpoint URL for Kubernetes internal services
        endpoint = normalizeEndpointUrl(endpoint, namespace, registry.metadata?.name || 'registry');
        fastify.log.info(
          `Normalized endpoint for servers: ${endpoint} (original: ${registry.status.apiStatus.endpoint})`,
        );

        // Construct the registry API URL with pagination parameters
        // registryName is the name in the API (e.g., project name), not the CRD name
        const url = new URL(
          `${endpoint}/registry/${encodeURIComponent(registryName)}/v0.1/servers`,
        );
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }
        if (limit) {
          url.searchParams.set('limit', limit);
        }
        const registryApiUrl = url.href;
        fastify.log.info(
          `Fetching servers from: ${registryApiUrl} (cursor: ${cursor || 'none'}, limit: ${
            limit || 'default'
          })`,
        );

        // Make a simple HTTP request to the registry API
        const response = await makeSimpleHttpRequest<unknown>(registryApiUrl, 'GET', fastify);

        reply.send(response);
      } catch (e) {
        const errorMessage = extractErrorMessage(e);
        fastify.log.error(
          `Failed to fetch servers from registry ${registryName} in namespace ${namespace}: ${errorMessage}`,
        );
        reply.code(500).send({
          error: 'Failed to fetch servers',
          message: errorMessage,
        });
      }
    },
  );
};
