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
  SyncIcon,
} from '@patternfly/react-icons';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { useRegistryVerification } from '../hooks/useRegistryVerification';
import { useRegistryApiServers } from '../hooks/useRegistryApiServers';
import { fetchRegistryList } from '../api/catalog';
import { RegistryListItem } from '../types/catalog';
import { unregisterAllServerVersions } from '../api/registryApi';
import { RegistryApiRegistryResponse } from '../types/registryApi';
import { McpRegistry } from '../types/registry';
import { McpRegistryCreateModal } from '../components/McpRegistryCreateModal';
import { McpRegistryDeleteModal } from '../components/McpRegistryDeleteModal';
import { McpDeploymentRestartModal } from '../components/McpDeploymentRestartModal';
import { McpServersTab } from '../components/McpServersTab';
import { McpRegistryStatusLabel } from '../components/McpRegistryStatusLabel';
import { deleteMcpRegistry, createManagedRegistryEntry, deleteDeployment } from '../api/k8s/mcp';

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
  const [editingRegistry, setEditingRegistry] = React.useState<McpRegistry | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingRegistry, setDeletingRegistry] = React.useState<McpRegistry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [restartModalOpen, setRestartModalOpen] = React.useState(false);
  const [pendingRestartInfo, setPendingRestartInfo] = React.useState<{
    deploymentName: string;
    namespace: string;
  } | null>(null);
  const [isRestarting, setIsRestarting] = React.useState(false);

  // Use project name as registry name
  const registryName = selectedNamespace || undefined;

  // Fetch registry CRD from Kubernetes
  const [registries, registriesLoaded, registriesError] = useMcpRegistries(selectedNamespace || '');
  // Also fetch all registries to find MCPRegistry instances for managed registry creation
  const [allRegistries, allRegistriesLoaded] = useMcpRegistries('');

  // Find any registry CRD that has an API endpoint (used for API calls)
  const registryWithEndpoint = React.useMemo(() => {
    // Find any registry in any namespace that has an API endpoint
    // This is used to get the API endpoint for MANAGED registries
    return allRegistries.find((reg) => {
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
  }, [allRegistries]);

  // Find registry CRD in the selected namespace (for CRD-based registries)
  const registry = React.useMemo(() => {
    return registries.find((reg) => {
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

  // Fetch all registries from API and find MANAGED registry matching selected project
  const [managedRegistry, setManagedRegistry] = React.useState<RegistryListItem | null>(null);
  const [managedRegistryDetails, setManagedRegistryDetails] =
    React.useState<RegistryApiRegistryResponse | null>(null);
  const [loadingManagedRegistry, setLoadingManagedRegistry] = React.useState(false);

  // Verify registry exists via API (for CRD-based registries)
  // Only verify if we have a registry CRD in the selected namespace, otherwise rely on MANAGED registry fetch
  const shouldVerify = React.useMemo(() => {
    return !!registry && !!selectedNamespace && !!registryName;
  }, [registry, selectedNamespace, registryName]);

  const {
    exists: registryExists,
    registry: apiRegistry,
    loading: verifying,
    refetch: refetchVerification,
  } = useRegistryVerification(
    shouldVerify ? selectedNamespace : undefined,
    shouldVerify ? registryName : undefined,
  );

  // Fetch MANAGED registries from API when a project is selected and we have a registry with endpoint
  React.useEffect(() => {
    if (!selectedNamespace || !registryWithEndpoint || !allRegistriesLoaded) {
      setManagedRegistry(null);
      setManagedRegistryDetails(null);
      setLoadingManagedRegistry(false);
      return;
    }

    const fetchManagedRegistries = async () => {
      setLoadingManagedRegistry(true);

      try {
        const registryNamespace = registryWithEndpoint.metadata?.namespace || '';
        const mcpRegistryName = registryWithEndpoint.metadata?.name || '';

        // Fetch all registries from the API
        const registryList = await fetchRegistryList(registryNamespace, mcpRegistryName);

        // Find MANAGED registry matching the selected project name
        // Note: KUBERNETES registries should be handled via CRD, not API list
        const foundManagedRegistry = registryList.registries.find(
          (reg: RegistryListItem) => reg.type === 'MANAGED' && reg.name === selectedNamespace,
        );

        if (foundManagedRegistry) {
          setManagedRegistry(foundManagedRegistry);
          // For MANAGED registries, use the list item data directly
          // We don't need to verify via the verify endpoint since we already found it in the list
          setManagedRegistryDetails({
            name: foundManagedRegistry.name,
            type: foundManagedRegistry.type,
            syncStatus: foundManagedRegistry.syncStatus,
            createdAt: foundManagedRegistry.createdAt,
            updatedAt: foundManagedRegistry.updatedAt,
          });
        } else {
          setManagedRegistry(null);
          setManagedRegistryDetails(null);
        }
      } catch (error) {
        console.error('Failed to fetch MANAGED registries:', error);
        setManagedRegistry(null);
        setManagedRegistryDetails(null);
      } finally {
        setLoadingManagedRegistry(false);
      }
    };

    fetchManagedRegistries();
  }, [selectedNamespace, registryWithEndpoint, allRegistriesLoaded]);

  // Determine which registry to display: CRD-based or MANAGED
  const displayedRegistry = React.useMemo(() => {
    // Only show CRD-based registry if verification confirms it exists
    // (registry CRD might exist in the namespace, but the actual registry with that name might not)
    if (registry && shouldVerify && registryExists === true) {
      return { type: 'crd' as const, registry };
    }
    // Show MANAGED registry if we have the list item, even without full details
    if (managedRegistry) {
      return {
        type: 'managed' as const,
        registry: managedRegistryDetails || {
          name: managedRegistry.name,
          type: managedRegistry.type,
          syncStatus: managedRegistry.syncStatus,
          createdAt: managedRegistry.createdAt,
          updatedAt: managedRegistry.updatedAt,
        },
        listItem: managedRegistry,
      };
    }
    return null;
  }, [registry, shouldVerify, registryExists, managedRegistry, managedRegistryDetails]);

  // Fetch servers from API
  // For MANAGED registries, we need to use the registryWithEndpoint's namespace for API calls
  const apiRegistryNamespace = registryWithEndpoint?.metadata?.namespace || selectedNamespace;
  const {
    servers: apiServers,
    loading: serversLoading,
    error: serversError,
    refetch: refetchServers,
  } = useRegistryApiServers(apiRegistryNamespace, registryName);

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

  const handleCreateManagedRegistry = async () => {
    if (!selectedNamespace) {
      notification.error('Create failed', 'No project selected');
      return;
    }

    try {
      // Wait for registries to load
      if (!allRegistriesLoaded) {
        notification.error('Create failed', 'Unable to check for existing MCPRegistry instances');
        return;
      }

      if (allRegistries.length === 0) {
        notification.error(
          'Create failed',
          'No MCPRegistry instance found. Please create an MCPRegistry first.',
        );
        return;
      }

      if (allRegistries.length > 1) {
        notification.error(
          'Create failed',
          `Multiple MCPRegistry instances found (${allRegistries.length}). Exactly one instance is required.`,
        );
        return;
      }

      // Get the single MCPRegistry instance
      const mcpRegistry = allRegistries[0];
      const mcpRegistryName = mcpRegistry.metadata?.name;
      const registryNamespace = mcpRegistry.metadata?.namespace;

      if (!mcpRegistryName || !registryNamespace) {
        notification.error('Create failed', 'MCPRegistry instance is missing name or namespace');
        return;
      }

      // Create managed registry entry (will check for duplicates in the ConfigMap)
      await createManagedRegistryEntry(selectedNamespace, mcpRegistryName, registryNamespace);

      // Show restart confirmation dialog
      // mcpRegistryName is guaranteed to be defined here due to the check above
      const deploymentName = `${mcpRegistryName}-api`;
      setPendingRestartInfo({
        deploymentName,
        namespace: registryNamespace,
      });
      setRestartModalOpen(true);
    } catch (error) {
      notification.error(
        'Create failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
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

  const handleConfirmRestart = async () => {
    if (!pendingRestartInfo) {
      return;
    }

    setIsRestarting(true);
    try {
      // Delete the deployment (operator will recreate it)
      await deleteDeployment(pendingRestartInfo.deploymentName, pendingRestartInfo.namespace);

      notification.success(
        'Registry created',
        `Managed registry entry for project "${selectedNamespace}" has been created successfully. ` +
          `The registry API deployment is being restarted.`,
      );

      // Refresh registry data
      refetchVerification();

      // Close modal and reset state
      setRestartModalOpen(false);
      setPendingRestartInfo(null);
    } catch (error) {
      // Log warning but don't fail - deployment may not exist or already be deleted
      console.warn('Failed to delete deployment:', error);
      notification.warning(
        'Deployment restart skipped',
        `Registry entry created successfully, but deployment restart failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. ` + `The deployment may need to be restarted manually.`,
      );
      // Still close modal and refresh
      setRestartModalOpen(false);
      setPendingRestartInfo(null);
      refetchVerification();
    } finally {
      setIsRestarting(false);
    }
  };

  const handleCancelRestart = () => {
    if (!isRestarting) {
      setRestartModalOpen(false);
      setPendingRestartInfo(null);
      // Still show success for registry creation
      notification.success(
        'Registry created',
        `Managed registry entry for project "${selectedNamespace}" has been created successfully. ` +
          `Please restart the deployment "${
            pendingRestartInfo?.deploymentName || 'unknown'
          }" manually to apply changes.`,
      );
      refetchVerification();
    }
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
    const currentRegistry = displayedRegistry?.type === 'crd' ? displayedRegistry.registry : null;
    const sourceType = currentRegistry?.spec.source?.type;

    if (sourceType === 'git' && currentRegistry?.spec.source?.git) {
      const { repository, branch, path } = currentRegistry.spec.source.git;
      let display = repository || '';
      if (branch && branch !== 'main') {
        display += `/${branch}`;
      }
      if (path) {
        display += `/${path}`;
      }
      return display;
    }

    if (sourceType === 'configmap' && currentRegistry?.spec.source?.configmap) {
      const { name: cmName, key } = currentRegistry.spec.source.configmap;
      return `${cmName} (${key})`;
    }

    if (sourceType === 'http' && currentRegistry?.spec.source?.http) {
      return currentRegistry.spec.source.http.url || '';
    }

    return 'Not specified';
  };

  const getServerCount = () => {
    return (
      apiServers.length ||
      registry?.status?.syncStatus?.serverCount ||
      registry?.status?.serverCount ||
      apiRegistry?.syncStatus?.serverCount ||
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
                  {(() => {
                    const description =
                      displayedRegistry?.type === 'crd'
                        ? displayedRegistry.registry.spec.description
                        : displayedRegistry?.type === 'managed'
                        ? typeof displayedRegistry.registry.description === 'string'
                          ? displayedRegistry.registry.description
                          : null
                        : null;
                    return description ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Description</DescriptionListTerm>
                        <DescriptionListDescription>{description}</DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null;
                  })()}

                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      <FolderOpenIcon /> Project
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {displayedRegistry?.type === 'crd'
                        ? displayedRegistry.registry.metadata?.namespace
                        : selectedNamespace}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {displayedRegistry?.type === 'managed' && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Type</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label icon={<FileAltIcon />} color="purple" isCompact>
                          Managed Registry
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}

                  <DescriptionListGroup>
                    <DescriptionListTerm>Server Count</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Badge isRead>{getServerCount()}</Badge>
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Created</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatDate(
                        displayedRegistry?.type === 'crd'
                          ? displayedRegistry.registry.metadata?.creationTimestamp
                          : displayedRegistry?.type === 'managed'
                          ? displayedRegistry.registry.createdAt
                          : undefined,
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>

          {/* Source & Sync Configuration Card - Only show for CRD-based registries */}
          {displayedRegistry?.type === 'crd' && (
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
                          <FlexItem>
                            {getSourceTypeBadge(displayedRegistry.registry.spec.source?.type)}
                          </FlexItem>
                          <FlexItem>
                            <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                              {getSourceDisplay()}
                            </code>
                          </FlexItem>
                          {hasSourceLink && (
                            <FlexItem>
                              <Button variant="link" isInline onClick={handleOpenSource}>
                                {displayedRegistry.registry.spec.source?.type === 'git'
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
          )}

          {/* Managed Registry Info Card */}
          {displayedRegistry?.type === 'managed' && (
            <StackItem>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
                    Managed Registry Information
                  </Title>
                  <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '200px' }}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Registry Name</DescriptionListTerm>
                      <DescriptionListDescription>
                        {(typeof displayedRegistry.registry.name === 'string'
                          ? displayedRegistry.registry.name
                          : null) || selectedNamespace}
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    {displayedRegistry.registry.syncStatus && (
                      <>
                        {displayedRegistry.registry.syncStatus.phase && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Status</DescriptionListTerm>
                            <DescriptionListDescription>
                              <Label
                                color={
                                  displayedRegistry.registry.syncStatus.phase === 'Ready' ||
                                  displayedRegistry.registry.syncStatus.phase === 'Complete'
                                    ? 'green'
                                    : displayedRegistry.registry.syncStatus.phase === 'Failed'
                                    ? 'red'
                                    : 'blue'
                                }
                                isCompact
                              >
                                {displayedRegistry.registry.syncStatus.phase}
                              </Label>
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}

                        {displayedRegistry.registry.syncStatus.lastSyncTime && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Last Sync</DescriptionListTerm>
                            <DescriptionListDescription>
                              {formatDate(displayedRegistry.registry.syncStatus.lastSyncTime)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                      </>
                    )}
                  </DescriptionList>
                </CardBody>
              </Card>
            </StackItem>
          )}
        </Stack>
      </PageSection>
    );
  };

  const handleServerSelect = (server: { name: string }) => {
    // TODO: Open server details modal
    console.log('Selected server:', server.name);
  };

  const handleRefresh = () => {
    // Refresh both registry verification and server list
    refetchVerification();
    refetchServers();
  };

  const handleServerUnregister = async (server: { name: string }) => {
    if (!selectedNamespace || !registryName) {
      notification.error('Unregister failed', 'Namespace or registry name is missing');
      return;
    }

    try {
      await unregisterAllServerVersions(selectedNamespace, registryName, server.name);

      notification.success(
        'Server unregistered',
        `Server '${server.name}' has been successfully unregistered from the registry`,
      );

      // Refresh the server list
      refetchServers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unregister server';
      notification.error('Unregister failed', errorMessage);
      throw error; // Re-throw so modal can handle it
    }
  };

  const renderServersTab = () => (
    <McpServersTab
      servers={apiServers}
      loading={serversLoading}
      error={serversError}
      onServerSelect={handleServerSelect}
      onServerUnregister={handleServerUnregister}
      registry={registry}
      showUnregisterButton
    />
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
          <FlexItem>
            <Button
              variant="secondary"
              icon={<SyncIcon />}
              onClick={handleRefresh}
              aria-label="Refresh registry data"
            >
              Refresh
            </Button>
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

            {(!registriesLoaded || loadingManagedRegistry || (shouldVerify && verifying)) &&
            !displayedRegistry ? (
              <Card>
                <CardBody>
                  <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-u-p-xl">
                    <FlexItem>
                      <Spinner size="lg" />
                    </FlexItem>
                    <FlexItem>
                      <div style={{ marginLeft: '1rem' }}>
                        {loadingManagedRegistry || (shouldVerify && verifying)
                          ? 'Loading registry...'
                          : 'Loading registry...'}
                      </div>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            ) : !displayedRegistry &&
              registriesLoaded &&
              allRegistriesLoaded &&
              !loadingManagedRegistry &&
              (!shouldVerify || (!verifying && registryExists === false)) ? (
              <Card>
                <CardBody>
                  <Alert variant={AlertVariant.info} title="No registry exists for this project">
                    <Flex
                      direction={{ default: 'column' }}
                      spaceItems={{ default: 'spaceItemsMd' }}
                    >
                      <FlexItem>
                        <Flex
                          alignItems={{ default: 'alignItemsCenter' }}
                          spaceItems={{ default: 'spaceItemsSm' }}
                        >
                          <FlexItem>
                            <InfoCircleIcon />
                          </FlexItem>
                          <FlexItem>
                            No registry exists for project &quot;{selectedNamespace}&quot;. Do you
                            want to create one?
                          </FlexItem>
                        </Flex>
                      </FlexItem>
                      <FlexItem>
                        <Button variant="primary" onClick={handleCreateManagedRegistry}>
                          Create Registry
                        </Button>
                      </FlexItem>
                    </Flex>
                  </Alert>
                </CardBody>
              </Card>
            ) : displayedRegistry ? (
              <>
                {/* Page Header */}
                <PageSection>
                  <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                    <FlexItem>
                      <Flex
                        alignItems={{ default: 'alignItemsCenter' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>
                          {displayedRegistry.type === 'crd' ? (
                            getSourceTypeIcon(displayedRegistry.registry.spec.source?.type)
                          ) : (
                            <FileAltIcon />
                          )}
                        </FlexItem>
                        <FlexItem>
                          <Title headingLevel="h1" size="2xl">
                            {displayedRegistry.type === 'crd'
                              ? displayedRegistry.registry.spec.displayName ||
                                displayedRegistry.registry.metadata?.name
                              : (typeof displayedRegistry.registry.name === 'string'
                                  ? displayedRegistry.registry.name
                                  : '') || selectedNamespace}
                          </Title>
                        </FlexItem>
                        <FlexItem>
                          {displayedRegistry.type === 'crd' ? (
                            <McpRegistryStatusLabel status={displayedRegistry.registry.status} />
                          ) : (
                            <Label color="purple" isCompact>
                              Managed Registry
                            </Label>
                          )}
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                    <FlexItem>
                      {displayedRegistry.type === 'crd' && (
                        <Button
                          variant="secondary"
                          icon={<EditIcon />}
                          onClick={handleEditRegistry}
                        >
                          Edit
                        </Button>
                      )}
                    </FlexItem>
                  </Flex>

                  {/* Registry metadata */}
                  <Flex spaceItems={{ default: 'spaceItemsSm' }} className="pf-u-mt-sm">
                    {displayedRegistry.type === 'crd' ? (
                      getSourceTypeBadge(displayedRegistry.registry.spec.source?.type)
                    ) : (
                      <Label icon={<FileAltIcon />} color="purple" isCompact>
                        Managed Registry
                      </Label>
                    )}
                    <span className="pf-u-color-200">•</span>
                    <span className="pf-u-font-weight-bold">{getServerCount()}</span>
                    <span className="pf-u-color-200">
                      {getServerCount() === 1 ? 'server' : 'servers'}
                    </span>
                    {(() => {
                      const lastSync =
                        displayedRegistry.type === 'crd'
                          ? displayedRegistry.registry.status?.syncStatus?.lastSyncTime ??
                            displayedRegistry.registry.status?.lastSyncTime
                          : displayedRegistry.registry.syncStatus?.lastSyncTime;
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

                  {(() => {
                    const description =
                      displayedRegistry.type === 'crd'
                        ? displayedRegistry.registry.spec.description
                        : typeof displayedRegistry.registry.description === 'string'
                        ? displayedRegistry.registry.description
                        : null;
                    return description ? (
                      <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mt-sm">
                        {description}
                      </div>
                    ) : null;
                  })()}
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
      {editingRegistry && (
        <McpRegistryCreateModal
          isOpen
          onClose={() => {
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

      {restartModalOpen && pendingRestartInfo && (
        <McpDeploymentRestartModal
          isOpen
          deploymentName={pendingRestartInfo.deploymentName}
          namespace={pendingRestartInfo.namespace}
          onClose={handleCancelRestart}
          onConfirm={handleConfirmRestart}
          isRestarting={isRestarting}
        />
      )}
    </>
  );
};

export default McpRegistriesPage;
