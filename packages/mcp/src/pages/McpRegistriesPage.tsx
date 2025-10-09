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
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { McpRegistryGrid } from '../components/McpRegistryGrid';
import { useMcpRegistries } from '../hooks/useMcpRegistries';
import { McpRegistry } from '../types/registry';
import { McpRegistryCreateModal } from '../components/McpRegistryCreateModal';
import { McpRegistryDeleteModal } from '../components/McpRegistryDeleteModal';
import { syncMcpRegistry, deleteMcpRegistry } from '../api/k8s/mcp';

const McpRegistriesPage: React.FC = () => {
  const notification = useNotification();
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const [selectedNamespace, setSelectedNamespace] = React.useState<string>(
    preferredProject?.metadata.name || projects[0]?.metadata.name || '',
  );
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editingRegistry, setEditingRegistry] = React.useState<McpRegistry | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingRegistry, setDeletingRegistry] = React.useState<McpRegistry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
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
    setCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    // Refresh happens automatically via useK8sWatchResource
  };

  const handleEditRegistry = (registry: McpRegistry) => {
    setEditingRegistry(registry);
  };

  const handleDeleteRegistry = (registry: McpRegistry) => {
    setDeletingRegistry(registry);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRegistry) return;

    const registryName = deletingRegistry.metadata?.name;
    const namespace = deletingRegistry.metadata?.namespace;

    if (!registryName || !namespace) {
      notification.error('Delete failed', 'Registry name or namespace is missing');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteMcpRegistry(registryName, namespace);

      notification.success('Registry deleted', `${registryName} has been successfully deleted`);

      // Close the modal
      setDeleteModalOpen(false);
      setDeletingRegistry(null);
    } catch (deleteError) {
      notification.error(
        'Registry deletion failed',
        deleteError instanceof Error ? deleteError.message : 'Unknown error occurred',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setDeletingRegistry(null);
  };

  const handleSyncRegistry = async (registry: McpRegistry) => {
    const registryName = registry.metadata?.name;
    const namespace = registry.metadata?.namespace;

    if (!registryName || !namespace) {
      notification.error('Sync failed', 'Registry name or namespace is missing');
      return;
    }

    try {
      await syncMcpRegistry(registryName, namespace);

      notification.success(
        'Registry sync started',
        `${registryName} is now synchronizing with its source`,
      );
    } catch (syncError) {
      notification.error(
        'Registry sync failed',
        syncError instanceof Error ? syncError.message : 'Unknown error occurred',
      );
    }
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
      {createModalOpen && (
        <McpRegistryCreateModal
          isOpen
          onClose={() => {
            setCreateModalOpen(false);
            setEditingRegistry(undefined);
          }}
          onSuccess={() => {
            handleCreateSuccess();
            setEditingRegistry(undefined);
          }}
          editRegistry={undefined}
        />
      )}

      {editingRegistry && (
        <McpRegistryCreateModal
          isOpen
          onClose={() => {
            setCreateModalOpen(false);
            setEditingRegistry(undefined);
          }}
          onSuccess={() => {
            handleCreateSuccess();
            setEditingRegistry(undefined);
          }}
          editRegistry={editingRegistry}
        />
      )}

      {deleteModalOpen && (
        <McpRegistryDeleteModal
          registry={deletingRegistry}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

export default McpRegistriesPage;
