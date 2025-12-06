/**
 * Catalog card component for displaying MCP catalog information
 * Designed to match McpRegistryCard as much as possible
 */

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
} from '@patternfly/react-core';
import { EyeIcon, CubeIcon } from '@patternfly/react-icons';
import { McpRegistryStatusLabel } from './McpRegistryStatusLabel';
import { CatalogData } from '../types/catalog';
import { McpRegistryStatus } from '../types/registry';

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '';
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

interface McpCatalogCardProps {
  catalog: CatalogData;
}

export const McpCatalogCard: React.FC<McpCatalogCardProps> = ({ catalog }) => {
  const navigate = useNavigate();
  const serverCount = catalog.syncStatus?.serverCount ?? 0;
  const lastSyncTime = catalog.syncStatus?.lastSyncTime;
  const catalogType = catalog.type || 'unknown';

  // Convert catalog syncStatus to McpRegistryStatus format for status label
  const status: McpRegistryStatus | undefined = React.useMemo(() => {
    if (!catalog.syncStatus) {
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
  }, [catalog.syncStatus]);

  const handleViewCatalog = () => {
    navigate(`/ai-hub/mcp/catalogs/${catalog.name}`, {
      state: {
        catalog,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Truncate content={catalog.name} />
            </FlexItem>
            <FlexItem style={{ marginLeft: 'auto' }}>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
                style={{ whiteSpace: 'nowrap' }}
              >
                <FlexItem>
                  <Button
                    variant="plain"
                    size="sm"
                    icon={<EyeIcon />}
                    onClick={handleViewCatalog}
                    title="View catalog details"
                  />
                </FlexItem>
                <FlexItem style={{ marginLeft: '8px' }}>
                  <McpRegistryStatusLabel status={status} />
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>

      <CardBody>
        {/* Main metadata line with icons */}
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsSm' }}
          className="pf-u-mb-md pf-u-font-size-sm pf-u-color-200"
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsXs' }}
            >
              <CubeIcon />
              <span>{catalogType}</span>
            </Flex>
          </FlexItem>
          <FlexItem>•</FlexItem>
          <FlexItem>
            <span className="pf-u-font-weight-bold">{serverCount}</span>{' '}
            {serverCount === 1 ? 'server' : 'servers'}
          </FlexItem>
          {lastSyncTime && (
            <>
              <FlexItem>•</FlexItem>
              <FlexItem>{formatTimeAgo(lastSyncTime)}</FlexItem>
            </>
          )}
        </Flex>

        {/* Description */}
        {catalog.description && (
          <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mb-md">
            <Truncate content={catalog.description} />
          </div>
        )}

        {/* Registry information */}
        <div className="pf-u-color-200 pf-u-font-size-sm pf-u-font-family-monospace">
          <Truncate content={`Registry: ${catalog.registryName} (${catalog.registryNamespace})`} />
        </div>
      </CardBody>
    </Card>
  );
};
