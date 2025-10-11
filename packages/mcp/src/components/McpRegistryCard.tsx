import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Truncate,
  Button,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon, SyncAltIcon, CogIcon, EyeIcon } from '@patternfly/react-icons';
import { McpRegistryStatusLabel } from './McpRegistryStatusLabel';
import { McpRegistry } from '../types/registry';

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatSyncInterval = (interval?: string): string => {
  if (!interval || interval === 'manual') return 'manual';

  // Convert interval formats like "1h", "30m", "1d" to readable format
  if (interval.includes('h')) return `auto ${interval}`;
  if (interval.includes('m')) return `auto ${interval}`;
  if (interval.includes('d')) return `auto ${interval}`;

  return `auto ${interval}`;
};

interface McpRegistryCardProps {
  registry: McpRegistry;
  onEdit?: (registry: McpRegistry) => void;
  onDelete?: (registry: McpRegistry) => void;
  onSync?: (registry: McpRegistry) => void;
  onView?: (registry: McpRegistry) => void;
}

export const McpRegistryCard: React.FC<McpRegistryCardProps> = ({
  registry,
  onEdit,
  onDelete,
  onSync,
  onView,
}) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const { metadata, spec, status } = registry;
  const serverCount = status?.syncStatus?.serverCount ?? status?.serverCount ?? 0;
  const lastSyncTime = status?.syncStatus?.lastSyncTime ?? status?.lastSyncTime;
  const sourceType = spec.source?.type;
  const syncInterval = spec.syncPolicy?.interval;

  const handleViewRegistry = () => {
    const registryName = metadata?.name;
    if (registryName) {
      navigate(`/mcp/registries/${registryName}`);
    }
    // Also call the external onView callback if provided (for backward compatibility)
    if (onView) {
      onView(registry);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Truncate content={spec.displayName || metadata?.name || 'Unknown'} />
            </FlexItem>
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                {onSync && (
                  <FlexItem>
                    <Button
                      variant="plain"
                      size="sm"
                      icon={<SyncAltIcon />}
                      onClick={() => onSync(registry)}
                      title="Sync registry"
                    />
                  </FlexItem>
                )}
                <FlexItem>
                  <Button
                    variant="plain"
                    size="sm"
                    icon={<EyeIcon />}
                    onClick={handleViewRegistry}
                    title="View registry details"
                  />
                </FlexItem>
                {(onEdit || onDelete) && (
                  <FlexItem>
                    <Dropdown
                      isOpen={isDropdownOpen}
                      onSelect={() => setIsDropdownOpen(false)}
                      onOpenChange={(isOpen: boolean) => setIsDropdownOpen(isOpen)}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          aria-label="Registry actions"
                          variant="plain"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          isExpanded={isDropdownOpen}
                        >
                          <EllipsisVIcon />
                        </MenuToggle>
                      )}
                    >
                      <DropdownList>
                        {onEdit && (
                          <DropdownItem
                            key="edit"
                            onClick={() => onEdit(registry)}
                            icon={<CogIcon />}
                          >
                            Edit
                          </DropdownItem>
                        )}
                        {onDelete && (
                          <DropdownItem
                            key="delete"
                            onClick={() => onDelete(registry)}
                            className="pf-u-color-200"
                          >
                            Delete
                          </DropdownItem>
                        )}
                      </DropdownList>
                    </Dropdown>
                  </FlexItem>
                )}
                <FlexItem>
                  <McpRegistryStatusLabel status={registry.status} />
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>

      <CardBody>
        {/* Main status line - matches reference: "git • 24 servers • auto 1h • 10/9/2025 ago" */}
        <div className="pf-u-mb-md pf-u-font-size-sm pf-u-color-200">
          <span className="pf-u-font-weight-bold">{sourceType || 'unknown'}</span>
          <span className="pf-u-mx-sm">•</span>
          <span className="pf-u-font-weight-bold">{serverCount}</span>
          <span className="pf-u-ml-xs">{serverCount === 1 ? 'server' : 'servers'}</span>
          <span className="pf-u-mx-sm">•</span>
          <span>{formatSyncInterval(syncInterval)}</span>
          {lastSyncTime && (
            <>
              <span className="pf-u-mx-sm">•</span>
              <span>{formatTimeAgo(lastSyncTime)}</span>
            </>
          )}
        </div>

        {/* Description */}
        {spec.description && (
          <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mb-md">
            <Truncate content={spec.description} />
          </div>
        )}

        {/* Source URL */}
        {spec.source && (
          <div className="pf-u-color-200 pf-u-font-size-sm pf-u-font-family-monospace">
            {spec.source.git?.repository && <Truncate content={spec.source.git.repository} />}
            {spec.source.http?.url && <Truncate content={spec.source.http.url} />}
            {spec.source.configmap && <span>{spec.source.configmap.name}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
