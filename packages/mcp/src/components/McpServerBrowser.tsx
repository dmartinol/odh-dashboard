import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  Label,
  PageSection,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core';
import {
  ServerIcon,
  ExternalLinkAltIcon,
  CubesIcon,
  EyeIcon,
  StarIcon,
  DownloadIcon,
} from '@patternfly/react-icons';
import { McpServerDetailsModal } from './McpServerDetailsModal';
import { McpServerDeployModal } from './McpServerDeployModal';
import { McpServerMetadata, McpTransport, McpServerTier } from '../types';
import { McpRegistry } from '../types/registry';

const isValidTransport = (value: string): value is McpTransport | 'all' => {
  return ['all', 'stdio', 'sse', 'streamable-http'].includes(value);
};

const isValidTier = (value: string): value is McpServerTier | 'all' => {
  return ['all', 'official', 'community', 'experimental'].includes(value);
};

interface McpServerBrowserProps {
  servers: McpServerMetadata[];
  loading?: boolean;
  error?: string;
  onServerSelect?: (server: McpServerMetadata) => void;
  onServerDeploy?: (server: McpServerMetadata) => void;
  registry?: McpRegistry; // Optional registry context for deployment labels
}

interface ServerFilters {
  search: string;
  transport: McpTransport | 'all';
  tier: McpServerTier | 'all';
  tags: string[];
}

const initialFilters: ServerFilters = {
  search: '',
  transport: 'all',
  tier: 'all',
  tags: [],
};

