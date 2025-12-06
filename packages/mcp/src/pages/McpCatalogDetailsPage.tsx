import * as React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  PageSection,
  Title,
  Breadcrumb,
  BreadcrumbItem,
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
  Card,
  CardBody,
} from '@patternfly/react-core';
import { CubeIcon, FolderOpenIcon } from '@patternfly/react-icons';
import { McpRegistryStatusLabel } from '../components/McpRegistryStatusLabel';
import { McpServersTab } from '../components/McpServersTab';
import { CatalogData } from '../types/catalog';
import { McpRegistryStatus } from '../types/registry';
import { useRegistryApiServers } from '../hooks/useRegistryApiServers';

enum CatalogDetailsTab {
  OVERVIEW = 'overview',
  SERVERS = 'servers',
}

/**
 * Type guard to check if value is CatalogData
 */
const isCatalogData = (value: unknown): value is CatalogData => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'registryName' in value &&
    typeof value.registryName === 'string' &&
    'registryNamespace' in value &&
    typeof value.registryNamespace === 'string'
  );
};

const McpCatalogDetailsPage: React.FC = () => {
  const { catalogName } = useParams<{ catalogName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTabKey, setActiveTabKey] = React.useState<string>(CatalogDetailsTab.OVERVIEW);

  // Get catalog data from route state (passed from catalog card)
  const catalog = React.useMemo(() => {
    const { state } = location;
    if (state && typeof state === 'object' && state !== null && 'catalog' in state) {
      const catalogValue = state.catalog;
      if (isCatalogData(catalogValue)) {
        return catalogValue;
      }
    }
    return undefined;
  }, [location.state]);

  // Extract namespace from catalog data
  const namespace = catalog?.registryNamespace;

  // Convert catalog syncStatus to McpRegistryStatus format for status label
  const status: McpRegistryStatus | undefined = React.useMemo(() => {
    if (!catalog?.syncStatus) {
      return undefined;
    }

    // Map catalog syncStatus phase to McpRegistryStatus phase
    let phase: McpRegistryStatus['phase'] = 'Pending';
    const catalogPhase = catalog.syncStatus.phase;
    if (catalogPhase === 'complete') {
      phase = 'Ready';
    } else if (catalogPhase === 'failed') {
      phase = 'Failed';
    } else if (catalogPhase === 'pending') {
      phase = 'Pending';
    }

    return {
      phase,
      message: catalog.syncStatus.message,
    };
  }, [catalog?.syncStatus]);

  // Fetch servers from API using catalog name as registry name
  const {
    servers: apiServers,
    loading: serversLoading,
    error: serversError,
  } = useRegistryApiServers(namespace, catalogName);

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

  const getServerCount = () => {
    return apiServers.length || catalog?.syncStatus?.serverCount || 0;
  };

  const getCatalogTypeBadge = (type?: string) => {
    switch (type) {
      case 'REMOTE':
        return (
          <Label icon={<CubeIcon />} color="blue" isCompact>
            Remote
          </Label>
        );
      case 'FILE':
        return (
          <Label icon={<CubeIcon />} color="green" isCompact>
            File
          </Label>
        );
      default:
        return (
          <Label icon={<CubeIcon />} color="grey" isCompact>
            {type || 'Unknown'}
          </Label>
        );
    }
  };

  const handleBackToCatalogs = () => {
    navigate('/ai-hub/mcp/catalogs');
  };

  const handleServerSelect = (server: { name: string }) => {
    // TODO: Open server details modal
    console.log('Selected server:', server.name);
  };

  const renderOverviewTab = () => {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <Stack hasGutter>
          {/* Catalog Information Card */}
          <StackItem>
            <Card>
              <CardBody>
                <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
                  Catalog Information
                </Title>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '200px' }}>
                  {catalog?.description && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Description</DescriptionListTerm>
                      <DescriptionListDescription>{catalog.description}</DescriptionListDescription>
                    </DescriptionListGroup>
                  )}

                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      <FolderOpenIcon /> Project
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {catalog?.registryNamespace || 'Unknown'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Type</DescriptionListTerm>
                    <DescriptionListDescription>
                      {getCatalogTypeBadge(catalog?.type)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Server Count</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Badge isRead>{getServerCount()}</Badge>
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {catalog?.createdAt && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Created</DescriptionListTerm>
                      <DescriptionListDescription>
                        {formatDate(catalog.createdAt)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}

                  {catalog?.updatedAt && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Updated</DescriptionListTerm>
                      <DescriptionListDescription>
                        {formatDate(catalog.updatedAt)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>

          {/* Source Registry Information Card */}
          <StackItem>
            <Card>
              <CardBody>
                <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
                  Source Registry Information
                </Title>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '200px' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Registry Name</DescriptionListTerm>
                    <DescriptionListDescription>
                      {catalog?.registryName || 'Unknown'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  <DescriptionListGroup>
                    <DescriptionListTerm>Registry Namespace</DescriptionListTerm>
                    <DescriptionListDescription>
                      {catalog?.registryNamespace || 'Unknown'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>

                  {catalog?.endpoint && (
                    <DescriptionListGroup>
                      <DescriptionListTerm>API Endpoint</DescriptionListTerm>
                      <DescriptionListDescription>
                        <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                          {catalog.endpoint}
                        </code>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )}
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>

          {/* Sync Status Card */}
          {catalog?.syncStatus && (
            <StackItem>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
                    Sync Status
                  </Title>
                  <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '200px' }}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Phase</DescriptionListTerm>
                      <DescriptionListDescription>
                        <McpRegistryStatusLabel status={status} />
                      </DescriptionListDescription>
                    </DescriptionListGroup>

                    {catalog.syncStatus.lastSyncTime && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Last Sync</DescriptionListTerm>
                        <DescriptionListDescription>
                          {formatDate(catalog.syncStatus.lastSyncTime)} (
                          {formatTimeAgo(catalog.syncStatus.lastSyncTime)})
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}

                    {catalog.syncStatus.message && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Message</DescriptionListTerm>
                        <DescriptionListDescription>
                          {catalog.syncStatus.message}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}

                    {catalog.syncStatus.attemptCount !== undefined && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Attempt Count</DescriptionListTerm>
                        <DescriptionListDescription>
                          {catalog.syncStatus.attemptCount}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
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

  const renderServersTab = () => (
    <McpServersTab
      servers={apiServers}
      loading={serversLoading}
      error={serversError}
      onServerSelect={handleServerSelect}
      registry={undefined}
    />
  );

  // Show error state if catalog data is missing
  if (!catalog || !catalogName) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.warning} title="Catalog not found">
          The catalog &quot;{catalogName}&quot; was not found. Please navigate back to the catalog
          list.
        </Alert>
      </PageSection>
    );
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      <PageSection type="breadcrumb">
        <Breadcrumb>
          <BreadcrumbItem>AI Hub</BreadcrumbItem>
          <BreadcrumbItem
            onClick={(e) => {
              e.preventDefault();
              handleBackToCatalogs();
            }}
            style={{ cursor: 'pointer' }}
          >
            MCP Catalogs
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{catalog.name}</BreadcrumbItem>
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
              <FlexItem>
                <CubeIcon />
              </FlexItem>
              <FlexItem>
                <Title headingLevel="h1" size="2xl">
                  {catalog.name}
                </Title>
              </FlexItem>
              <FlexItem>
                <McpRegistryStatusLabel status={status} />
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>

        {/* Catalog metadata */}
        <Flex spaceItems={{ default: 'spaceItemsSm' }} className="pf-u-mt-sm">
          {getCatalogTypeBadge(catalog.type)}
          <span className="pf-u-color-200">•</span>
          <span className="pf-u-font-weight-bold">{getServerCount()}</span>
          <span className="pf-u-color-200">{getServerCount() === 1 ? 'server' : 'servers'}</span>
          {catalog.syncStatus?.lastSyncTime && (
            <>
              <span className="pf-u-color-200">•</span>
              <span className="pf-u-color-200 pf-u-font-size-sm">
                Last sync: {formatDate(catalog.syncStatus.lastSyncTime)}
              </span>
            </>
          )}
        </Flex>

        {catalog.description && (
          <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mt-sm">{catalog.description}</div>
        )}
      </PageSection>

      {/* Tabbed Content */}
      <PageSection>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Catalog details tabs"
          role="region"
        >
          <Tab
            eventKey={CatalogDetailsTab.OVERVIEW}
            title={<TabTitleText>Overview</TabTitleText>}
            aria-label="Catalog overview tab"
          >
            {renderOverviewTab()}
          </Tab>
          <Tab
            eventKey={CatalogDetailsTab.SERVERS}
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
  );
};

export default McpCatalogDetailsPage;
