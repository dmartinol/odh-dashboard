import { FastifyRequest, FastifyReply } from 'fastify';
import { KubeFastifyInstance, McpRegistry } from '../../../types';
import {
  listMcpRegistries,
  getMcpRegistry,
  createMcpRegistry,
  deleteMcpRegistry,
} from './mcpRegistryUtils';

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
};
