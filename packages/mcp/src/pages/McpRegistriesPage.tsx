import React from 'react';
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Spinner,
  Alert,
  AlertVariant,
  Tab,
  Tabs,
  TabTitleText,
  Badge,
  Label,
  Stack,
  StackItem,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import {
  FolderOpenIcon,
  CodeBranchIcon,
  GlobeIcon,
  FileAltIcon,
  EditIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { useRegistryVerification } from '../hooks/useRegistryVerification';
import { useRegistryApiServers } from '../hooks/useRegistryApiServers';
import { McpRegistry } from '../types/registry';
import { McpRegistryCreateModal } from '../components/McpRegistryCreateModal';
import { McpRegistryDeleteModal } from '../components/McpRegistryDeleteModal';
import { McpServerBrowser } from '../components/McpServerBrowser';
import { McpRegistryStatusLabel } from '../components/McpRegistryStatusLabel';
import { deleteMcpRegistry } from '../api/k8s/mcp';

enum RegistryDetailsTab {
  OVERVIEW = 'overview',
  SERVERS = 'servers',
}

const McpRegistriesPage: React.FC = () => {
  const notification = useNotification();
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const [selectedNamespace, setSelectedNamespace] = React.useState<string>(
    preferredProject?.metadata.name || projects[0]?.metadata.name || '',
  );
  const [activeTabKey, setActiveTabKey] = React.useState<string>(RegistryDetailsTab.OVERVIEW);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editingRegistry, setEditingRegistry] = React.useState<McpRegistry | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingRegistry, setDeletingRegistry] = React.useState<McpRegistry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Use project name as registry name
  const registryName = selectedNamespace || undefined;

  // Fetch registry CRD from Kubernetes
  const [registries, registriesLoaded, registriesError] = useMcpRegistries(selectedNamespace || '');
  const registry = React.useMemo(() => {
    // Find any registry in the namespace that has an API endpoint
    // The registryName (project name) is used for API calls, not for finding the CRD
    return registries.find((reg) => {
      // Check if this registry has an API endpoint
      return (
        reg.status &&
        typeof reg.status === 'object' &&
        'apiStatus' in reg.status &&
        reg.status.apiStatus &&
        typeof reg.status.apiStatus === 'object' &&
        'endpoint' in reg.status.apiStatus &&
        typeof reg.status.apiStatus.endpoint === 'string'
      );
    });
  }, [registries]);

  // Verify registry exists via API
  const { exists: registryExists, loading: verifying } = useRegistryVerification(
    selectedNamespace,
    registryName,
  );

  // Fetch servers from API
  const {
    servers: apiServers,
    loading: serversLoading,
    error: serversError,
  } = useRegistryApiServers(selectedNamespace, registryName);

  // Sync selected namespace with preferred project changes
  React.useEffect(() => {
    if (preferredProject?.metadata.name && preferredProject.metadata.name !== selectedNamespace) {
      setSelectedNamespace(preferredProject.metadata.name);
    }
  }, [preferredProject, selectedNamespace]);

  const handleProjectSelection = (namespace: string) => {
    setSelectedNamespace(namespace);
    const selectedProject = projects.find((p) => p.metadata.name === namespace);
    if (selectedProject) {
      updatePreferredProject(selectedProject);
    }
  };

  const handleCreateSuccess = () => {
    // Refresh happens automatically via useK8sWatchResource
  };

  const handleEditRegistry = () => {
    if (registry) {
      setEditingRegistry(registry);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRegistry) return;

    const deletingRegistryName = deletingRegistry.metadata?.name;
    const deletingRegistryNamespace = deletingRegistry.metadata?.namespace;

    if (!deletingRegistryName || !deletingRegistryNamespace) {
      notification.error('Delete failed', 'Registry name or namespace is missing');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteMcpRegistry(deletingRegistryName, deletingRegistryNamespace);

      notification.success(
        'Registry deleted',
        `${deletingRegistryName} has been successfully deleted`,
      );

      // Close the modal
      setDeleteModalOpen(false);
      setDeletingRegistry(null);
    } catch (deleteError) {
      notification.error(
        'Registry deletion failed',
        deleteError instanceof Error ? deleteError.message : 'Unknown error occurred',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setDeletingRegistry(null);
  };

  const getSourceTypeIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'git':
        return <CodeBranchIcon />;
      case 'http':
        return <GlobeIcon />;
      case 'configmap':
        return <FileAltIcon />;
      default:
        return <GlobeIcon />;
    }
  };

  const getSourceTypeBadge = (sourceType?: string) => {
    switch (sourceType) {
      case 'git':
        return (
          <Label icon={<CodeBranchIcon />} color="blue" isCompact>
            Git Repository
          </Label>
        );
      case 'http':
        return (
          <Label icon={<GlobeIcon />} color="green" isCompact>
            HTTP Endpoint
          </Label>
        );
      case 'configmap':
        return (
          <Label icon={<FileAltIcon />} color="purple" isCompact>
            ConfigMap
          </Label>
        );
      default:
        return (
          <Label icon={<GlobeIcon />} color="grey" isCompact>
            HTTP Endpoint
          </Label>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatTimeAgo = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSyncPolicyDisplay = (): string => {
    const lastSyncTime =
      registry?.status?.syncStatus?.lastSyncTime ?? registry?.status?.lastSyncTime;
    const syncPhase = registry?.status?.syncStatus?.phase ?? registry?.status?.phase;
    const isAutoSync = registry?.spec.syncPolicy?.enabled ?? !!registry?.spec.syncPolicy?.interval;
    const interval = registry?.spec.syncPolicy?.interval || '5m';

    const configPart = isAutoSync ? `Auto sync every ${interval}` : 'Manual sync';

    let statusPart = '';
    if (lastSyncTime) {
      const timeAgo = formatTimeAgo(lastSyncTime);
      if (syncPhase === 'Ready' || syncPhase === 'Complete') {
        statusPart = `last sync succeeded ${timeAgo}`;
      } else if (syncPhase === 'Failed') {
        statusPart = `last sync failed ${timeAgo}`;
      } else {
        statusPart = `last sync ${timeAgo}`;
      }
    } else {
      statusPart = 'never synced';
    }

    return `${configPart} • ${statusPart}`;
  };

  const getSourceDisplay = (): string => {
    const sourceType = registry?.spec.source?.type;

    if (sourceType === 'git' && registry?.spec.source?.git) {
      const { repository, branch, path } = registry.spec.source.git;
      let display = repository || '';
      if (branch && branch !== 'main') {
        display += `/${branch}`;
      }
      if (path) {
        display += `/${path}`;
      }
      return display;
    }

    if (sourceType === 'configmap' && registry?.spec.source?.configmap) {
      const { name: cmName, key } = registry.spec.source.configmap;
      return `${cmName} (${key})`;
    }

    if (sourceType === 'http' && registry?.spec.source?.http) {
      return registry.spec.source.http.url || '';
    }

    return 'Not specified';
  };

  const getServerCount = () => {
    return (
      apiServers.length ||
      registry?.status?.syncStatus?.serverCount ||
      registry?.status?.serverCount ||
      0
    );
  };

  const renderOverviewTab = () => {
    const handleOpenSource = () => {
      if (registry?.spec.source?.type === 'git' && registry.spec.source.git) {
        const { repository, branch, path } = registry.spec.source.git;
        let githubUrl = repository.replace(/\.git$/, '') || '';
        if (path) {
          githubUrl = `${githubUrl}/blob/${branch || 'main'}/${path}`;
        } else {
          githubUrl = `${githubUrl}/tree/${branch || 'main'}`;
        }
        window.open(githubUrl, '_blank');
      } else if (registry?.spec.source?.type === 'configmap' && registry.spec.source.configmap) {
        const namespace = registry.metadata?.namespace;
        const configMapName = registry.spec.source.configmap.name;
        if (namespace && configMapName) {
          const consoleUrl = window.location.origin;
          const configMapUrl = `${consoleUrl}/k8s/ns/${namespace}/configmaps/${configMapName}`;
          window.open(configMapUrl, '_blank');
        }
      }
    };

    const hasSourceLink =
      (registry?.spec.source?.type === 'git' && registry.spec.source.git?.repository) ||
      (registry?.spec.source?.type === 'configmap' && registry.spec.source.configmap?.name);

    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <Stack hasGutter>
          {/* Registry Information Card */}
          <StackItem>
            <Card>
              <CardBody>
                <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
                  Registry Information
                </Title>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '200px' }}>
                  {registry?.spec.description && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Description</DescriptionListTerm>
                      <DescriptionListDescription>
                        {registry.spec.description}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}

                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      <FolderOpenIcon /> Project
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {registry?.metadata?.namespace}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Server Count</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Badge isRead>{getServerCount()}</Badge>
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Created</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatDate(registry?.metadata?.creationTimestamp)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>

          {/* Source & Sync Configuration Card */}
          <StackItem>
            <Card>
              <CardBody>
                <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
                  Source & Sync Configuration
                </Title>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '200px' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Source</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Flex
                        alignItems={{ default: 'alignItemsCenter' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>{getSourceTypeBadge(registry?.spec.source?.type)}</FlexItem>
                        <FlexItem>
                          <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                            {getSourceDisplay()}
                          </code>
                        </FlexItem>
                        {hasSourceLink && (
                          <FlexItem>
                            <Button variant="link" isInline onClick={handleOpenSource}>
                              {registry.spec.source?.type === 'git'
                                ? 'Open in Git'
                                : 'View ConfigMap'}
                            </Button>
                          </FlexItem>
                        )}
                      </Flex>
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Sync Policy</DescriptionListTerm>
                    <DescriptionListDescription>
                      {getSyncPolicyDisplay()}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    );
  };

  const handleServerSelect = (server: { name: string }) => {
    // TODO: Open server details modal
    console.log('Selected server:', server.name);
  };

  const renderServersTab = () => (
    <PageSection hasBodyWrapper={false} isFilled>
      <McpServerBrowser
        servers={apiServers}
        loading={serversLoading}
        error={serversError || undefined}
        onServerSelect={handleServerSelect}
        registry={registry}
      />
    </PageSection>
  );

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              MCP Registries
            </Title>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <strong>
              <FolderOpenIcon /> Project:
            </strong>
          </FlexItem>
          <FlexItem>
            <ProjectSelector
              namespace={selectedNamespace}
              onSelection={handleProjectSelection}
              placeholder="Select a project"
            />
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {!selectedNamespace ? (
          <Card>
            <CardBody>
              <EmptyState icon={FolderOpenIcon} headingLevel="h4" titleText="No project selected">
                <EmptyStateBody>
                  Please select a project to view MCP registries. The registry name will match the
                  project name.
                </EmptyStateBody>
              </EmptyState>
            </CardBody>
          </Card>
        ) : (
          <>
            {registriesError && (
              <Alert
                variant={AlertVariant.danger}
                title="Failed to load MCP registry"
                className="pf-u-mb-md"
              >
                {registriesError.message}
              </Alert>
            )}

            {verifying || !registriesLoaded ? (
              <Card>
                <CardBody>
                  <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-u-p-xl">
                    <FlexItem>
                      <Spinner size="lg" />
                    </FlexItem>
                    <FlexItem>
                      <div style={{ marginLeft: '1rem' }}>
                        {verifying ? 'Verifying registry...' : 'Loading registry...'}
                      </div>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            ) : registryExists === false ? (
              <Card>
                <CardBody>
                  <Alert variant={AlertVariant.info} title="No registry exists for this project">
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <InfoCircleIcon />
                      </FlexItem>
                      <FlexItem>
                        No registry exists for project &quot;{selectedNamespace}&quot;. Create a new
                        registry to get started.
                      </FlexItem>
                    </Flex>
                  </Alert>
                </CardBody>
              </Card>
            ) : registry ? (
              <>
                {/* Page Header */}
                <PageSection>
                  <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                    <FlexItem>
                      <Flex
                        alignItems={{ default: 'alignItemsCenter' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>{getSourceTypeIcon(registry.spec.source?.type)}</FlexItem>
                        <FlexItem>
                          <Title headingLevel="h1" size="2xl">
                            {registry.spec.displayName || registry.metadata?.name}
                          </Title>
                        </FlexItem>
                        <FlexItem>
                          <McpRegistryStatusLabel status={registry.status} />
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                    <FlexItem>
                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                        <FlexItem>
                          <Button
                            variant="secondary"
                            icon={<EditIcon />}
                            onClick={handleEditRegistry}
                          >
                            Edit
                          </Button>
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                  </Flex>

                  {/* Registry metadata */}
                  <Flex spaceItems={{ default: 'spaceItemsSm' }} className="pf-u-mt-sm">
                    {getSourceTypeBadge(registry.spec.source?.type)}
                    <span className="pf-u-color-200">•</span>
                    <span className="pf-u-font-weight-bold">{getServerCount()}</span>
                    <span className="pf-u-color-200">
                      {getServerCount() === 1 ? 'server' : 'servers'}
                    </span>
                    {(() => {
                      const lastSync =
                        registry.status?.syncStatus?.lastSyncTime ?? registry.status?.lastSyncTime;
                      return (
                        lastSync && (
                          <>
                            <span className="pf-u-color-200">•</span>
                            <span className="pf-u-color-200 pf-u-font-size-sm">
                              Last sync: {formatDate(lastSync)}
                            </span>
                          </>
                        )
                      );
                    })()}
                  </Flex>

                  {registry.spec.description && (
                    <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mt-sm">
                      {registry.spec.description}
                    </div>
                  )}
                </PageSection>

                {/* Tabbed Content */}
                <PageSection>
                  <Tabs
                    activeKey={activeTabKey}
                    onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
                    aria-label="Registry details tabs"
                    role="region"
                  >
                    <Tab
                      eventKey={RegistryDetailsTab.OVERVIEW}
                      title={<TabTitleText>Overview</TabTitleText>}
                      aria-label="Registry overview tab"
                    >
                      {renderOverviewTab()}
                    </Tab>
                    <Tab
                      eventKey={RegistryDetailsTab.SERVERS}
                      title={
                        <TabTitleText>
                          Servers <Badge isRead>{getServerCount()}</Badge>
                        </TabTitleText>
                      }
                      aria-label="Servers tab"
                    >
                      {renderServersTab()}
                    </Tab>
                  </Tabs>
                </PageSection>
              </>
            ) : null}
          </>
        )}
      </PageSection>
      {createModalOpen && (
        <McpRegistryCreateModal
          isOpen
          onClose={() => {
            setCreateModalOpen(false);
            setEditingRegistry(undefined);
          }}
          onSuccess={() => {
            handleCreateSuccess();
            setEditingRegistry(undefined);
          }}
          editRegistry={undefined}
        />
      )}

      {editingRegistry && (
        <McpRegistryCreateModal
          isOpen
          onClose={() => {
            setCreateModalOpen(false);
            setEditingRegistry(undefined);
          }}
          onSuccess={() => {
            handleCreateSuccess();
            setEditingRegistry(undefined);
          }}
          editRegistry={editingRegistry}
        />
      )}

      {deleteModalOpen && (
        <McpRegistryDeleteModal
          registry={deletingRegistry}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

export default McpRegistriesPage;