export const McpServerBrowser: React.FC<McpServerBrowserProps> = ({
  servers,
  loading = false,
  error,
  onServerSelect,
  onServerDeploy,
  registry,
}) => {
  const [filters, setFilters] = React.useState<ServerFilters>(initialFilters);
  const [selectedServer, setSelectedServer] = React.useState<McpServerMetadata | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [deployModalOpen, setDeployModalOpen] = React.useState(false);
  const [serverToDeploy, setServerToDeploy] = React.useState<McpServerMetadata | null>(null);

  // Filter servers based on current filters
  const filteredServers = React.useMemo(() => {
    return servers.filter((server) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchMatch =
          server.name.toLowerCase().includes(searchLower) ||
          server.displayName?.toLowerCase().includes(searchLower) ||
          server.description?.toLowerCase().includes(searchLower) ||
          server.author?.toLowerCase().includes(searchLower);

        if (!searchMatch) return false;
      }

      // Transport filter - match only the transport field
      if (filters.transport !== 'all') {
        if (server.transport !== filters.transport) {
          return false;
        }
      }

      // Tier filter
      if (filters.tier !== 'all') {
        // First check if tier is directly set on the server
        if (server.tier && server.tier === filters.tier) {
          // Tier matches, continue
        } else {
          // Fallback to checking tags for backwards compatibility
          const hasTierTag = server.tags?.some((tag) => {
            const tagLower = tag.toLowerCase();
            const filterLower = filters.tier.toLowerCase();
            // Try exact match first, then contains for backwards compatibility
            return tagLower === filterLower || tagLower.includes(filterLower);
          });
          if (!hasTierTag) return false;
        }
      }

      // Tag filters
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((filterTag) => server.tags?.includes(filterTag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [servers, filters]);

  const getServerIcon = (server: McpServerMetadata) => {
    if (server.logo) {
      return (
        <img
          src={server.logo}
          alt={`${server.displayName || server.name} logo`}
          style={{ width: '24px', height: '24px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return <ServerIcon />;
  };

  const getTransportFromTags = (server: McpServerMetadata): McpTransport | undefined => {
    // First check if transport is directly set on the server
    if (server.transport) {
      return server.transport;
    }
    // Fallback to extracting from tags for backwards compatibility
    const transports: McpTransport[] = ['stdio', 'sse', 'streamable-http'];
    return transports.find((transport) =>
      server.tags?.some((tag) => {
        const tagLower = tag.toLowerCase();
        const transportLower = transport.toLowerCase();
        // Try exact match first, then contains for backwards compatibility
        return tagLower === transportLower || tagLower.includes(transportLower);
      }),
    );
  };

  const getTierFromTags = (server: McpServerMetadata): McpServerTier | undefined => {
    // First check if tier is directly set on the server
    if (server.tier) {
      return server.tier;
    }
    // Fallback to extracting from tags for backwards compatibility
    const tiers: McpServerTier[] = ['official', 'community', 'experimental'];
    return tiers.find((tier) =>
      server.tags?.some((tag) => {
        const tagLower = tag.toLowerCase();
        const tierLower = tier.toLowerCase();
        // Try exact match first, then contains for backwards compatibility
        return tagLower === tierLower || tagLower.includes(tierLower);
      }),
    );
  };

  const renderServerCard = (server: McpServerMetadata) => {
    const transport = getTransportFromTags(server);
    const tier = getTierFromTags(server);

    const handleServerClick = () => {
      setSelectedServer(server);
      setDetailsModalOpen(true);
      onServerSelect?.(server);
    };

    return (
      <Card key={server.name}>
        <CardTitle>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>{getServerIcon(server)}</FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Title headingLevel="h4" size="md">
                {server.displayName || server.name}
              </Title>
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                size="sm"
                icon={<EyeIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleServerClick();
                }}
                title="View server details"
              />
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            {server.description && (
              <FlexItem>
                <div className="pf-u-color-200 pf-u-font-size-sm">{server.description}</div>
              </FlexItem>
            )}

            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                {tier && (
                  <FlexItem>
                    <Label
                      color={
                        tier === 'official' ? 'green' : tier === 'community' ? 'blue' : 'orange'
                      }
                      isCompact
                    >
                      {tier}
                    </Label>
                  </FlexItem>
                )}
                {transport && (
                  <FlexItem>
                    <Label color="blue" isCompact>
                      {transport}
                    </Label>
                  </FlexItem>
                )}
                {server.version && (
                  <FlexItem>
                    <Label color="grey" isCompact>
                      v{server.version}
                    </Label>
                  </FlexItem>
                )}
                {server.tools && server.tools.length > 0 && (
                  <FlexItem>
                    <Badge isRead>
                      {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
                    </Badge>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>

            {/* Metadata badges */}
            {server.metadata && (
              <FlexItem>
                <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                  {server.metadata.stars !== undefined && server.metadata.stars > 0 && (
                    <FlexItem>
                      <Label variant="outline" icon={<StarIcon />} isCompact>
                        {server.metadata.stars} stars
                      </Label>
                    </FlexItem>
                  )}
                  {server.metadata.pulls !== undefined && server.metadata.pulls > 0 && (
                    <FlexItem>
                      <Label variant="outline" icon={<DownloadIcon />} isCompact>
                        {server.metadata.pulls} pulls
                      </Label>
                    </FlexItem>
                  )}
                  {server.metadata.last_updated && (
                    <FlexItem>
                      <Label variant="outline" isCompact>
                        Updated: {new Date(server.metadata.last_updated).toLocaleDateString()}
                      </Label>
                    </FlexItem>
                  )}
                </Flex>
              </FlexItem>
            )}

            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CubesIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setServerToDeploy(server);
                      setDeployModalOpen(true);
                      onServerDeploy?.(server);
                    }}
                  >
                    Deploy
                  </Button>
                </FlexItem>
                {server.homepage && (
                  <FlexItem>
                    <Button
                      variant="link"
                      isInline
                      icon={<ExternalLinkAltIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(server.homepage, '_blank');
                      }}
                    >
                      Info
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>
    );
  };

  if (loading) {
    return (
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-u-p-xl">
          <FlexItem>
            <Spinner size="lg" />
          </FlexItem>
        </Flex>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.danger} title="Failed to load servers">
          {error}
        </Alert>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} isFilled>
      {/* Search and Filter Toolbar */}
      <Toolbar>
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                placeholder="Search servers..."
                value={filters.search}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, search: value }))}
                onClear={() => setFilters((prev) => ({ ...prev, search: '' }))}
                style={{ minWidth: '300px' }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <FormSelect
                value={filters.transport}
                onChange={(_, value) => {
                  if (isValidTransport(value)) {
                    setFilters((prev) => ({ ...prev, transport: value }));
                  }
                }}
                aria-label="Filter by transport"
              >
                <FormSelectOption value="all" label="All Transports" />
                <FormSelectOption value="stdio" label="stdio" />
                <FormSelectOption value="sse" label="sse" />
                <FormSelectOption value="streamable-http" label="streamable-http" />
              </FormSelect>
            </ToolbarItem>
            <ToolbarItem>
              <FormSelect
                value={filters.tier}
                onChange={(_, value) => {
                  if (isValidTier(value)) {
                    setFilters((prev) => ({ ...prev, tier: value }));
                  }
                }}
                aria-label="Filter by tier"
              >
                <FormSelectOption value="all" label="All Tiers" />
                <FormSelectOption value="official" label="Official" />
                <FormSelectOption value="community" label="Community" />
              </FormSelect>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup variant="action-group">
            <ToolbarItem>
              <Badge isRead>
                {filteredServers.length} server{filteredServers.length !== 1 ? 's' : ''}
              </Badge>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      {/* Server Cards */}
      {filteredServers.length === 0 ? (
        <EmptyState>
          <ServerIcon style={{ fontSize: '64px' }} className="pf-u-mb-md" />
          <Title headingLevel="h4" size="lg">
            {servers.length === 0 ? 'No servers available' : 'No servers match your filters'}
          </Title>
          <EmptyStateBody>
            {servers.length === 0
              ? 'This registry does not contain any servers, or the registry data could not be loaded.'
              : "Try adjusting your search terms or filters to find the servers you're looking for."}
          </EmptyStateBody>
          {filters.search || filters.transport !== 'all' || filters.tier !== 'all' ? (
            <Button variant="link" onClick={() => setFilters(initialFilters)}>
              Clear all filters
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <Gallery hasGutter minWidths={{ default: '300px' }} maxWidths={{ default: '400px' }}>
          {filteredServers.map(renderServerCard)}
        </Gallery>
      )}

      {/* Server Details Modal */}
      {selectedServer && detailsModalOpen && (
        <McpServerDetailsModal
          isOpen
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedServer(null);
          }}
          server={selectedServer}
          onDeploy={(server) => {
            setDetailsModalOpen(false);
            setSelectedServer(null);
            setServerToDeploy(server);
            setDeployModalOpen(true);
            onServerDeploy?.(server);
          }}
        />
      )}

      {/* Server Deploy Modal */}
      {serverToDeploy && deployModalOpen && (
        <McpServerDeployModal
          onClose={() => {
            setDeployModalOpen(false);
            setServerToDeploy(null);
          }}
          onSuccess={() => {
            setDeployModalOpen(false);
            setServerToDeploy(null);
            // TODO: Refresh deployed servers list
          }}
          server={serverToDeploy}
          registryContext={
            registry
              ? {
                  registry,
                  serverName: serverToDeploy.name,
                }
              : undefined
          }
        />
      )}
    </PageSection>
  );
};
