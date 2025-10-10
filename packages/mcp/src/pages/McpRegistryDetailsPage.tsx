import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  EmptyState,
  EmptyStateBody,
  Alert,
  AlertVariant,
  Spinner,
  Card,
  CardBody,
} from '@patternfly/react-core';
import { CodeBranchIcon, GlobeIcon, FileAltIcon, EditIcon, CogIcon } from '@patternfly/react-icons';
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
  CONFIGURATION = 'configuration',
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

  // Get the registry data
  const [registries, loaded, error] = useMcpRegistries(preferredProject?.metadata.name || '');
  const registry = React.useMemo(() => {
    return registries.find((reg) => reg.metadata?.name === name);
  }, [registries, name]);

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

  const getServerCount = () => {
    return (discoveredServers.length || registry?.status?.serverCount) ?? 0;
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

  const handleRegistryActions = () => {
    // TODO: Implement registry actions menu
    console.log('Registry actions for:', registry?.metadata?.name);
  };

  const renderOverviewTab = () => (
    <PageSection hasBodyWrapper={false} isFilled>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h3" size="lg">
            Registry Information
          </Title>
        </StackItem>
        <StackItem>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Name</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>{registry?.metadata?.name}</FlexItem>
                  <FlexItem>
                    <McpRegistryStatusLabel status={registry?.status} />
                  </FlexItem>
                </Flex>
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Source Type</DescriptionListTerm>
              <DescriptionListDescription>
                {getSourceTypeBadge(registry?.spec.source?.type)}
              </DescriptionListDescription>
            </DescriptionListGroup>

            {/* Source information - dynamic based on source type */}
            {registry?.spec.source?.type === 'git' && (
              <>
                <DescriptionListGroup>
                  <DescriptionListTerm>Repository URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <code className="pf-v6-u-font-family-monospace">
                          {registry.spec.source.git?.repository || 'Not specified'}
                        </code>
                      </FlexItem>
                      {registry.spec.source.git?.repository && (
                        <FlexItem>
                          <Button
                            variant="link"
                            isInline
                            onClick={() => {
                              const repository = registry.spec.source?.git?.repository;
                              const branch = registry.spec.source?.git?.branch || 'main';
                              const path = registry.spec.source?.git?.path;
                              if (repository) {
                                // Construct GitHub URL to the specific file
                                let githubUrl = repository.replace(/\.git$/, '');
                                if (path) {
                                  githubUrl = `${githubUrl}/blob/${branch}/${path}`;
                                } else {
                                  githubUrl = `${githubUrl}/tree/${branch}`;
                                }
                                window.open(githubUrl, '_blank');
                              }
                            }}
                          >
                            Open in Git
                          </Button>
                        </FlexItem>
                      )}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {registry.spec.source.git?.branch && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Branch</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code className="pf-v6-u-font-family-monospace">
                        {registry.spec.source.git.branch}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {registry.spec.source.git?.path && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>File Path</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code className="pf-v6-u-font-family-monospace">
                        {registry.spec.source.git.path}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </>
            )}

            {registry?.spec.source?.type === 'configmap' && (
              <>
                <DescriptionListGroup>
                  <DescriptionListTerm>ConfigMap Name</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <code className="pf-v6-u-font-family-monospace">
                          {registry.spec.source.configmap?.name || 'Not specified'}
                        </code>
                      </FlexItem>
                      {registry.spec.source.configmap?.name && (
                        <FlexItem>
                          <Button
                            variant="link"
                            isInline
                            onClick={() => {
                              const namespace = registry.metadata?.namespace;
                              const configMapName = registry.spec.source?.configmap?.name;
                              if (namespace && configMapName) {
                                // Open ConfigMap in OpenShift console
                                const consoleUrl = window.location.origin;
                                const configMapUrl = `${consoleUrl}/k8s/ns/${namespace}/configmaps/${configMapName}`;
                                window.open(configMapUrl, '_blank');
                              }
                            }}
                          >
                            View ConfigMap
                          </Button>
                        </FlexItem>
                      )}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {registry.spec.source.configmap?.key && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>ConfigMap Key</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code className="pf-v6-u-font-family-monospace">
                        {registry.spec.source.configmap.key}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </>
            )}

            {registry?.spec.source?.type === 'http' && (
              <DescriptionListGroup>
                <DescriptionListTerm>Source URL</DescriptionListTerm>
                <DescriptionListDescription>
                  <code className="pf-v6-u-font-family-monospace">
                    {registry.spec.source.http?.url || 'Not specified'}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}

            {!registry?.spec.source?.type && (
              <DescriptionListGroup>
                <DescriptionListTerm>Source</DescriptionListTerm>
                <DescriptionListDescription>Not specified</DescriptionListDescription>
              </DescriptionListGroup>
            )}

            {registry?.spec.description && (
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>{registry.spec.description}</DescriptionListDescription>
              </DescriptionListGroup>
            )}

            <DescriptionListGroup>
              <DescriptionListTerm>Namespace</DescriptionListTerm>
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

            {(() => {
              const apiStatus =
                registry?.status && 'apiStatus' in registry.status
                  ? registry.status.apiStatus
                  : null;

              // Type guard for endpoint
              const hasEndpoint = (status: unknown): status is { endpoint: string } => {
                return typeof status === 'object' && status !== null && 'endpoint' in status;
              };

              if (apiStatus && hasEndpoint(apiStatus)) {
                return (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Registry API Endpoint</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code className="pf-v6-u-font-family-monospace">
                        {String(apiStatus.endpoint)}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                );
              }
              return null;
            })()}

            <DescriptionListGroup>
              <DescriptionListTerm>Last Sync</DescriptionListTerm>
              <DescriptionListDescription>
                {formatDate(registry?.status?.lastSyncTime)}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>
                {formatDate(registry?.metadata?.creationTimestamp)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </StackItem>
      </Stack>
    </PageSection>
  );

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
          <Alert
            variant={AlertVariant.info}
            title="View all deployed servers"
            isInline
            actionLinks={
              <Button
                variant="link"
                onClick={() => {
                  // Navigate to servers page with pre-filter
                  if (registry?.metadata?.name && registry.metadata.namespace) {
                    navigate(
                      `/mcp/servers?registry=${registry.metadata.name}&namespace=${registry.metadata.namespace}`,
                    );
                  }
                }}
              >
                Go to Servers page
              </Button>
            }
          >
            Visit the Servers page to see all deployed MCPServer instances from this registry,
            including their status, endpoints, and transport protocols.
          </Alert>
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

  const renderConfigurationTab = () => (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState titleText="Registry Configuration" icon={CogIcon} headingLevel="h4">
        <EmptyStateBody>
          Configuration management will be implemented in a future phase.
          <br />
          This tab will show the registry&apos;s YAML configuration with editing capabilities.
        </EmptyStateBody>
      </EmptyState>
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
          <BreadcrumbItem isActive>{registry.metadata?.name}</BreadcrumbItem>
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
                  {registry.metadata?.name}
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
              <FlexItem>
                <Button
                  variant="plain"
                  icon={<CogIcon />}
                  onClick={handleRegistryActions}
                  aria-label="Registry actions"
                />
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
          {registry.status?.lastSyncTime && (
            <>
              <span className="pf-u-color-200">•</span>
              <span className="pf-u-color-200 pf-u-font-size-sm">
                Last sync: {formatDate(registry.status.lastSyncTime)}
              </span>
            </>
          )}
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
          <Tab
            eventKey={RegistryDetailsTab.CONFIGURATION}
            title={<TabTitleText>Configuration</TabTitleText>}
            aria-label="Registry configuration tab"
          >
            {renderConfigurationTab()}
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
