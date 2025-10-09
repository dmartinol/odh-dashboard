import * as React from 'react';
import {
  Alert,
  Button,
  Form,
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
import {
  isValidK8sName,
  translateDisplayNameForK8s,
} from '@odh-dashboard/internal/concepts/k8s/utils';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { McpRegistry } from '../types/registry';
import { createMcpRegistry, updateMcpRegistry } from '../api/k8s/mcp';
import useConfigMaps from '../hooks/useConfigMaps';
import {
  validateGitRepository,
  validateConfigMap,
  discoverTagsFromGit,
  discoverTagsFromConfigMap,
  GitValidationResult,
  ConfigMapValidationResult,
} from '../utils/registryValidation';

interface McpRegistryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRegistry?: McpRegistry; // Optional: if provided, we're in edit mode
}

enum RegistryCreateTab {
  GENERAL = 'general',
  DATA_SOURCES = 'data-sources',
  SYNC_POLICY = 'sync-policy',
  FILTER = 'filter',
}

type SourceType = 'git' | 'configmap';

interface RegistryFormData {
  sourceType: SourceType;
  // Git source fields
  gitRepository: string;
  gitBranch: string;
  gitPath: string;
  // ConfigMap source fields
  configMapName: string;
  configMapKey: string;
  // Sync policy
  syncInterval: string;
  enableAutoSync: boolean;
  // Filter fields
  enableFiltering: boolean;
  includeNamePatterns: string[];
  excludeNamePatterns: string[];
  includeTags: string[];
  excludeTags: string[];
  // Temporary input fields for adding new name patterns (keep for name patterns only)
  newIncludeNamePattern: string;
  newExcludeNamePattern: string;
  // Discovered tags for auto-completion
  discoveredTags: string[];
}

