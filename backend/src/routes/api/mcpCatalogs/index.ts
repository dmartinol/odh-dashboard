import { FastifyRequest, FastifyReply } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { getMcpRegistry } from '../mcpRegistries/mcpRegistryUtils';
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
 * Used for internal/external services that don't require K8s auth
 */
const makeSimpleHttpRequest = (url: string, timeout = 30000): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const defaultPort = isHttps ? 443 : 80;
      const port = urlObj.port ? parseInt(urlObj.port, 10) : defaultPort;

      const requestOptions = {
        hostname: urlObj.hostname,
        port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
        ...(isHttps && DEV_MODE ? { rejectUnauthorized: false } : {}),
      };

      const requestModule = isHttps ? https : http;
      const req = requestModule.request(requestOptions, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(
              new Error(`HTTP ${res.statusCode} ${res.statusMessage}: ${data.substring(0, 200)}`),
            );
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`HTTP request failed: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
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
  /**
   * Proxy request to MCP registry API to fetch registry list
   * GET /api/mcpCatalogs/:namespace/:registryName
   * Proxies to: {endpoint}/extension/v0/registries
   */
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
        // Get the MCPRegistry to extract the API endpoint
        const registry = await getMcpRegistry(fastify, registryName, namespace);

        // Use type guard to safely extract endpoint
        if (!hasApiStatusEndpoint(registry.status)) {
          reply.code(404).send({
            error: 'Registry API endpoint not available',
            message: `MCPRegistry ${registryName} in namespace ${namespace} has no API endpoint configured`,
          });
          return;
        }

        let endpoint = registry.status.apiStatus.endpoint;

        // Normalize the endpoint URL for Kubernetes internal services
        endpoint = normalizeEndpointUrl(endpoint, namespace, registryName);
        fastify.log.info(
          `Normalized endpoint: ${endpoint} (original: ${registry.status.apiStatus.endpoint})`,
        );

        // Construct the registry API URL
        const registryApiUrl = `${endpoint}/extension/v0/registries`;
        fastify.log.info(`Fetching registry list from: ${registryApiUrl}`);

        // Make a simple HTTP request without Kubernetes authentication
        const responseText = await makeSimpleHttpRequest(registryApiUrl);

        fastify.log.info(`Registry API response length: ${responseText.length}`);

        // Parse JSON response
        let response: unknown;
        try {
          if (!responseText || responseText.trim().length === 0) {
            throw new Error('Empty response from registry API');
          }
          response = JSON.parse(responseText);
        } catch (parseError) {
          fastify.log.error(
            `Failed to parse registry API response. Error: ${parseError}, Response: ${responseText.substring(
              0,
              500,
            )}`,
          );
          reply.code(500).send({
            error: 'Invalid response from registry API',
            message: `Failed to parse JSON response: ${
              parseError instanceof Error ? parseError.message : String(parseError)
            }`,
          });
          return;
        }

        reply.send(response);
      } catch (e) {
        const errorMessage = extractErrorMessage(e);
        fastify.log.error(
          `Failed to fetch registry list from MCPRegistry ${registryName} in namespace ${namespace}: ${errorMessage}`,
        );
        reply.code(500).send({
          error: 'Failed to fetch registry list',
          message: errorMessage,
        });
      }
    },
  );

  /**
   * Proxy request to MCP registry API to fetch registry details
   * GET /api/mcpCatalogs/:namespace/:registryName/:registryNameInCatalog
   * Proxies to: {endpoint}/extension/v0/registries/{registryNameInCatalog}
   */
  fastify.get(
    '/:namespace/:registryName/:registryNameInCatalog',
    async (
      request: FastifyRequest<{
        Params: {
          namespace: string;
          registryName: string;
          registryNameInCatalog: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { namespace, registryName, registryNameInCatalog } = request.params;

      try {
        // Get the MCPRegistry to extract the API endpoint
        const registry = await getMcpRegistry(fastify, registryName, namespace);

        // Use type guard to safely extract endpoint
        if (!hasApiStatusEndpoint(registry.status)) {
          reply.code(404).send({
            error: 'Registry API endpoint not available',
            message: `MCPRegistry ${registryName} in namespace ${namespace} has no API endpoint configured`,
          });
          return;
        }

        let endpoint = registry.status.apiStatus.endpoint;

        // Normalize the endpoint URL for Kubernetes internal services
        endpoint = normalizeEndpointUrl(endpoint, namespace, registryName);

        // Construct the registry API URL
        const registryApiUrl = `${endpoint}/extension/v0/registries/${encodeURIComponent(
          registryNameInCatalog,
        )}`;

        // Make a simple HTTP request without Kubernetes authentication
        const responseText = await makeSimpleHttpRequest(registryApiUrl);

        // Parse JSON response
        let response: unknown;
        try {
          if (!responseText || responseText.trim().length === 0) {
            throw new Error('Empty response from registry API');
          }
          response = JSON.parse(responseText);
        } catch (parseError) {
          fastify.log.error(
            `Failed to parse registry API response. Error: ${parseError}, Response: ${responseText.substring(
              0,
              500,
            )}`,
          );
          reply.code(500).send({
            error: 'Invalid response from registry API',
            message: `Failed to parse JSON response: ${
              parseError instanceof Error ? parseError.message : String(parseError)
            }`,
          });
          return;
        }

        reply.send(response);
      } catch (e) {
        const errorMessage = extractErrorMessage(e);
        fastify.log.error(
          `Failed to fetch registry details for ${registryNameInCatalog} from MCPRegistry ${registryName} in namespace ${namespace}: ${errorMessage}`,
        );
        reply.code(500).send({
          error: 'Failed to fetch registry details',
          message: errorMessage,
        });
      }
    },
  );
};
