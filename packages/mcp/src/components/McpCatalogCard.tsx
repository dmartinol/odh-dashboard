/**
 * Catalog card component for displaying MCP catalog information
 */

import React from 'react';
import { Card, CardBody, CardTitle, CardHeader, Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { CatalogData } from '../types/catalog';

interface McpCatalogCardProps {
  catalog: CatalogData;
}

export const McpCatalogCard: React.FC<McpCatalogCardProps> = ({ catalog }) => {
  // Placeholder link for catalog details (not implemented yet)
  const catalogDetailsPath = `/ai-hub/mcp/catalogs/${catalog.name}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link to={catalogDetailsPath} style={{ textDecoration: 'none', color: 'inherit' }}>
            {catalog.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <div>{catalog.description}</div>
          </FlexItem>
          <FlexItem>
            <small style={{ color: 'var(--pf-v5-global--Color--200)' }}>
              Registry: {catalog.registryName}
              {catalog.registryNamespace && ` (${catalog.registryNamespace})`}
            </small>
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};
