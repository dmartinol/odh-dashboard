import React from 'react';
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Spinner,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { McpRegistryGrid } from '../components/McpRegistryGrid';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { McpRegistry } from '../types/registry';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';
import ProjectSelector from '../../../../frontend/src/concepts/projects/ProjectSelector';

const McpRegistriesPage: React.FC = () => {
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const [selectedNamespace, setSelectedNamespace] = React.useState<string>(
    preferredProject?.metadata.name || projects[0]?.metadata.name || '',
  );
  const [registries, loaded, error] = useMcpRegistries(selectedNamespace || '');

  // Sync selected namespace with preferred project changes
  React.useEffect(() => {
    if (preferredProject?.metadata.name && preferredProject.metadata.name !== selectedNamespace) {
      setSelectedNamespace(preferredProject.metadata.name);
    }
  }, [preferredProject, selectedNamespace]);

  const handleProjectSelection = (namespace: string) => {
    setSelectedNamespace(namespace);
    const selectedProject = projects.find((p) => p.metadata.name === namespace);
    if (selectedProject) {
      updatePreferredProject(selectedProject);
    }
  };

  const handleCreateRegistry = () => {
    // TODO: Implement create registry functionality
    console.log('Create registry clicked');
  };

  const handleEditRegistry = (registry: McpRegistry) => {
    // TODO: Implement edit functionality
    console.log('Edit registry:', registry.metadata?.name);
  };

  const handleDeleteRegistry = (registry: McpRegistry) => {
    // TODO: Implement delete functionality
    console.log('Delete registry:', registry.metadata?.name);
  };

  const handleSyncRegistry = (registry: McpRegistry) => {
    // TODO: Implement sync functionality
    console.log('Sync registry:', registry.metadata?.name);
  };

  const handleViewRegistry = (registry: McpRegistry) => {
    // TODO: Implement view functionality
    console.log('View registry:', registry.metadata?.name);
  };

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              MCP Registries
            </Title>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Flex>
          <FlexItem>
            <ProjectSelector
              namespace={selectedNamespace}
              onSelection={handleProjectSelection}
              placeholder="Select a project"
            />
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {!selectedNamespace ? (
          <Alert variant={AlertVariant.warning} title="No project selected" className="pf-u-mb-md">
            Please select a project to view MCP registries.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert
                variant={AlertVariant.danger}
                title="Failed to load MCP registries"
                className="pf-u-mb-md"
              >
                {error.message}
              </Alert>
            )}

            {!loaded ? (
              <Card>
                <CardBody>
                  <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-u-p-xl">
                    <FlexItem>
                      <Spinner size="lg" />
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            ) : (
              <McpRegistryGrid
                registries={registries}
                loading={!loaded}
                onCreateRegistry={handleCreateRegistry}
                onEditRegistry={handleEditRegistry}
                onDeleteRegistry={handleDeleteRegistry}
                onSyncRegistry={handleSyncRegistry}
                onViewRegistry={handleViewRegistry}
              />
            )}
          </>
        )}
      </PageSection>
    </>
  );
};

export default McpRegistriesPage;