const initialFormData: RegistryFormData = {
  sourceType: 'git',
  gitRepository: '',
  gitBranch: 'main',
  gitPath: '',
  configMapName: '',
  configMapKey: '',
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

// Function to map registry to form data for editing
const mapRegistryToFormData = (registry: McpRegistry): RegistryFormData => {
  const { spec } = registry;

  return {
    sourceType:
      spec.source?.type === 'git' || spec.source?.type === 'configmap' ? spec.source.type : 'git',
    gitRepository: spec.source?.git?.repository || '',
    gitBranch: spec.source?.git?.branch || 'main',
    gitPath: spec.source?.git?.path || '',
    configMapName: spec.source?.configmap?.name || '',
    configMapKey: spec.source?.configmap?.key || '',
    syncInterval: spec.syncPolicy?.interval || '5m',
    enableAutoSync: spec.syncPolicy?.enabled ?? true,
    enableFiltering: !!(
      spec.filter?.include?.length ||
      spec.filter?.exclude?.length ||
      spec.filter?.tags
    ),
    includeNamePatterns: spec.filter?.include || [],
    excludeNamePatterns: spec.filter?.exclude || [],
    includeTags: spec.filter?.tags?.include || [],
    excludeTags: spec.filter?.tags?.exclude || [],
    newIncludeNamePattern: '',
    newExcludeNamePattern: '',
    discoveredTags: [],
  };
};

export const McpRegistryCreateModal: React.FC<McpRegistryCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editRegistry,
}) => {
  const { preferredProject } = React.useContext(ProjectsContext);
  const [activeTabKey, setActiveTabKey] = React.useState<string>(RegistryCreateTab.GENERAL);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  // Validation state
  const [gitValidation, setGitValidation] = React.useState<GitValidationResult | null>(null);
  const [configMapValidation, setConfigMapValidation] =
    React.useState<ConfigMapValidationResult | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  // Determine if we're in edit mode
  const isEditMode = !!editRegistry;

  // Load ConfigMaps for the current namespace
  const currentNamespace = isEditMode
    ? editRegistry.metadata?.namespace
    : preferredProject?.metadata.name;
  const [configMaps, configMapsLoaded] = useConfigMaps(currentNamespace);

  // Use appropriate initial form data
  const [formData, setFormData] = React.useState<RegistryFormData>(() =>
    isEditMode ? mapRegistryToFormData(editRegistry) : initialFormData,
  );

  // Initialize name/description for edit mode
  const initialNameDesc = React.useMemo(() => {
    if (editRegistry) {
      return {
        name: editRegistry.spec.displayName || editRegistry.metadata?.name || '',
        description: editRegistry.spec.description || '',
        k8sName: editRegistry.metadata?.name || '',
      };
    }
    return undefined;
  }, [editRegistry?.metadata?.name]);

  const { data: nameDesc, onDataChange: setNameDesc } = useK8sNameDescriptionFieldData({
    initialData: initialNameDesc,
  });

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      const formDataToUse = editRegistry ? mapRegistryToFormData(editRegistry) : initialFormData;
      setFormData(formDataToUse);

      // Name/description are handled by initialNameDesc in useK8sNameDescriptionFieldData
      if (!editRegistry) {
        // Clear form for creating new registry
        setNameDesc('name', '');
        setNameDesc('description', '');
        setNameDesc('k8sName', '');
      }

      setActiveTabKey(RegistryCreateTab.GENERAL);
      setError(undefined);
    }
  }, [isOpen, isEditMode, editRegistry?.metadata?.name, setNameDesc]); // Use stable reference

  const updateFormData = (updates: Partial<RegistryFormData>) => {
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
    // Basic validation
    if (!hasContent(nameDesc.name)) {
      return 'Display name is required';
    }

    // In edit mode, use existing k8s name; in create mode, validate the generated name
    const k8sName = editRegistry
      ? editRegistry.metadata?.name || ''
      : nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name);
    if (!isValidK8sName(k8sName)) {
      return 'Invalid Kubernetes name';
    }

    // Source validation
    if (formData.sourceType === 'git') {
      if (!hasContent(formData.gitRepository)) {
        return 'Git repository URL is required';
      }
      if (!hasContent(formData.gitPath)) {
        return 'Git file path is required';
      }
    } else {
      if (!hasContent(formData.configMapName)) {
        return 'ConfigMap name is required';
      }
      if (!hasContent(formData.configMapKey)) {
        return 'ConfigMap key is required';
      }
    }

    return null;
  };

  const canSubmit = (): boolean => {
    return !isSubmitting && validateForm() === null;
  };

  const onSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(new Error(validationError));
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const k8sName = isEditMode
        ? editRegistry.metadata?.name || ''
        : nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name);

      const namespace = isEditMode
        ? editRegistry.metadata?.namespace || ''
        : preferredProject?.metadata.name || '';

      if (!namespace) {
        throw new Error('No project selected');
      }

      // Build the registry spec based on form data
      const registryData: McpRegistry = {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPRegistry',
        metadata: {
          name: k8sName,
          namespace,
          annotations: {
            ...(isEditMode && editRegistry.metadata?.annotations
              ? editRegistry.metadata.annotations
              : {}),
            // Ensure our display name and description override any existing annotations
            'openshift.io/display-name': nameDesc.name.trim(),
            'openshift.io/description': nameDesc.description || '',
          },
          ...(isEditMode && editRegistry.metadata
            ? {
                resourceVersion: editRegistry.metadata.resourceVersion,
                uid: editRegistry.metadata.uid,
                creationTimestamp: editRegistry.metadata.creationTimestamp,
              }
            : {}),
        },
        spec: {
          displayName: nameDesc.name.trim(),
          description: nameDesc.description,
          source: {
            type: formData.sourceType,
            format: 'toolhive',
          },
        },
      };

      // Add source-specific configuration
      if (formData.sourceType === 'git') {
        if (registryData.spec.source) {
          registryData.spec.source.git = {
            repository: formData.gitRepository.trim(),
            branch: formData.gitBranch.trim() || 'main',
            path: formData.gitPath.trim(),
          };
        }
      } else if (registryData.spec.source) {
        registryData.spec.source.configmap = {
          name: formData.configMapName.trim(),
          key: formData.configMapKey.trim(),
        };
      }

      // Add sync policy if enabled
      if (formData.enableAutoSync) {
        registryData.spec.syncPolicy = {
          enabled: true,
          interval: formData.syncInterval,
        };
      }

      // Add filter configuration if filtering is enabled and any filters are defined
      if (formData.enableFiltering) {
        const hasNameFilters =
          formData.includeNamePatterns.length > 0 || formData.excludeNamePatterns.length > 0;
        const hasTagFilters = formData.includeTags.length > 0 || formData.excludeTags.length > 0;

        if (hasNameFilters || hasTagFilters) {
          registryData.spec.filter = {};

          // Add name patterns to include/exclude arrays
          if (formData.includeNamePatterns.length > 0) {
            registryData.spec.filter.include = formData.includeNamePatterns;
          }
          if (formData.excludeNamePatterns.length > 0) {
            registryData.spec.filter.exclude = formData.excludeNamePatterns;
          }

          // Add tag filters
          if (formData.includeTags.length > 0 || formData.excludeTags.length > 0) {
            registryData.spec.filter.tags = {};
            if (formData.includeTags.length > 0) {
              registryData.spec.filter.tags.include = formData.includeTags;
            }
            if (formData.excludeTags.length > 0) {
              registryData.spec.filter.tags.exclude = formData.excludeTags;
            }
          }
        }
      }

      // Use create or update based on edit mode
      if (isEditMode) {
        await updateMcpRegistry(registryData);
      } else {
        await createMcpRegistry(registryData);
      }
      onSuccess();
      onClose();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      setIsSubmitting(false);
    }
  };

  const onCancelClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const renderGeneralTab = () => (
    <Form>
      <K8sNameDescriptionField
        dataTestId="mcp-registry"
        data={nameDesc}
        onDataChange={setNameDesc}
      />
    </Form>
  );

  const renderDataSourcesTab = () => (
    <Form>
      <FormSection title="Source Type" titleElement="h3">
        <FormGroup fieldId="source-type" isRequired>
          <Radio
            id="source-git"
            name="source-type"
            label="Git Repository"
            description="Load registry data from a Git repository file"
            isChecked={formData.sourceType === 'git'}
            onChange={() => updateFormData({ sourceType: 'git' })}
          />
          <Radio
            id="source-configmap"
            name="source-type"
            label="ConfigMap"
            description="Load registry data from a Kubernetes ConfigMap"
            isChecked={formData.sourceType === 'configmap'}
            onChange={() => updateFormData({ sourceType: 'configmap' })}
          />
        </FormGroup>
      </FormSection>

      {formData.sourceType === 'git' && (
        <FormSection title="Git Configuration" titleElement="h3">
          <FormGroup label="Repository URL" isRequired fieldId="git-repository">
            <TextInput
              isRequired
              type="url"
              id="git-repository"
              name="git-repository"
              value={formData.gitRepository}
              onChange={(_, value) => updateFormData({ gitRepository: value })}
              placeholder="https://github.com/user/repo.git"
              validated={
                gitValidation === null ? 'default' : gitValidation.isValid ? 'success' : 'error'
              }
            />
            <HelperText>
              <HelperTextItem
                variant={
                  gitValidation === null
                    ? 'indeterminate'
                    : gitValidation.isValid
                    ? 'success'
                    : 'error'
                }
              >
                {gitValidation?.error ?? 'The Git repository URL containing the registry data'}
                {isValidating && ' (validating...)'}
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="Branch" fieldId="git-branch">
            <TextInput
              type="text"
              id="git-branch"
              name="git-branch"
              value={formData.gitBranch}
              onChange={(_, value) => updateFormData({ gitBranch: value })}
              placeholder="main"
              validated={
                gitValidation === null
                  ? 'default'
                  : gitValidation.details?.branchValid === false
                  ? 'error'
                  : 'success'
              }
            />
            <HelperText>
              <HelperTextItem
                variant={
                  gitValidation === null
                    ? 'indeterminate'
                    : gitValidation.details?.branchValid === false
                    ? 'error'
                    : 'success'
                }
              >
                {gitValidation?.details?.branchValid === false
                  ? 'Invalid branch name format'
                  : 'The Git branch to use (defaults to main)'}
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="File Path" isRequired fieldId="git-path">
            <TextInput
              isRequired
              type="text"
              id="git-path"
              name="git-path"
              value={formData.gitPath}
              onChange={(_, value) => updateFormData({ gitPath: value })}
              placeholder="registry.json"
              validated={
                gitValidation === null ? 'default' : gitValidation.isValid ? 'success' : 'error'
              }
            />
            <HelperText>
              <HelperTextItem
                variant={
                  gitValidation === null
                    ? 'indeterminate'
                    : gitValidation.isValid
                    ? 'success'
                    : 'error'
                }
              >
                {gitValidation?.details?.pathValid === false
                  ? 'Invalid file path format'
                  : 'Path to the registry file within the repository'}
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </FormSection>
      )}

      {formData.sourceType === 'configmap' && (
        <FormSection title="ConfigMap Configuration" titleElement="h3">
          <FormGroup label="ConfigMap Name" isRequired fieldId="configmap-name">
            <FormSelect
              isRequired
              id="configmap-name"
              name="configmap-name"
              value={formData.configMapName}
              onChange={(_, value) => {
                updateFormData({
                  configMapName: value,
                  configMapKey: '', // Reset key when ConfigMap changes
                });
              }}
              validated={
                configMapValidation === null
                  ? 'default'
                  : configMapValidation.isValid
                  ? 'success'
                  : 'error'
              }
              isDisabled={!configMapsLoaded}
            >
              <FormSelectOption value="" label="Select a ConfigMap" isDisabled />
              {configMaps.map((configMap) => (
                <FormSelectOption
                  key={configMap.metadata.name}
                  value={configMap.metadata.name || ''}
                  label={configMap.metadata.name || 'Unknown'}
                />
              ))}
            </FormSelect>
            <HelperText>
              <HelperTextItem
                variant={
                  configMapValidation === null
                    ? 'indeterminate'
                    : configMapValidation.isValid
                    ? 'success'
                    : 'error'
                }
              >
                {configMapValidation?.error || 'Name of the ConfigMap containing the registry data'}
                {isValidating && ' (validating...)'}
                {!configMapsLoaded && ' (loading ConfigMaps...)'}
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="ConfigMap Key" isRequired fieldId="configmap-key">
            {(() => {
              const selectedConfigMap = configMaps.find(
                (cm) => cm.metadata.name === formData.configMapName,
              );
              const availableKeys = selectedConfigMap?.data
                ? Object.keys(selectedConfigMap.data)
                : [];

              return availableKeys.length > 0 ? (
                <FormSelect
                  isRequired
                  id="configmap-key"
                  name="configmap-key"
                  value={formData.configMapKey}
                  onChange={(_, value) => updateFormData({ configMapKey: value })}
                  validated={
                    configMapValidation === null
                      ? 'default'
                      : configMapValidation.isValid
                      ? 'success'
                      : 'error'
                  }
                  isDisabled={!formData.configMapName}
                >
                  <FormSelectOption value="" label="Select a key" isDisabled />
                  {availableKeys.map((key) => (
                    <FormSelectOption key={key} value={key} label={key} />
                  ))}
                </FormSelect>
              ) : (
                <TextInput
                  isRequired
                  type="text"
                  id="configmap-key"
                  name="configmap-key"
                  value={formData.configMapKey}
                  onChange={(_, value) => updateFormData({ configMapKey: value })}
                  placeholder="registry.json"
                  validated={
                    configMapValidation === null
                      ? 'default'
                      : configMapValidation.isValid
                      ? 'success'
                      : 'error'
                  }
                  isDisabled={!formData.configMapName}
                />
              );
            })()}
            <HelperText>
              <HelperTextItem
                variant={
                  configMapValidation === null
                    ? 'indeterminate'
                    : configMapValidation.isValid
                    ? 'success'
                    : 'error'
                }
              >
                {configMapValidation?.error ??
                  'Key within the ConfigMap that contains the registry data'}
                {!formData.configMapName && ' (select a ConfigMap first)'}
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </FormSection>
      )}
    </Form>
  );

  const renderSyncPolicyTab = () => (
    <Form>
      <FormSection title="Synchronization Settings" titleElement="h3">
        <FormGroup fieldId="enable-auto-sync">
          <Checkbox
            id="enable-auto-sync"
            name="enable-auto-sync"
            label="Enable automatic synchronization"
            description="Automatically sync registry data at regular intervals"
            isChecked={formData.enableAutoSync}
            onChange={(_, checked) => updateFormData({ enableAutoSync: checked })}
          />
        </FormGroup>

        {formData.enableAutoSync && (
          <FormGroup label="Sync Interval" isRequired fieldId="sync-interval">
            <FormSelect
              id="sync-interval"
              name="sync-interval"
              value={formData.syncInterval}
              onChange={(_, value) => updateFormData({ syncInterval: value })}
            >
              {syncIntervalOptions.map((option) => (
                <FormSelectOption key={option.value} value={option.value} label={option.label} />
              ))}
            </FormSelect>
            <HelperText>
              <HelperTextItem>How often to check for updates from the source</HelperTextItem>
            </HelperText>
          </FormGroup>
        )}
      </FormSection>
    </Form>
  );

  const renderFilterTab = () => (
    <Form>
      <FormSection title="Data Filtering Configuration" titleElement="h3">
        <HelperText>
          <HelperTextItem>
            Configure optional filters to limit which servers are imported from the registry source.
            By default, all servers in the registry will be imported.
          </HelperTextItem>
        </HelperText>

        {/* Enable/Disable Filtering */}
        <FormGroup fieldId="enable-filtering">
          <Checkbox
            id="enable-filtering"
            name="enable-filtering"
            label="Enable Data Filtering"
            description="Apply filters to selectively import servers from the registry"
            isChecked={formData.enableFiltering}
            onChange={(_, checked) => updateFormData({ enableFiltering: checked })}
          />
        </FormGroup>

        {formData.enableFiltering && (
          <>
            {/* Name Filters Section */}
            <FormSection title="🔍 Server Name Filters" titleElement="h4">
              <HelperText>
                <HelperTextItem>
                  Configure patterns to include or exclude servers by name. Supports wildcards (*)
                  and regex patterns.
                </HelperTextItem>
              </HelperText>

              {/* Include Name Patterns */}
              <FormGroup label="✓ Include Name Patterns" fieldId="include-name-patterns">
                <HelperText>
                  <HelperTextItem variant="indeterminate">
                    Only import servers whose names match these patterns.
                  </HelperTextItem>
                </HelperText>
                <TextInput
                  type="text"
                  id="new-include-name-pattern"
                  name="new-include-name-pattern"
                  value={formData.newIncludeNamePattern || ''}
                  onChange={(_, value) => updateFormData({ newIncludeNamePattern: value })}
                  placeholder="e.g., mcp-*, database-*, *-tool"
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
                  isDisabled={!formData.newIncludeNamePattern.trim()}
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
                            const updated = formData.includeNamePatterns.filter(
                              (_, i) => i !== index,
                            );
                            updateFormData({ includeNamePatterns: updated });
                          }}
                          style={{ marginLeft: '4px', padding: '0', minWidth: 'auto' }}
                        >
                          ×
                        </Button>
                      </Label>
                    ))}
                  </div>
                )}
              </FormGroup>

              {/* Exclude Name Patterns */}
              <FormGroup label="✗ Exclude Name Patterns" fieldId="exclude-name-patterns">
                <HelperText>
                  <HelperTextItem variant="indeterminate">
                    Skip servers whose names match these patterns.
                  </HelperTextItem>
                </HelperText>
                <TextInput
                  type="text"
                  id="new-exclude-name-pattern"
                  name="new-exclude-name-pattern"
                  value={formData.newExcludeNamePattern || ''}
                  onChange={(_, value) => updateFormData({ newExcludeNamePattern: value })}
                  placeholder="e.g., test-*, deprecated-*, *-legacy"
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
                  isDisabled={!formData.newExcludeNamePattern.trim()}
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
                            const updated = formData.excludeNamePatterns.filter(
                              (_, i) => i !== index,
                            );
                            updateFormData({ excludeNamePatterns: updated });
                          }}
                          style={{ marginLeft: '4px', padding: '0', minWidth: 'auto' }}
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
            <FormSection title="🏷️ Tag Filters" titleElement="h4">
              <HelperText>
                <HelperTextItem>
                  Configure tags to include or exclude servers. Tag names are case-sensitive.
                </HelperTextItem>
              </HelperText>

              {/* Discovered Tags */}
              <FormGroup label="Available Tags" fieldId="discovered-tags">
                {formData.discoveredTags.length > 0 ? (
                  <>
                    <HelperText>
                      <HelperTextItem variant="indeterminate">
                        Tags discovered from the registry source. Click the &quot;+&quot; to include
                        or &quot;✗&quot; to exclude tags from your filter.
                      </HelperTextItem>
                    </HelperText>
                    <div
                      style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}
                    >
                      {formData.discoveredTags.map((tag, index) => {
                        const isIncluded = formData.includeTags.includes(tag);
                        const isExcluded = formData.excludeTags.includes(tag);

                        return (
                          <div key={index} style={{ display: 'flex', gap: '2px' }}>
                            <Label
                              color={isIncluded ? 'green' : 'blue'}
                              variant={isIncluded ? 'filled' : 'outline'}
                              isCompact
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (isIncluded) {
                                  // Remove from include list if already included
                                  updateFormData({
                                    includeTags: formData.includeTags.filter((t) => t !== tag),
                                  });
                                } else {
                                  // Add to include list and remove from exclude if present
                                  updateFormData({
                                    includeTags: [...formData.includeTags, tag],
                                    excludeTags: formData.excludeTags.filter((t) => t !== tag),
                                  });
                                }
                              }}
                            >
                              {tag} {isIncluded ? '✓' : '+'}
                            </Label>
                            <Label
                              color={isExcluded ? 'red' : 'grey'}
                              variant={isExcluded ? 'filled' : 'outline'}
                              isCompact
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (isExcluded) {
                                  // Remove from exclude list if already excluded
                                  updateFormData({
                                    excludeTags: formData.excludeTags.filter((t) => t !== tag),
                                  });
                                } else {
                                  // Add to exclude list and remove from include if present
                                  updateFormData({
                                    excludeTags: [...formData.excludeTags, tag],
                                    includeTags: formData.includeTags.filter((t) => t !== tag),
                                  });
                                }
                              }}
                            >
                              ✗
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <HelperText>
                    <HelperTextItem variant="indeterminate">
                      {isValidating
                        ? 'Discovering tags from registry source...'
                        : 'No tags discovered. Configure your registry source to see available tags for filtering.'}
                    </HelperTextItem>
                  </HelperText>
                )}
              </FormGroup>

              {/* Include Tags */}
              <FormGroup label="✓ Include Tags" fieldId="include-tags">
                <HelperText>
                  <HelperTextItem variant="indeterminate">
                    Only import servers that have at least one of these tags. Use the available tags
                    above to add tags by clicking the &quot;+&quot; button.
                  </HelperTextItem>
                </HelperText>
                {formData.includeTags.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {formData.includeTags.map((tag, index) => (
                      <Label key={index} color="green" variant="outline" isCompact>
                        {tag}
                        <Button
                          variant="plain"
                          size="sm"
                          onClick={() => {
                            const updated = formData.includeTags.filter((_, i) => i !== index);
                            updateFormData({ includeTags: updated });
                          }}
                          style={{ marginLeft: '4px', padding: '0', minWidth: 'auto' }}
                        >
                          ×
                        </Button>
                      </Label>
                    ))}
                  </div>
                )}
              </FormGroup>

              {/* Exclude Tags */}
              <FormGroup label="✗ Exclude Tags" fieldId="exclude-tags">
                <HelperText>
                  <HelperTextItem variant="indeterminate">
                    Skip servers that have any of these tags. Use the available tags above to add
                    tags by clicking the &quot;✗&quot; button.
                  </HelperTextItem>
                </HelperText>
                {formData.excludeTags.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {formData.excludeTags.map((tag, index) => (
                      <Label key={index} color="red" variant="outline" isCompact>
                        {tag}
                        <Button
                          variant="plain"
                          size="sm"
                          onClick={() => {
                            const updated = formData.excludeTags.filter((_, i) => i !== index);
                            updateFormData({ excludeTags: updated });
                          }}
                          style={{ marginLeft: '4px', padding: '0', minWidth: 'auto' }}
                        >
                          ×
                        </Button>
                      </Label>
                    ))}
                  </div>
                )}
              </FormGroup>
            </FormSection>

            {/* Filter Logic Explanation */}
            <Alert variant="info" title="Filter Logic" isInline>
              <p>
                <strong>Name Filtering:</strong>
              </p>
              <ul>
                <li>
                  If include patterns exist: Server name must match <strong>at least one</strong>{' '}
                  include pattern
                </li>
                <li>
                  If exclude patterns exist: Server name must <strong>not match any</strong> exclude
                  pattern
                </li>
              </ul>
              <p>
                <strong>Tag Filtering:</strong>
              </p>
              <ul>
                <li>
                  If include tags exist: Server must have <strong>at least one</strong> include tag
                </li>
                <li>
                  If exclude tags exist: Server must <strong>not have any</strong> exclude tag
                </li>
              </ul>
              <p>
                <strong>Combined Logic:</strong> All active filters must pass (AND logic between
                name and tag filters)
              </p>
            </Alert>
          </>
        )}

        {!formData.enableFiltering && (
          <Alert variant="info" title="No filtering enabled" isInline>
            All servers from the registry source will be imported. This is recommended for most use
            cases unless you need to limit the registry contents.
          </Alert>
        )}
      </FormSection>
    </Form>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen onClose={onCancelClose} variant="medium" data-testid="mcp-registry-create-modal">
      <ModalHeader title={isEditMode ? 'Edit MCP Registry' : 'Create MCP Registry'} />
      <ModalBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Registry creation tabs"
          role="region"
        >
          <Tab
            eventKey={RegistryCreateTab.GENERAL}
            title={<TabTitleText>General</TabTitleText>}
            aria-label="General configuration tab"
          >
            {renderGeneralTab()}
          </Tab>
          <Tab
            eventKey={RegistryCreateTab.DATA_SOURCES}
            title={<TabTitleText>Data Sources</TabTitleText>}
            aria-label="Data sources configuration tab"
          >
            {renderDataSourcesTab()}
          </Tab>
          <Tab
            eventKey={RegistryCreateTab.SYNC_POLICY}
            title={<TabTitleText>Sync Policy</TabTitleText>}
            aria-label="Sync policy configuration tab"
          >
            {renderSyncPolicyTab()}
          </Tab>
          <Tab
            eventKey={RegistryCreateTab.FILTER}
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
          submitLabel={isEditMode ? 'Update' : 'Create'}
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle={isEditMode ? 'Error updating MCP registry' : 'Error creating MCP registry'}
        />
      </ModalFooter>
    </Modal>
  );
};
