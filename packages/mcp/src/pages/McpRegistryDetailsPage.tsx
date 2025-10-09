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
import {
  CodeBranchIcon,
  GlobeIcon,
  FileAltIcon,
  ServerIcon,
  ClusterIcon,
  EditIcon,
  CogIcon,
} from '@patternfly/react-icons';
import { McpRegistryStatusLabel } from '../components/McpRegistryStatusLabel';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';

enum RegistryDetailsTab {
  OVERVIEW = 'overview',
  AVAILABLE_SERVERS = 'available-servers',
  DEPLOYED_SERVERS = 'deployed-servers',
  CONFIGURATION = 'configuration',
}

const McpRegistryDetailsPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const [activeTabKey, setActiveTabKey] = React.useState<string>(RegistryDetailsTab.OVERVIEW);

  // Get the registry data
  const [registries, loaded, error] = useMcpRegistries(preferredProject?.metadata.name || '');
  const registry = React.useMemo(() => {
    return registries.find((reg) => reg.metadata?.name === name);
  }, [registries, name]);

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
    return registry?.status?.serverCount ?? 0;
  };

  const getDeployedServerCount = () => {
    // TODO: This would come from actual deployed servers data
    return 0;
  };

  const handleBackToRegistries = () => {
    // Ensure the preferred project context is set to the current registry's namespace
    // so the main page loads with the correct namespace selected
    const registryNamespace = registry?.metadata?.namespace;
    if (registryNamespace && preferredProject?.metadata.name !== registryNamespace) {
      // Find the project that matches the registry's namespace
      const targetProject = projects.find((p) => p.metadata.name === registryNamespace);
      if (targetProject) {
        updatePreferredProject(targetProject);
      }
    }
    navigate('/mcp/registries');
  };

  const handleEditRegistry = () => {
    // TODO: Implement edit functionality
    console.log('Edit registry:', registry?.metadata?.name);
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

            <DescriptionListGroup>
              <DescriptionListTerm>Source URL</DescriptionListTerm>
              <DescriptionListDescription>
                <code className="pf-v6-u-font-family-monospace">
                  {registry?.spec.source?.git?.repository ||
                    registry?.spec.source?.http?.url ||
                    registry?.spec.source?.configmap?.name ||
                    'Not specified'}
                </code>
              </DescriptionListDescription>
            </DescriptionListGroup>

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

  const renderAvailableServersTab = () => (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState titleText="Available Servers" icon={ServerIcon} headingLevel="h4">
        <EmptyStateBody>
          Server discovery and listing will be implemented in a future phase.
          <br />
          This tab will show all MCP servers available from this registry with filtering, search,
          and deployment capabilities.
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  );

  const renderDeployedServersTab = () => (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState titleText="Deployed Servers" icon={ClusterIcon} headingLevel="h4">
        <EmptyStateBody>
          Deployed server monitoring will be implemented in a future phase.
          <br />
          This tab will show all MCP servers currently deployed from this registry with status
          monitoring and management capabilities.
        </EmptyStateBody>
      </EmptyState>
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
          <BreadcrumbItem to="/mcp/registries" onClick={handleBackToRegistries}>
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
            eventKey={RegistryDetailsTab.AVAILABLE_SERVERS}
            title={
              <TabTitleText>
                Available Servers <Badge isRead>{getServerCount()}</Badge>
              </TabTitleText>
            }
            aria-label="Available servers tab"
          >
            {renderAvailableServersTab()}
          </Tab>
          <Tab
            eventKey={RegistryDetailsTab.DEPLOYED_SERVERS}
            title={
              <TabTitleText>
                Deployed Servers <Badge isRead>{getDeployedServerCount()}</Badge>
              </TabTitleText>
            }
            aria-label="Deployed servers tab"
          >
            {renderDeployedServersTab()}
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
    </>
  );
};

export default McpRegistryDetailsPage;
