import React from 'react';
import {
  PageSection,
  Title,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { FolderOpenIcon } from '@patternfly/react-icons';

const McpCatalogsPage: React.FC = () => {
  return (
    <>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          MCP Catalogs
        </Title>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            <EmptyState icon={FolderOpenIcon} headingLevel="h4" titleText="MCP Catalogs">
              <EmptyStateBody>
                This page is coming soon. MCP catalogs will allow you to browse and manage curated
                collections of MCP servers.
              </EmptyStateBody>
            </EmptyState>
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};

export default McpCatalogsPage;
