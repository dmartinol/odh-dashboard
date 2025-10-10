import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Flex,
  FlexItem,
  MenuToggle,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';
import { useMcpServers } from '../hooks/useMcpServers';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { McpServersTable } from '../components/McpServersTable';
import { McpServersToolbar } from '../components/McpServersToolbar';
import { McpDeployedServerDetailsModal } from '../components/McpDeployedServerDetailsModal';
import { McpServerRegisterModal } from '../components/McpServerRegisterModal';
import { McpServerDeleteModal } from '../components/McpServerDeleteModal';
import { McpServer } from '../types/server';
import { patchMcpServer, deleteMcpServer } from '../api/k8s/mcp';

const McpServersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);

  // State for filters
  const [searchValue, setSearchValue] = React.useState('');
  const [selectedRegistry, setSelectedRegistry] = React.useState('all');
  const [selectedTransport, setSelectedTransport] = React.useState('all');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [isNamespaceOpen, setIsNamespaceOpen] = React.useState(false);

  // State for modals and selected server
  const [selectedServer, setSelectedServer] = React.useState<McpServer | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [registerModalOpen, setRegisterModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  // Fetch servers and registries
  const [servers, serversLoaded, serversError] = useMcpServers(
    preferredProject?.metadata.name || '',
  );
  const [registries, registriesLoaded, registriesError] = useMcpRegistries(
    preferredProject?.metadata.name || '',
  );

  // Initialize filters from URL parameters
  React.useEffect(() => {
    const registryParam = searchParams.get('registry');
    const namespaceParam = searchParams.get('namespace');

    if (registryParam) {
      setSelectedRegistry(registryParam);
    }

    if (namespaceParam && namespaceParam !== preferredProject?.metadata.name) {
      const targetProject = projects.find((p) => p.metadata.name === namespaceParam);
      if (targetProject) {
        updatePreferredProject(targetProject);
      }
    }
  }, [searchParams, preferredProject, projects, updatePreferredProject]);

  // Helper function to get linked registry for a server
  const getLinkedRegistry = (server: McpServer) => {
    const registryName = server.metadata?.labels?.['toolhive.stacklok.io/registry-name'];
    const registryNamespace = server.metadata?.labels?.['toolhive.stacklok.io/registry-namespace'];

    if (!registryName || !registryNamespace) {
      return undefined;
    }

    return registries.find(
      (r) => r.metadata?.name === registryName && r.metadata.namespace === registryNamespace,
    );
  };

  // Filter servers based on search and filters
  const filteredServers = React.useMemo(() => {
    return servers.filter((server) => {
      // Name search filter
      if (searchValue) {
        const serverName = server.metadata?.name?.toLowerCase() || '';
        if (!serverName.includes(searchValue.toLowerCase())) {
          return false;
        }
      }

      // Registry filter
      if (selectedRegistry !== 'all') {
        const linkedRegistry = getLinkedRegistry(server);
        if (selectedRegistry === 'unregistered') {
          if (linkedRegistry) {
            return false;
          }
        } else if (linkedRegistry?.metadata?.name !== selectedRegistry) {
          return false;
        }
      }

      // Transport filter
      if (selectedTransport !== 'all' && server.spec.transport !== selectedTransport) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const serverStatus = server.status?.phase || 'Unknown';
        if (serverStatus !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [servers, searchValue, selectedRegistry, selectedTransport, selectedStatus]);

  const handleCopyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint).catch((err) => {
      console.error('Failed to copy endpoint:', err);
    });
  };

  const handleNamespaceSelect = (_event: unknown, value: string | number | undefined) => {
    const namespace = String(value);
    const targetProject = projects.find((p) => p.metadata.name === namespace);
    if (targetProject) {
      updatePreferredProject(targetProject);
      setIsNamespaceOpen(false);
    }
  };

  // Server action handlers
  const handleServerClick = (server: McpServer) => {
    setSelectedServer(server);
    setDetailsModalOpen(true);
  };

  const handleServerRegister = (server: McpServer) => {
    setSelectedServer(server);
    setRegisterModalOpen(true);
  };

  const handleServerUnregister = async (server: McpServer) => {
    if (!preferredProject?.metadata.name || !server.metadata?.name) {
      return;
    }

    try {
      // Remove registry labels by setting them to null
      const currentLabels = { ...server.metadata.labels };
      delete currentLabels['toolhive.stacklok.io/registry-name'];
      delete currentLabels['toolhive.stacklok.io/registry-namespace'];
      delete currentLabels['toolhive.stacklok.io/server-registry-name'];

      await patchMcpServer(server.metadata.name, preferredProject.metadata.name, {
        metadata: { labels: currentLabels },
      });
    } catch (err) {
      console.error('Failed to unregister server:', err);
    }
  };

  const handleServerDelete = (server: McpServer) => {
    setSelectedServer(server);
    setDeleteModalOpen(true);
  };

  const handleRegisterConfirm = async (
    serverId: string,
    serverNamespace: string,
    registryName: string,
    registryNamespace: string,
    serverNameInRegistry: string,
  ) => {
    try {
      // Get current server to preserve existing labels
      const currentServer = servers.find((s) => s.metadata?.name === serverId);
      const currentLabels = { ...currentServer?.metadata?.labels };

      // Add registry labels
      const labels = {
        ...currentLabels,
        'toolhive.stacklok.io/registry-name': registryName,
        'toolhive.stacklok.io/registry-namespace': registryNamespace,
        'toolhive.stacklok.io/server-registry-name': serverNameInRegistry,
      };

      await patchMcpServer(serverId, serverNamespace, { metadata: { labels } });
    } catch (err) {
      console.error('Failed to register server:', err);
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedServer || !preferredProject?.metadata.name) {
      return;
    }

    try {
      await deleteMcpServer(selectedServer.metadata?.name || '', preferredProject.metadata.name);
    } catch (err) {
      console.error('Failed to delete server:', err);
      throw err;
    }
  };

  // Get linked registry for selected server
  const getLinkedRegistryForServer = (server: McpServer | null) => {
    if (!server) {
      return undefined;
    }
    const registryName = server.metadata?.labels?.['toolhive.stacklok.io/registry-name'];
    const registryNamespace = server.metadata?.labels?.['toolhive.stacklok.io/registry-namespace'];

    if (!registryName || !registryNamespace) {
      return undefined;
    }

    return registries.find(
      (r) => r.metadata?.name === registryName && r.metadata.namespace === registryNamespace,
    );
  };

  // Show loading state
  if (!serversLoaded || !registriesLoaded) {
    return (
      <PageSection>
        <Card>
          <CardBody>
            <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-u-p-xl">
              <FlexItem>
                <Spinner size="lg" />
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </PageSection>
    );
  }

  // Show error state
  if (serversError || registriesError) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.danger} title="Failed to load servers">
          {serversError?.message || registriesError?.message}
        </Alert>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              MCP Servers
            </Title>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
              {/* Namespace Selector */}
              <FlexItem>
                <Flex
                  spaceItems={{ default: 'spaceItemsSm' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem>
                    <strong>Namespace:</strong>
                  </FlexItem>
                  <FlexItem>
                    <Select
                      id="namespace-select"
                      isOpen={isNamespaceOpen}
                      selected={preferredProject?.metadata.name}
                      onSelect={handleNamespaceSelect}
                      onOpenChange={(isOpen) => setIsNamespaceOpen(isOpen)}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsNamespaceOpen(!isNamespaceOpen)}
                          isExpanded={isNamespaceOpen}
                          style={{ minWidth: '200px' }}
                        >
                          {preferredProject?.metadata.name || 'Select namespace'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {projects.map((project) => (
                          <SelectOption key={project.metadata.name} value={project.metadata.name}>
                            {project.metadata.name}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </FlexItem>
                </Flex>
              </FlexItem>

              {/* Filters Toolbar */}
              <FlexItem>
                <McpServersToolbar
                  searchValue={searchValue}
                  onSearchChange={setSearchValue}
                  selectedRegistry={selectedRegistry}
                  onRegistryChange={setSelectedRegistry}
                  selectedTransport={selectedTransport}
                  onTransportChange={setSelectedTransport}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  registries={registries}
                />
              </FlexItem>

              {/* Servers Table */}
              <FlexItem>
                <McpServersTable
                  servers={filteredServers}
                  registries={registries}
                  onCopyEndpoint={handleCopyEndpoint}
                  onServerClick={handleServerClick}
                  onServerRegister={handleServerRegister}
                  onServerUnregister={handleServerUnregister}
                  onServerDelete={handleServerDelete}
                />
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </PageSection>

      {/* Modals */}
      {selectedServer && detailsModalOpen && (
        <McpDeployedServerDetailsModal
          onClose={() => setDetailsModalOpen(false)}
          server={selectedServer}
          linkedRegistry={getLinkedRegistryForServer(selectedServer)}
        />
      )}

      {selectedServer && registerModalOpen && (
        <McpServerRegisterModal
          onClose={() => setRegisterModalOpen(false)}
          server={selectedServer}
          registries={registries}
          onRegister={handleRegisterConfirm}
        />
      )}

      {selectedServer && deleteModalOpen && (
        <McpServerDeleteModal
          onClose={() => setDeleteModalOpen(false)}
          server={selectedServer}
          onDelete={handleDeleteConfirm}
        />
      )}
    </>
  );
};

export default McpServersPage;
