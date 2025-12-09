import * as React from 'react';
import {
  Alert,
  Button,
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  TabTitleText,
  TextInput,
  Radio,
  FormSelect,
  FormSelectOption,
  Checkbox,
  Label,
} from '@patternfly/react-core';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { McpRegistry, McpRegistryRegistryEntry } from '../types/registry';
import { importCatalogToRegistry, deleteDeployment } from '../api/k8s/mcp';
import useConfigMaps from '../hooks/useConfigMaps';
import {
  validateGitRepository,
  validateConfigMap,
  discoverTagsFromGit,
  discoverTagsFromConfigMap,
  GitValidationResult,
  ConfigMapValidationResult,
} from '../utils/registryValidation';

interface McpCatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mcpRegistry: McpRegistry; // The MCPRegistry instance to import into
}

enum CatalogImportTab {
  DATA_SOURCES = 'data-sources',
  SYNC_POLICY = 'sync-policy',
  FILTER = 'filter',
}

type SourceType = 'git' | 'configmap' | 'http';

interface CatalogFormData {
  catalogName: string;
  sourceType: SourceType;
  // Git source fields
  gitRepository: string;
  gitBranch: string;
  gitPath: string;
  // ConfigMap source fields
  configMapName: string;
  configMapKey: string;
  // HTTP source fields
  httpUrl: string;
  // Sync policy
  syncInterval: string;
  enableAutoSync: boolean;
  // Filter fields
  enableFiltering: boolean;
  includeNamePatterns: string[];
  excludeNamePatterns: string[];
  includeTags: string[];
  excludeTags: string[];
  // Temporary input fields for adding new name patterns
  newIncludeNamePattern: string;
  newExcludeNamePattern: string;
  // Discovered tags for auto-completion
  discoveredTags: string[];
}

const initialFormData: CatalogFormData = {
  catalogName: '',
  sourceType: 'git',
  gitRepository: '',
  gitBranch: 'main',
  gitPath: '',
  configMapName: '',
  configMapKey: '',
  httpUrl: '',
  syncInterval: '5m',
  enableAutoSync: true,
  enableFiltering: false,
  includeNamePatterns: [],
  excludeNamePatterns: [],
  includeTags: [],
  excludeTags: [],
  newIncludeNamePattern: '',
  newExcludeNamePattern: '',
  discoveredTags: [],
};

const syncIntervalOptions = [
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
];

