import React from 'react';
import {
  PageSection,
  Title,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Alert,
  AlertVariant,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Button,
} from '@patternfly/react-core';
import { FolderOpenIcon, SyncIcon, PlusIcon } from '@patternfly/react-icons';
import { useCatalogData } from '../hooks/useCatalogData';
import { McpCatalogCard } from '../components/McpCatalogCard';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { McpCatalogImportModal } from '../components/McpCatalogImportModal';

const McpCatalogsPage: React.FC = () => {
  // Project is fixed to 'toolhive-system'
  const selectedNamespace = 'toolhive-system';
  const [importModalOpen, setImportModalOpen] = React.useState(false);

  // Fetch MCPRegistry instances in the 'toolhive-system' namespace to check if exactly one exists
  const [registries, registriesLoaded] = useMcpRegistries(selectedNamespace);

  // Check if exactly one MCPRegistry exists in the 'toolhive-system' namespace
  const canImportCatalog = React.useMemo(() => {
    if (!registriesLoaded) {
      return false;
    }
    return registries.length === 1;
  }, [registries, registriesLoaded]);

  const mcpRegistryForImport = React.useMemo(() => {
    if (canImportCatalog && registries.length === 1) {
      const registry = registries[0];
      if ('spec' in registry) {
        return registry;
      }
    }
    return undefined;
  }, [canImportCatalog, registries]);

  const { catalogs, loading, error, refetch } = useCatalogData(selectedNamespace);

  const handleImportSuccess = () => {
    refetch();
  };

  // Loading state
  if (loading) {
    return (
      <>
        <PageSection>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                MCP Catalogs
              </Title>
            </FlexItem>
          </Flex>
        </PageSection>

        <PageSection>
          <Card>
            <CardBody>
              <Flex
                justifyContent={{ default: 'justifyContentCenter' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <Spinner size="lg" />
                </FlexItem>
                <FlexItem>
                  <div style={{ marginLeft: '1rem' }}>Loading catalogs...</div>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        </PageSection>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <PageSection>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                MCP Catalogs
              </Title>
            </FlexItem>
          </Flex>
        </PageSection>

        <PageSection>
          <Card>
            <CardBody>
              <Alert
                variant={AlertVariant.danger}
                title="Error loading catalogs"
                isInline
                actionLinks={
                  <Button variant="link" onClick={refetch}>
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            </CardBody>
          </Card>
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              MCP Catalogs
            </Title>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button
                  variant="secondary"
                  icon={<SyncIcon />}
                  onClick={() => refetch()}
                  isDisabled={loading}
                  aria-label="Refresh catalog data"
                >
                  Refresh
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  icon={<PlusIcon />}
                  onClick={() => setImportModalOpen(true)}
                  isDisabled={!canImportCatalog || loading}
                  aria-label="Import catalog"
                >
                  Import Catalog
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <strong>
              <FolderOpenIcon /> Project:
            </strong>
          </FlexItem>
          <FlexItem>
            <span>{selectedNamespace}</span>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {catalogs.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState icon={FolderOpenIcon} headingLevel="h4" titleText="No catalogs found">
                <EmptyStateBody>
                  No catalogs found in the toolhive-system project. Create an MCP registry with an
                  API endpoint to see catalogs here.
                </EmptyStateBody>
              </EmptyState>
            </CardBody>
          </Card>
        ) : (
          <Grid hasGutter>
            {catalogs.map((catalog) => (
              <GridItem
                key={`${catalog.registryNamespace}-${catalog.registryName}-${catalog.name}`}
                sm={12}
                md={6}
                lg={4}
              >
                <McpCatalogCard catalog={catalog} />
              </GridItem>
            ))}
          </Grid>
        )}
      </PageSection>
      {importModalOpen && mcpRegistryForImport && (
        <McpCatalogImportModal
          isOpen
          onClose={() => setImportModalOpen(false)}
          onSuccess={handleImportSuccess}
          mcpRegistry={mcpRegistryForImport}
        />
      )}
    </>
  );
};

export default McpCatalogsPage;
