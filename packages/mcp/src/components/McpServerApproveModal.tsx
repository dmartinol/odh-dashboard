import * as React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Flex,
  FlexItem,
  Title,
  Alert,
  AlertVariant,
  Spinner,
  Stack,
  StackItem,
  Label,
  LabelGroup,
  Badge,
  SearchInput,
  Card,
  CardBody,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { McpServerMetadata } from '../types';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';

interface McpServerApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: McpServerMetadata;
  onApprove: (projectNames: string[]) => Promise<void>;
}

export const McpServerApproveModal: React.FC<McpServerApproveModalProps> = ({
  isOpen,
  onClose,
  server,
  onApprove,
}) => {
  console.log('[McpServerApproveModal] Rendering modal, isOpen:', isOpen, 'server:', server.name);
  const { projects } = React.useContext(ProjectsContext);
  const [selectedProjects, setSelectedProjects] = React.useState<Set<string>>(new Set());
  const [isApproving, setIsApproving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedProjects(new Set());
      setError(null);
      setIsApproving(false);
      setSearchText('');
    }
  }, [isOpen]);

  // Filter projects by search text
  const filteredProjects = React.useMemo(() => {
    if (!searchText.trim()) {
      return projects;
    }
    const searchLower = searchText.toLowerCase();
    return projects.filter((project) => project.metadata.name.toLowerCase().includes(searchLower));
  }, [projects, searchText]);

  // Separate selected and available projects
  const availableProjects = React.useMemo(() => {
    return filteredProjects.filter((project) => !selectedProjects.has(project.metadata.name));
  }, [filteredProjects, selectedProjects]);

  const handleRemoveProject = (projectName: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      next.delete(projectName);
      return next;
    });
  };

  const handleAddProject = (projectName: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      next.add(projectName);
      return next;
    });
  };

  const handleApprove = async () => {
    if (selectedProjects.size === 0) {
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const projectNames = Array.from(selectedProjects);
      await onApprove(projectNames);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve server');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = () => {
    if (!isApproving) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen
      onClose={handleCancel}
      variant="medium"
      title={`Approve Server: ${server.displayName || server.name}`}
      aria-labelledby="approve-server-modal-title"
    >
      <ModalHeader>
        <Title headingLevel="h2" size="xl" id="approve-server-modal-title">
          Approve Server: {server.displayName || server.name}
        </Title>
      </ModalHeader>
      <ModalBody>
        <Stack hasGutter>
          {/* Server Information */}
          <StackItem>
            <Alert variant={AlertVariant.info} isInline title="Server Information">
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                {server.description && (
                  <FlexItem>
                    <strong>Description:</strong> {server.description}
                  </FlexItem>
                )}
                <FlexItem>
                  <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                    {server.tier && (
                      <FlexItem>
                        <Label
                          color={
                            server.tier === 'official'
                              ? 'green'
                              : server.tier === 'community'
                              ? 'blue'
                              : 'orange'
                          }
                          isCompact
                        >
                          {server.tier}
                        </Label>
                      </FlexItem>
                    )}
                    {server.transport && (
                      <FlexItem>
                        <Label color="blue" isCompact>
                          {server.transport}
                        </Label>
                      </FlexItem>
                    )}
                    {server.version && (
                      <FlexItem>
                        <Label color="grey" isCompact>
                          v{server.version}
                        </Label>
                      </FlexItem>
                    )}
                  </Flex>
                </FlexItem>
              </Flex>
            </Alert>
          </StackItem>

          {/* Project Selection */}
          <StackItem>
            <Title headingLevel="h3" size="md">
              Select Projects
            </Title>
            <div className="pf-u-mt-sm">
              <p className="pf-u-color-200 pf-u-font-size-sm">
                Select one or more projects where this server will be published. The server will be
                added to each project&apos;s registry if the registry exists.
              </p>
            </div>
          </StackItem>

          {/* Selected Projects */}
          {selectedProjects.size > 0 && (
            <StackItem>
              <Card>
                <CardBody>
                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <Title headingLevel="h4" size="md">
                        Selected Projects ({selectedProjects.size})
                      </Title>
                    </FlexItem>
                    <FlexItem>
                      <LabelGroup>
                        {Array.from(selectedProjects).map((projectName) => (
                          <Label
                            key={projectName}
                            color="blue"
                            variant="filled"
                            onClose={() => handleRemoveProject(projectName)}
                            closeBtnAriaLabel={`Remove ${projectName}`}
                          >
                            {projectName}
                          </Label>
                        ))}
                      </LabelGroup>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            </StackItem>
          )}

          {/* Search and Available Projects */}
          <StackItem>
            {projects.length === 0 ? (
              <Alert variant={AlertVariant.warning} isInline title="No projects available">
                No projects are available. Please ensure you have access to at least one project.
              </Alert>
            ) : (
              <Card>
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      <SearchInput
                        placeholder="Filter projects by name"
                        value={searchText}
                        onChange={(_, value) => setSearchText(value)}
                        onClear={() => setSearchText('')}
                        resultsCount={`${availableProjects.length} available`}
                      />
                    </StackItem>
                    <StackItem>
                      {availableProjects.length === 0 ? (
                        <Alert
                          variant={AlertVariant.info}
                          isInline
                          title={
                            searchText.trim()
                              ? 'No projects match your search'
                              : 'All projects are selected'
                          }
                        >
                          {searchText.trim()
                            ? 'Try adjusting your search filter.'
                            : 'All available projects have been selected.'}
                        </Alert>
                      ) : (
                        <div
                          style={{
                            maxHeight: '250px',
                            overflowY: 'auto',
                            border: '1px solid var(--pf-v6-global--BorderColor--200)',
                            borderRadius: 'var(--pf-v6-global--BorderRadius--sm)',
                            padding: 'var(--pf-v6-global--spacer--sm)',
                          }}
                        >
                          <Grid hasGutter>
                            {availableProjects.map((project) => {
                              const projectName = project.metadata.name;
                              return (
                                <GridItem key={projectName} sm={12} md={6} lg={4}>
                                  <Button
                                    variant="plain"
                                    onClick={() => handleAddProject(projectName)}
                                    style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: 'var(--pf-v6-global--spacer--xs)',
                                      cursor: 'pointer',
                                      justifyContent: 'space-between',
                                    }}
                                    aria-label={`Add project ${projectName}`}
                                  >
                                    <Flex
                                      justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                      alignItems={{ default: 'alignItemsCenter' }}
                                      style={{ width: '100%' }}
                                    >
                                      <FlexItem>{projectName}</FlexItem>
                                      <FlexItem>
                                        <Badge isRead>+ Add</Badge>
                                      </FlexItem>
                                    </Flex>
                                  </Button>
                                </GridItem>
                              );
                            })}
                          </Grid>
                        </div>
                      )}
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            )}
          </StackItem>

          {/* Error Message */}
          {error && (
            <StackItem>
              <Alert variant={AlertVariant.danger} isInline title="Error">
                {error}
              </Alert>
            </StackItem>
          )}

          {/* Loading State */}
          {isApproving && (
            <StackItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Spinner size="sm" />
                </FlexItem>
                <FlexItem>
                  <span>Approving server to {selectedProjects.size} project(s)...</span>
                </FlexItem>
              </Flex>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Badge isRead>{selectedProjects.size} project(s) selected</Badge>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button variant="secondary" onClick={handleCancel} isDisabled={isApproving}>
                  Cancel
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  icon={<CheckCircleIcon />}
                  onClick={handleApprove}
                  isDisabled={selectedProjects.size === 0 || isApproving}
                >
                  Approve Server
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};