export const McpCatalogImportModal: React.FC<McpCatalogImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mcpRegistry,
}) => {
  const notification = useNotification();
  const { preferredProject } = React.useContext(ProjectsContext);
  const [activeTabKey, setActiveTabKey] = React.useState<string>(CatalogImportTab.DATA_SOURCES);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [showRestartInfo, setShowRestartInfo] = React.useState(false);

  // Validation state
  const [gitValidation, setGitValidation] = React.useState<GitValidationResult | null>(null);
  const [configMapValidation, setConfigMapValidation] =
    React.useState<ConfigMapValidationResult | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  // Load ConfigMaps for the current namespace
  const registryNamespace = mcpRegistry.metadata?.namespace || preferredProject?.metadata.name;
  const [configMaps, configMapsLoaded] = useConfigMaps(registryNamespace);

  const [formData, setFormData] = React.useState<CatalogFormData>(initialFormData);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setActiveTabKey(CatalogImportTab.DATA_SOURCES);
      setError(undefined);
      setShowRestartInfo(false);
    }
  }, [isOpen]);

  const updateFormData = (updates: Partial<CatalogFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Real-time validation for Git repositories
  React.useEffect(() => {
    const validateGitSource = async () => {
      if (formData.sourceType === 'git' && formData.gitRepository && formData.gitPath) {
        setIsValidating(true);
        try {
          const result = await validateGitRepository(
            formData.gitRepository,
            formData.gitBranch || 'main',
            formData.gitPath,
          );
          setGitValidation(result);

          // Discover tags if validation passes
          if (result.isValid) {
            const tagResult = await discoverTagsFromGit(
              formData.gitRepository,
              formData.gitBranch || 'main',
              formData.gitPath,
            );
            if (!tagResult.error) {
              updateFormData({ discoveredTags: tagResult.tags });
            }
          }
        } catch (validationError) {
          setGitValidation({
            isValid: false,
            error: 'Failed to validate Git repository',
          });
        }
        setIsValidating(false);
      } else if (formData.sourceType === 'git') {
        setGitValidation(null);
        updateFormData({ discoveredTags: [] });
      }
    };

    const timeoutId = setTimeout(validateGitSource, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [formData.sourceType, formData.gitRepository, formData.gitBranch, formData.gitPath]);

  // Real-time validation for ConfigMaps
  React.useEffect(() => {
    const validateConfigMapSource = async () => {
      if (
        formData.sourceType === 'configmap' &&
        formData.configMapName &&
        formData.configMapKey &&
        configMapsLoaded
      ) {
        setIsValidating(true);
        try {
          const result = validateConfigMap(
            formData.configMapName,
            formData.configMapKey,
            configMaps,
          );
          setConfigMapValidation(result);

          // Discover tags if validation passes
          if (result.isValid) {
            const selectedConfigMap = configMaps.find(
              (cm) => cm.metadata.name === formData.configMapName,
            );
            if (selectedConfigMap) {
              const tagResult = await discoverTagsFromConfigMap(
                selectedConfigMap,
                formData.configMapKey,
              );
              if (!tagResult.error) {
                updateFormData({ discoveredTags: tagResult.tags });
              }
            }
          }
        } catch (validationError) {
          setConfigMapValidation({
            isValid: false,
            error: 'Failed to validate ConfigMap',
          });
        }
        setIsValidating(false);
      } else if (formData.sourceType === 'configmap') {
        setConfigMapValidation(null);
        updateFormData({ discoveredTags: [] });
      }
    };

    const timeoutId = setTimeout(validateConfigMapSource, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [
    formData.sourceType,
    formData.configMapName,
    formData.configMapKey,
    configMaps,
    configMapsLoaded,
  ]);

  const hasContent = (value: string): boolean => !!value.trim().length;

  const validateForm = (): string | null => {
    // Catalog name is required
    if (!hasContent(formData.catalogName)) {
      return 'Catalog name is required';
    }

    // Source validation
    if (formData.sourceType === 'git') {
      if (!hasContent(formData.gitRepository)) {
        return 'Git repository URL is required';
      }
      if (!hasContent(formData.gitPath)) {
        return 'Git file path is required';
      }
      if (gitValidation && !gitValidation.isValid) {
        return gitValidation.error || 'Git repository validation failed';
      }
    } else if (formData.sourceType === 'configmap') {
      if (!hasContent(formData.configMapName)) {
        return 'ConfigMap name is required';
      }
      if (!hasContent(formData.configMapKey)) {
        return 'ConfigMap key is required';
      }
      if (configMapValidation && !configMapValidation.isValid) {
        return configMapValidation.error || 'ConfigMap validation failed';
      }
    } else if (!hasContent(formData.httpUrl)) {
      // sourceType must be 'http' here
      return 'HTTP URL is required';
    }

    return null;
  };

  const canSubmit = (): boolean => {
    return !isSubmitting && validateForm() === null && !isValidating;
  };

  const onSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(new Error(validationError));
      return;
    }

    // Show restart information message
    if (!showRestartInfo) {
      setShowRestartInfo(true);
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const registryName = mcpRegistry.metadata?.name;
      const mcpRegistryNamespace = mcpRegistry.metadata?.namespace;

      if (!registryName || !mcpRegistryNamespace) {
        throw new Error('MCPRegistry is missing name or namespace');
      }

      // Build catalog entry
      const catalogEntry: McpRegistryRegistryEntry = {
        name: formData.catalogName.trim(),
        format: 'toolhive',
      };

      // Add source-specific configuration
      if (formData.sourceType === 'git') {
        catalogEntry.git = {
          repository: formData.gitRepository.trim(),
          branch: formData.gitBranch.trim() || 'main',
          path: formData.gitPath.trim(),
        };
      } else if (formData.sourceType === 'configmap') {
        catalogEntry.configMapRef = {
          name: formData.configMapName.trim(),
          key: formData.configMapKey.trim(),
        };
      } else {
        catalogEntry.http = {
          url: formData.httpUrl.trim(),
        };
      }

      // Add sync policy if enabled
      if (formData.enableAutoSync) {
        catalogEntry.syncPolicy = {
          enabled: true,
          interval: formData.syncInterval,
        };
      }

      // Add filter configuration if filtering is enabled
      if (formData.enableFiltering) {
        const hasNameFilters =
          formData.includeNamePatterns.length > 0 || formData.excludeNamePatterns.length > 0;
        const hasTagFilters = formData.includeTags.length > 0 || formData.excludeTags.length > 0;

        if (hasNameFilters || hasTagFilters) {
          catalogEntry.filter = {};

          if (formData.includeNamePatterns.length > 0) {
            catalogEntry.filter.include = formData.includeNamePatterns;
          }
          if (formData.excludeNamePatterns.length > 0) {
            catalogEntry.filter.exclude = formData.excludeNamePatterns;
          }

          if (hasTagFilters) {
            catalogEntry.filter.tags = {};
            if (formData.includeTags.length > 0) {
              catalogEntry.filter.tags.include = formData.includeTags;
            }
            if (formData.excludeTags.length > 0) {
              catalogEntry.filter.tags.exclude = formData.excludeTags;
            }
          }
        }
      }

      // Import catalog to registry
      await importCatalogToRegistry(registryName, mcpRegistryNamespace, catalogEntry);

      // Delete deployment as temporary workaround
      const deploymentName = `${registryName}-api`;
      try {
        await deleteDeployment(deploymentName, mcpRegistryNamespace);
      } catch (deploymentError) {
        // Log warning but don't fail the import
        console.warn('Failed to delete deployment:', deploymentError);
      }

      notification.success(
        'Catalog imported',
        `Catalog "${formData.catalogName}" has been successfully imported`,
      );

      onSuccess();
      onClose();
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : 'Unknown error occurred';
      setError(new Error(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancelClose = () => {
    if (!isSubmitting) {
      setFormData(initialFormData);
      setError(undefined);
      setShowRestartInfo(false);
      onClose();
    }
  };

  // Render methods will be added next - this is getting long, so I'll continue in next part
  const renderDataSourcesTab = () => (
    <FormSection title="Data Source Configuration" titleElement="h3">
      <FormGroup label="Catalog Name" isRequired fieldId="catalog-name">
        <TextInput
          id="catalog-name"
          name="catalog-name"
          value={formData.catalogName}
          onChange={(_, value) => updateFormData({ catalogName: value })}
          placeholder="Enter catalog name"
          isRequired
        />
        <HelperText>
          <HelperTextItem variant="indeterminate">
            A unique name for this catalog entry in the registry.
          </HelperTextItem>
        </HelperText>
      </FormGroup>

      <FormGroup label="Source Type" isRequired fieldId="source-type">
        <Radio
          isChecked={formData.sourceType === 'git'}
          name="source-type"
          onChange={() => updateFormData({ sourceType: 'git' })}
          label="Git Repository"
          id="source-type-git"
        />
        <Radio
          isChecked={formData.sourceType === 'configmap'}
          name="source-type"
          onChange={() => updateFormData({ sourceType: 'configmap' })}
          label="ConfigMap"
          id="source-type-configmap"
        />
        <Radio
          isChecked={formData.sourceType === 'http'}
          name="source-type"
          onChange={() => updateFormData({ sourceType: 'http' })}
          label="HTTP Endpoint"
          id="source-type-http"
        />
      </FormGroup>

      {formData.sourceType === 'git' && (
        <>
          <FormGroup label="Git Repository URL" isRequired fieldId="git-repository">
            <TextInput
              id="git-repository"
              name="git-repository"
              value={formData.gitRepository}
              onChange={(_, value) => updateFormData({ gitRepository: value })}
              placeholder="https://github.com/example/repo.git"
              isRequired
            />
          </FormGroup>

          <FormGroup label="Branch" fieldId="git-branch">
            <TextInput
              id="git-branch"
              name="git-branch"
              value={formData.gitBranch}
              onChange={(_, value) => updateFormData({ gitBranch: value })}
              placeholder="main"
            />
          </FormGroup>

          <FormGroup label="File Path" isRequired fieldId="git-path">
            <TextInput
              id="git-path"
              name="git-path"
              value={formData.gitPath}
              onChange={(_, value) => updateFormData({ gitPath: value })}
              placeholder="path/to/registry.json"
              isRequired
            />
          </FormGroup>

          {gitValidation && (
            <Alert
              variant={gitValidation.isValid ? 'success' : 'danger'}
              title={gitValidation.isValid ? 'Repository is valid' : 'Validation failed'}
              isInline
            >
              {gitValidation.error || 'Validation in progress...'}
            </Alert>
          )}
        </>
      )}

      {formData.sourceType === 'configmap' && (
        <>
          <FormGroup label="ConfigMap Name" isRequired fieldId="configmap-name">
            <FormSelect
              id="configmap-name"
              value={formData.configMapName}
              onChange={(_, value) => {
                updateFormData({ configMapName: value, configMapKey: '' });
              }}
              isRequired
            >
              <FormSelectOption key="empty" value="" label="Select a ConfigMap" />
              {configMaps.map((cm) => (
                <FormSelectOption
                  key={cm.metadata.name}
                  value={cm.metadata.name || ''}
                  label={cm.metadata.name || ''}
                />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="ConfigMap Key" isRequired fieldId="configmap-key">
            <FormSelect
              id="configmap-key"
              value={formData.configMapKey}
              onChange={(_, value) => updateFormData({ configMapKey: value })}
              isDisabled={!formData.configMapName}
              isRequired
            >
              <FormSelectOption key="empty" value="" label="Select a key" />
              {formData.configMapName &&
                configMaps.find((cm) => cm.metadata.name === formData.configMapName)?.data &&
                Object.keys(
                  configMaps.find((cm) => cm.metadata.name === formData.configMapName)?.data || {},
                ).map((key) => <FormSelectOption key={key} value={key} label={key} />)}
            </FormSelect>
          </FormGroup>

          {configMapValidation && (
            <Alert
              variant={configMapValidation.isValid ? 'success' : 'danger'}
              title={configMapValidation.isValid ? 'ConfigMap is valid' : 'Validation failed'}
              isInline
            >
              {configMapValidation.error || 'Validation in progress...'}
            </Alert>
          )}
        </>
      )}

      {formData.sourceType === 'http' && (
        <FormGroup label="HTTP URL" isRequired fieldId="http-url">
          <TextInput
            id="http-url"
            name="http-url"
            value={formData.httpUrl}
            onChange={(_, value) => updateFormData({ httpUrl: value })}
            placeholder="https://example.com/registry.json"
            isRequired
          />
        </FormGroup>
      )}
    </FormSection>
  );

  const renderSyncPolicyTab = () => (
    <FormSection title="Sync Policy Configuration" titleElement="h3">
      <FormGroup fieldId="enable-auto-sync">
        <Checkbox
          id="enable-auto-sync"
          name="enable-auto-sync"
          label="Enable automatic synchronization"
          isChecked={formData.enableAutoSync}
          onChange={(_, checked) => updateFormData({ enableAutoSync: checked })}
        />
        <HelperText>
          <HelperTextItem variant="indeterminate">
            Automatically sync the catalog at regular intervals.
          </HelperTextItem>
        </HelperText>
      </FormGroup>

      {formData.enableAutoSync && (
        <FormGroup label="Sync Interval" fieldId="sync-interval">
          <FormSelect
            id="sync-interval"
            value={formData.syncInterval}
            onChange={(_, value) => updateFormData({ syncInterval: value })}
          >
            {syncIntervalOptions.map((option) => (
              <FormSelectOption key={option.value} value={option.value} label={option.label} />
            ))}
          </FormSelect>
        </FormGroup>
      )}
    </FormSection>
  );

  const renderFilterTab = () => (
    <FormSection title="Filter Configuration" titleElement="h3">
      <FormGroup fieldId="enable-filtering">
        <Checkbox
          id="enable-filtering"
          name="enable-filtering"
          label="Enable filtering"
          isChecked={formData.enableFiltering}
          onChange={(_, checked) => updateFormData({ enableFiltering: checked })}
        />
        <HelperText>
          <HelperTextItem variant="indeterminate">
            Filter servers based on name patterns or tags.
          </HelperTextItem>
        </HelperText>
      </FormGroup>

      {formData.enableFiltering && (
        <>
          {/* Name Patterns Section */}
          <FormSection title="Name Patterns" titleElement="h4">
            <FormGroup label="Include Name Patterns" fieldId="include-name-patterns">
              <TextInput
                id="new-include-name-pattern"
                value={formData.newIncludeNamePattern}
                onChange={(_, value) => updateFormData({ newIncludeNamePattern: value })}
                placeholder="e.g., mcp-*, database-*"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.newIncludeNamePattern.trim()) {
                    e.preventDefault();
                    updateFormData({
                      includeNamePatterns: [
                        ...formData.includeNamePatterns,
                        formData.newIncludeNamePattern.trim(),
                      ],
                      newIncludeNamePattern: '',
                    });
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (formData.newIncludeNamePattern.trim()) {
                    updateFormData({
                      includeNamePatterns: [
                        ...formData.includeNamePatterns,
                        formData.newIncludeNamePattern.trim(),
                      ],
                      newIncludeNamePattern: '',
                    });
                  }
                }}
              >
                Add Pattern
              </Button>
              {formData.includeNamePatterns.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {formData.includeNamePatterns.map((pattern, index) => (
                    <Label key={index} color="green" variant="outline" isCompact>
                      {pattern}
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => {
                          updateFormData({
                            includeNamePatterns: formData.includeNamePatterns.filter(
                              (_, i) => i !== index,
                            ),
                          });
                        }}
                      >
                        ×
                      </Button>
                    </Label>
                  ))}
                </div>
              )}
            </FormGroup>

            <FormGroup label="Exclude Name Patterns" fieldId="exclude-name-patterns">
              <TextInput
                id="new-exclude-name-pattern"
                value={formData.newExcludeNamePattern}
                onChange={(_, value) => updateFormData({ newExcludeNamePattern: value })}
                placeholder="e.g., test-*, deprecated-*"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.newExcludeNamePattern.trim()) {
                    e.preventDefault();
                    updateFormData({
                      excludeNamePatterns: [
                        ...formData.excludeNamePatterns,
                        formData.newExcludeNamePattern.trim(),
                      ],
                      newExcludeNamePattern: '',
                    });
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (formData.newExcludeNamePattern.trim()) {
                    updateFormData({
                      excludeNamePatterns: [
                        ...formData.excludeNamePatterns,
                        formData.newExcludeNamePattern.trim(),
                      ],
                      newExcludeNamePattern: '',
                    });
                  }
                }}
              >
                Add Pattern
              </Button>
              {formData.excludeNamePatterns.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {formData.excludeNamePatterns.map((pattern, index) => (
                    <Label key={index} color="red" variant="outline" isCompact>
                      {pattern}
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => {
                          updateFormData({
                            excludeNamePatterns: formData.excludeNamePatterns.filter(
                              (_, i) => i !== index,
                            ),
                          });
                        }}
                      >
                        ×
                      </Button>
                    </Label>
                  ))}
                </div>
              )}
            </FormGroup>
          </FormSection>

          {/* Tag Filters Section */}
          <FormSection title="Tag Filters" titleElement="h4">
            {formData.discoveredTags.length > 0 && (
              <FormGroup label="Available Tags" fieldId="discovered-tags">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {formData.discoveredTags.map((tag, index) => {
                    const isIncluded = formData.includeTags.includes(tag);
                    const isExcluded = formData.excludeTags.includes(tag);
                    return (
                      <Label
                        key={index}
                        color={isIncluded ? 'green' : isExcluded ? 'red' : 'blue'}
                        variant={isIncluded || isExcluded ? 'filled' : 'outline'}
                        isCompact
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (isIncluded) {
                            updateFormData({
                              includeTags: formData.includeTags.filter((t) => t !== tag),
                            });
                          } else if (isExcluded) {
                            updateFormData({
                              excludeTags: formData.excludeTags.filter((t) => t !== tag),
                            });
                          } else {
                            updateFormData({
                              includeTags: [...formData.includeTags, tag],
                            });
                          }
                        }}
                      >
                        {tag} {isIncluded ? '✓' : isExcluded ? '✗' : '+'}
                      </Label>
                    );
                  })}
                </div>
              </FormGroup>
            )}
          </FormSection>
        </>
      )}
    </FormSection>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen onClose={onCancelClose} variant="medium" data-testid="mcp-catalog-import-modal">
      <ModalHeader title="Import Catalog" />
      <ModalBody>
        {showRestartInfo && (
          <Alert
            variant="info"
            title="Registry API Deployment Restart"
            className="pf-u-mb-md"
            isInline
          >
            The registry API deployment will be restarted to apply the new catalog configuration.
            This may cause a brief service interruption.
          </Alert>
        )}
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Catalog import tabs"
          role="region"
        >
          <Tab
            eventKey={CatalogImportTab.DATA_SOURCES}
            title={<TabTitleText>Data Sources</TabTitleText>}
            aria-label="Data sources configuration tab"
          >
            {renderDataSourcesTab()}
          </Tab>
          <Tab
            eventKey={CatalogImportTab.SYNC_POLICY}
            title={<TabTitleText>Sync Policy</TabTitleText>}
            aria-label="Sync policy configuration tab"
          >
            {renderSyncPolicyTab()}
          </Tab>
          <Tab
            eventKey={CatalogImportTab.FILTER}
            title={<TabTitleText>Filter</TabTitleText>}
            aria-label="Filter configuration tab"
          >
            {renderFilterTab()}
          </Tab>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onCancelClose}
          onSubmit={onSubmit}
          submitLabel={showRestartInfo ? 'Import' : 'Continue'}
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle="Error importing catalog"
        />
      </ModalFooter>
    </Modal>
  );
};
