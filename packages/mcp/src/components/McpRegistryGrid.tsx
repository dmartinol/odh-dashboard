import * as React from 'react';
import {
  Gallery,
  GalleryItem,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { McpRegistryCard } from './McpRegistryCard';
import { McpRegistry } from '../types/registry';

interface McpRegistryGridProps {
  registries: McpRegistry[];
  loading?: boolean;
  onCreateRegistry?: () => void;
  onEditRegistry?: (registry: McpRegistry) => void;
  onDeleteRegistry?: (registry: McpRegistry) => void;
  onSyncRegistry?: (registry: McpRegistry) => void;
  onViewRegistry?: (registry: McpRegistry) => void;
}

export const McpRegistryGrid: React.FC<McpRegistryGridProps> = ({
  registries,
  loading = false,
  onCreateRegistry,
  onEditRegistry,
  onDeleteRegistry,
  onSyncRegistry,
  onViewRegistry,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const filteredRegistries = React.useMemo(() => {
    if (!searchValue.trim()) {
      return registries;
    }
    const searchLower = searchValue.toLowerCase();
    return registries.filter(
      (registry) =>
        registry.metadata?.name?.toLowerCase().includes(searchLower) ||
        registry.spec.description?.toLowerCase().includes(searchLower),
    );
  }, [registries, searchValue]);

  if (!loading && registries.length === 0) {
    return (
      <EmptyState
        headingLevel="h5"
        icon={PlusCircleIcon}
        titleText="No MCP registries"
        variant={EmptyStateVariant.lg}
        data-testid="mcp-registries-empty-state"
      >
        <EmptyStateBody>
          To get started, create an MCP registry to discover and manage MCP servers.
        </EmptyStateBody>
        {onCreateRegistry && (
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={onCreateRegistry}>
                Create MCP registry
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        )}
      </EmptyState>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Search registries..."
              value={searchValue}
              onChange={(_, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              data-testid="mcp-registries-search"
            />
          </ToolbarItem>
          {onCreateRegistry && (
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={onCreateRegistry}
                data-testid="create-mcp-registry-button"
              >
                Create MCP registry
              </Button>
            </ToolbarItem>
          )}
        </ToolbarContent>
      </Toolbar>

      {filteredRegistries.length === 0 && searchValue ? (
        <EmptyState
          headingLevel="h5"
          titleText="No registries match your search"
          variant={EmptyStateVariant.sm}
        >
          <EmptyStateBody>
            Try adjusting your search criteria to find the registry you&apos;re looking for.
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Gallery
          hasGutter
          minWidths={{
            default: '300px',
            md: '350px',
            lg: '400px',
          }}
          maxWidths={{
            default: '1fr',
            md: '1fr',
            lg: '1fr',
          }}
        >
          {filteredRegistries.map((registry) => (
            <GalleryItem key={registry.metadata?.name || 'unknown'}>
              <McpRegistryCard
                registry={registry}
                onEdit={onEditRegistry}
                onDelete={onDeleteRegistry}
                onSync={onSyncRegistry}
                onView={onViewRegistry}
              />
            </GalleryItem>
          ))}
        </Gallery>
      )}
    </>
  );
};
