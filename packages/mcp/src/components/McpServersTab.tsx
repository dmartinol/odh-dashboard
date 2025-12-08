/**
 * Shared component for displaying servers in a tabbed interface
 * Used by both catalog details and registry details pages
 */

import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { McpServerBrowser } from './McpServerBrowser';
import { McpServerMetadata } from '../types';
import { McpRegistry } from '../types/registry';

interface McpServersTabProps {
  servers: McpServerMetadata[];
  loading: boolean;
  error: string | null | undefined;
  onServerSelect?: (server: McpServerMetadata) => void;
  onServerApprove?: (server: McpServerMetadata, projectNames: string[]) => Promise<void>;
  registry?: McpRegistry;
  showApproveButton?: boolean;
}

/**
 * Shared servers tab component for catalog and registry details pages
 * Displays servers using McpServerBrowser with consistent behavior
 */
export const McpServersTab: React.FC<McpServersTabProps> = ({
  servers,
  loading,
  error,
  onServerSelect,
  onServerApprove,
  registry,
  showApproveButton = false,
}) => {
  return (
    <PageSection hasBodyWrapper={false} isFilled>
      <McpServerBrowser
        servers={servers}
        loading={loading}
        error={error || undefined}
        onServerSelect={onServerSelect}
        onServerApprove={onServerApprove}
        registry={registry}
        showApproveButton={showApproveButton}
      />
    </PageSection>
  );
};
