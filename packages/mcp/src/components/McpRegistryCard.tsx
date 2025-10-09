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
  Label,
  Button,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import {
  CodeBranchIcon,
  GlobeIcon,
  FileAltIcon,
  EllipsisVIcon,
  SyncAltIcon,
  CogIcon,
  EyeIcon,
} from '@patternfly/react-icons';
import { McpRegistryStatusLabel } from './McpRegistryStatusLabel';
import { McpRegistry } from '../types/registry';

interface McpRegistryCardProps {
  registry: McpRegistry;
  onEdit?: (registry: McpRegistry) => void;
  onDelete?: (registry: McpRegistry) => void;
  onSync?: (registry: McpRegistry) => void;
  onView?: (registry: McpRegistry) => void;
}

const getSourceTypeBadge = (sourceType?: string) => {
  switch (sourceType) {
    case 'git':
      return (
        <Label icon={<CodeBranchIcon />} color="blue" isCompact>
          git
        </Label>
      );
    case 'http':
      return (
        <Label icon={<GlobeIcon />} color="green" isCompact>
          http
        </Label>
      );
    case 'configmap':
      return (
        <Label icon={<FileAltIcon />} color="purple" isCompact>
          configmap
        </Label>
      );
    default:
      return (
        <Label color="grey" isCompact>
          unknown
        </Label>
      );
  }
};

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
  const serverCount = status?.serverCount || 0;
  const lastSyncTime = status?.lastSyncTime;
  const sourceType = spec.source?.type;

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
              <Truncate content={metadata?.name || 'Unknown'} />
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
        {/* Source type and server information */}
        <Flex spaceItems={{ default: 'spaceItemsSm' }} className="pf-u-mb-md">
          {getSourceTypeBadge(sourceType)}
          <span className="pf-u-color-200">•</span>
          <span className="pf-u-font-weight-bold">{serverCount}</span>
          <span className="pf-u-color-200">{serverCount === 1 ? 'server' : 'servers'}</span>
          {lastSyncTime && (
            <>
              <span className="pf-u-color-200">•</span>
              <span className="pf-u-color-200 pf-u-font-size-sm">
                {new Date(lastSyncTime).toLocaleString()}
              </span>
            </>
          )}
        </Flex>

        {/* Description */}
        {spec.description && (
          <div className="pf-u-color-200 pf-u-font-size-sm">
            <Truncate content={spec.description} />
          </div>
        )}

        {/* Additional metadata */}
        {spec.source && (
          <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mt-md">
            {spec.source.git?.repository && <Truncate content={spec.source.git.repository} />}
            {spec.source.http?.url && <Truncate content={spec.source.http.url} />}
            {spec.source.configmap && <span>{spec.source.configmap.name}</span>}
            {metadata?.creationTimestamp && (
              <span className="pf-u-ml-md">
                • Created {new Date(metadata.creationTimestamp).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
