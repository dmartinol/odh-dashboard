import * as React from 'react';
import { Modal, ModalBody, ModalHeader, Spinner, Flex, FlexItem } from '@patternfly/react-core';
import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';
import { McpServerDetailsModal } from './McpServerDetailsModal';
import { McpRegistry } from '../types/registry';
import { McpServerMetadata } from '../types/server';
import {
  discoverServersFromGit,
  discoverServersFromConfigMap,
  discoverServersFromHttp,
} from '../utils/registryValidation';
import useConfigMaps from '../hooks/useConfigMaps';

interface McpRegistryServerDetailsModalProps {
  onClose: () => void;
  registry: McpRegistry;
  serverName: string;
}

export const McpRegistryServerDetailsModal: React.FC<McpRegistryServerDetailsModalProps> = ({
  onClose,
  registry,
  serverName,
}) => {
  const [server, setServer] = React.useState<McpServerMetadata | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [configMaps] = useConfigMaps(registry.metadata?.namespace);

  React.useEffect(() => {
    const fetchServer = async () => {
      if (!registry.spec.source) {
        return;
      }

      setLoading(true);
      try {
        let result;

        // Extract base API URL from registry status
        const baseApiUrl = (() => {
          const apiStatus =
            registry.status && 'apiStatus' in registry.status ? registry.status.apiStatus : null;
          const hasEndpoint = (status: unknown): status is { endpoint: string } => {
            return typeof status === 'object' && status !== null && 'endpoint' in status;
          };
          if (apiStatus && hasEndpoint(apiStatus)) {
            return String(apiStatus.endpoint);
          }
          return undefined;
        })();

        if (registry.spec.source.type === 'git' && registry.spec.source.git) {
          result = await discoverServersFromGit(
            registry.spec.source.git.repository,
            registry.spec.source.git.branch || 'main',
            registry.spec.source.git.path,
            baseApiUrl,
          );
        } else if (registry.spec.source.type === 'configmap' && registry.spec.source.configmap) {
          const configMap = configMaps.find(
            (cm: ConfigMapKind) => cm.metadata.name === registry.spec.source?.configmap?.name,
          );
          if (configMap) {
            result = await discoverServersFromConfigMap(
              configMap,
              registry.spec.source.configmap.key,
              baseApiUrl,
            );
          } else {
            result = { servers: [], error: 'ConfigMap not found' };
          }
        } else if (registry.spec.source.type === 'http' && registry.spec.source.http) {
          result = await discoverServersFromHttp(registry.spec.source.http.url);
        } else {
          result = { servers: [], error: 'Unsupported registry source type' };
        }

        const foundServer = result.servers.find((s: McpServerMetadata) => s.name === serverName);
        setServer(foundServer || null);
      } catch (err) {
        console.error('Failed to discover servers:', err);
        setServer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchServer();
  }, [registry, serverName, configMaps]);

  // Show loading state
  if (loading || !server) {
    return (
      <Modal isOpen onClose={onClose} aria-labelledby="loading-server-details" variant="medium">
        <ModalHeader title="Loading server details..." />
        <ModalBody>
          <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-u-p-xl">
            <FlexItem>
              <Spinner size="lg" />
            </FlexItem>
          </Flex>
        </ModalBody>
      </Modal>
    );
  }

  return <McpServerDetailsModal isOpen onClose={onClose} server={server} />;
};
