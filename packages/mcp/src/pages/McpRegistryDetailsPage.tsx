import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Tab,
  Tabs,
  TabTitleText,
  Badge,
  Label,
  Stack,
  StackItem,
  Alert,
  AlertVariant,
  Spinner,
  Card,
  CardBody,
} from '@patternfly/react-core';
import {
  CodeBranchIcon,
  GlobeIcon,
  FileAltIcon,
  EditIcon,
  FolderOpenIcon,
} from '@patternfly/react-icons';
import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';
import { McpRegistryStatusLabel } from '../components/McpRegistryStatusLabel';
import { McpRegistryCreateModal } from '../components/McpRegistryCreateModal';
import { McpServerBrowser } from '../components/McpServerBrowser';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import useConfigMaps from '../hooks/useConfigMaps';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';
import { McpServerMetadata } from '../types';
import {
  discoverServersFromGit,
  discoverServersFromConfigMap,
  discoverServersFromHttp,
} from '../utils/registryValidation';

enum RegistryDetailsTab {
  OVERVIEW = 'overview',
  SERVERS = 'servers',
}

const McpRegistryDetailsPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const [activeTabKey, setActiveTabKey] = React.useState<string>(RegistryDetailsTab.OVERVIEW);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  // Server discovery state
  const [discoveredServers, setDiscoveredServers] = React.useState<McpServerMetadata[]>([]);
  const [serversLoading, setServersLoading] = React.useState(false);
  const [serversError, setServersError] = React.useState<string>();

  // Get the registry data - fetch from all namespaces to find the registry by name
  // This is needed because the URL only has the registry name, not the namespace
  const [registries, loaded, error] = useMcpRegistries(''); // Empty string = all namespaces
  const registry = React.useMemo(() => {
    return registries.find((reg) => reg.metadata?.name === name);
  }, [registries, name]);

  // Update preferred project to match the registry's namespace when found
  React.useEffect(() => {
    if (registry && registry.metadata?.namespace) {
      const registryNamespace = registry.metadata.namespace;
      if (preferredProject?.metadata.name !== registryNamespace) {
        const targetProject = projects.find((p) => p.metadata.name === registryNamespace);
        if (targetProject) {
          updatePreferredProject(targetProject);
        }
      }
    }
  }, [registry, preferredProject, projects, updatePreferredProject]);

  // Load ConfigMaps for ConfigMap-based registries
  const [configMaps] = useConfigMaps(registry?.metadata?.namespace);

  // Server discovery effect
  React.useEffect(() => {
    const discoverServers = async () => {
      if (!registry?.spec.source) {
        setDiscoveredServers([]);
        return;
      }

      setServersLoading(true);
      setServersError(undefined);

      try {
        let result;

        // Extract base API URL from registry status for MCP v0 API calls
        const baseApiUrl = (() => {
          const apiStatus =
            registry.status && 'apiStatus' in registry.status ? registry.status.apiStatus : null;

          // Type guard for endpoint
          const hasEndpoint = (status: unknown): status is { endpoint: string } => {
            return typeof status === 'object' && status !== null && 'endpoint' in status;
          };

          if (apiStatus && hasEndpoint(apiStatus)) {
            return String(apiStatus.endpoint);
          }
          return undefined;
        })();

        console.log(`🔍 [DISCOVERY] Base API URL for MCP v0 calls:`, baseApiUrl);

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
            result = {
              servers: [],
              error: 'ConfigMap not found',
            };
          }
        } else if (registry.spec.source.type === 'http' && registry.spec.source.http) {
          result = await discoverServersFromHttp(registry.spec.source.http.url);
        } else {
          result = {
            servers: [],
            error: 'Unsupported registry source type',
          };
        }

        if (result.error) {
          setServersError(result.error);
          setDiscoveredServers([]);
        } else {
          setDiscoveredServers(result.servers);
          setServersError(undefined);
        }
      } catch (err) {
        setServersError(err instanceof Error ? err.message : 'Failed to discover servers');
        setDiscoveredServers([]);
      } finally {
        setServersLoading(false);
      }
    };

    if (registry) {
      discoverServers();
    }
  }, [registry, configMaps]);

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
    // Support both nested syncStatus structure and flat structure for backward compatibility
    const lastSyncTime =
      registry?.status?.syncStatus?.lastSyncTime ?? registry?.status?.lastSyncTime;
    const syncPhase = registry?.status?.syncStatus?.phase ?? registry?.status?.phase;
    // Auto-sync is enabled if either:
    // 1. enabled field is explicitly true, OR
    // 2. enabled field is undefined AND interval is configured
    const isAutoSync = registry?.spec.syncPolicy?.enabled ?? !!registry?.spec.syncPolicy?.interval;
    const interval = registry?.spec.syncPolicy?.interval || '5m';

    // Configuration part
    const configPart = isAutoSync ? `Auto sync every ${interval}` : 'Manual sync';

    // Status part
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
      discoveredServers.length ||
      registry?.status?.syncStatus?.serverCount ||
      registry?.status?.serverCount ||
      0
    );
  };

  const handleBackToRegistries = async () => {
    // Ensure the preferred project context is set to the current registry's namespace
    // so the main page loads with the correct namespace selected
    const registryNamespace = registry?.metadata?.namespace;

    if (registryNamespace && preferredProject?.metadata.name !== registryNamespace) {
      // Find the project that matches the registry's namespace
      const targetProject = projects.find((p) => p.metadata.name === registryNamespace);
      if (targetProject) {
        // Update the preferred project and wait a brief moment for the context to update
        updatePreferredProject(targetProject);

        // Small delay to ensure the context update propagates before navigation
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      }
    }

    navigate('/mcp/registries');
  };

  const handleEditRegistry = () => {
    setEditModalOpen(true);
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

  const handleServerSelect = (server: McpServerMetadata) => {
    // TODO: Open server details modal
    console.log('Selected server:', server.name);
  };

  const handleServerDeploy = (server: McpServerMetadata) => {
    // TODO: Open deployment modal/workflow
    console.log('Deploy server:', server.name);
  };

  const renderServersTab = () => (
    <PageSection hasBodyWrapper={false} isFilled>
      <Stack hasGutter>
        <StackItem>
          <div className="pf-v6-u-mb-md">
            To view deployed servers, go to{' '}
            <Link
              to={`/mcp/servers?registry=${registry?.metadata?.name ?? ''}&namespace=${
                registry?.metadata?.namespace ?? ''
              }`}
            >
              <b>Servers</b>
            </Link>
          </div>
        </StackItem>
        <StackItem>
          <McpServerBrowser
            servers={discoveredServers}
            loading={serversLoading}
            error={serversError}
            onServerSelect={handleServerSelect}
            onServerDeploy={handleServerDeploy}
          />
        </StackItem>
      </Stack>
    </PageSection>
  );

  // Show loading state
  if (!loaded) {
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
  if (error) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.danger} title="Failed to load registry details">
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  // Show not found state
  if (!registry) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.warning} title="Registry not found">
          The registry &quot;{name}&quot; was not found in the current project.
        </Alert>
      </PageSection>
    );
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      <PageSection type="breadcrumb">
        <Breadcrumb>
          <BreadcrumbItem>Model Context Protocol</BreadcrumbItem>
          <BreadcrumbItem
            onClick={async (e) => {
              e.preventDefault();
              await handleBackToRegistries();
            }}
            style={{ cursor: 'pointer' }}
          >
            Registries
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            {registry.spec.displayName || registry.metadata?.name}
          </BreadcrumbItem>
        </Breadcrumb>
      </PageSection>

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
                <Button variant="secondary" icon={<EditIcon />} onClick={handleEditRegistry}>
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
          <span className="pf-u-color-200">{getServerCount() === 1 ? 'server' : 'servers'}</span>
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

      {/* Edit Modal */}
      {editModalOpen && (
        <McpRegistryCreateModal
          isOpen
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            setEditModalOpen(false);
            // Registry data will be refreshed automatically via the hook
          }}
          editRegistry={registry}
        />
      )}
    </>
  );
};

export default McpRegistryDetailsPage;
