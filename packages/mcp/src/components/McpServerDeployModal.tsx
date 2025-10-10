import * as React from 'react';
import {
  Alert,
  AlertVariant,
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
  TextInput,
  Checkbox,
  Title,
  Flex,
  FlexItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import { McpServerMetadata, McpServer } from '../types';
import { deployMcpServer } from '../api/servers';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';

interface McpServerDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  server: McpServerMetadata;
}

enum DeployDialogTab {
  SERVER = 'server',
  ENVIRONMENT_VARIABLES = 'environment-variables',
  RESOURCES = 'resources',
}

interface DeploymentConfig {
  name: string;
  replicas: number;
  cpuRequest: string;
  memoryRequest: string;
  cpuLimit: string;
  memoryLimit: string;
  enableAutoRestart: boolean;
  environmentVariables: Array<{ name: string; value: string }>;
}

const initialConfig: DeploymentConfig = {
  name: '',
  replicas: 1,
  cpuRequest: '100m',
  memoryRequest: '128Mi',
  cpuLimit: '500m',
  memoryLimit: '512Mi',
  enableAutoRestart: true,
  environmentVariables: [],
};

export const McpServerDeployModal: React.FC<McpServerDeployModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  server,
}) => {
  const { preferredProject } = React.useContext(ProjectsContext);
  const [config, setConfig] = React.useState<DeploymentConfig>(initialConfig);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [activeTabKey, setActiveTabKey] = React.useState<string>(DeployDialogTab.SERVER);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const defaultName = server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setConfig({
        ...initialConfig,
        name: defaultName,
      });
      setError(undefined);
      setActiveTabKey(DeployDialogTab.SERVER);
    }
  }, [isOpen, server.name]);

  const updateConfig = (updates: Partial<DeploymentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const addEnvironmentVariable = () => {
    updateConfig({
      environmentVariables: [...config.environmentVariables, { name: '', value: '' }],
    });
  };

  const updateEnvironmentVariable = (index: number, field: 'name' | 'value', value: string) => {
    const updated = config.environmentVariables.map((env, i) =>
      i === index ? { ...env, [field]: value } : env,
    );
    updateConfig({ environmentVariables: updated });
  };

  const removeEnvironmentVariable = (index: number) => {
    const updated = config.environmentVariables.filter((_, i) => i !== index);
    updateConfig({ environmentVariables: updated });
  };

  const validateForm = (): string | null => {
    if (!config.name.trim()) {
      return 'Deployment name is required';
    }

    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(config.name)) {
      return 'Deployment name must be a valid Kubernetes name (lowercase letters, numbers, and hyphens)';
    }

    if (config.replicas < 1 || config.replicas > 10) {
      return 'Replicas must be between 1 and 10';
    }

    // Validate environment variables
    for (const env of config.environmentVariables) {
      if (env.name && !env.value) {
        return 'All environment variables must have both name and value';
      }
      if (!env.name && env.value) {
        return 'All environment variables must have both name and value';
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

    if (!preferredProject?.metadata.name) {
      setError(new Error('No project selected'));
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      // Build the MCP server resource
      const mcpServer: McpServer = {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: config.name,
          namespace: preferredProject.metadata.name,
          labels: {
            'mcp.toolhive.stacklok.dev/server-type': server.name,
            'app.kubernetes.io/name': config.name,
            'app.kubernetes.io/component': 'mcp-server',
            'app.kubernetes.io/part-of': 'mcp-registry',
          },
          annotations: {
            'mcp.toolhive.stacklok.dev/server-display-name': server.displayName || server.name,
            'mcp.toolhive.stacklok.dev/server-description': server.description || '',
            'mcp.toolhive.stacklok.dev/server-version': server.version || '',
          },
        },
        spec: {
          image: `mcp-server-${server.name}:latest`, // TODO: Get actual image from server metadata
          transport: 'stdio', // TODO: Determine transport from server metadata
          tier: 'community', // TODO: Determine tier from server metadata
          config: {
            env: config.environmentVariables
              .filter((env) => env.name && env.value)
              .map((env) => ({
                name: env.name,
                value: env.value,
              })),
          },
          deployment: {
            replicas: config.replicas,
            resources: {
              requests: {
                cpu: config.cpuRequest,
                memory: config.memoryRequest,
              },
              limits: {
                cpu: config.cpuLimit,
                memory: config.memoryLimit,
              },
            },
          },
        },
      };

      await deployMcpServer(mcpServer);
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

  const getServerIcon = () => {
    if (server.logo) {
      return (
        <img
          src={server.logo}
          alt={`${server.displayName || server.name} logo`}
          style={{ width: '24px', height: '24px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return <InfoCircleIcon />;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen onClose={onCancelClose} variant="medium" data-testid="mcp-server-deploy-modal">
      <ModalHeader title={`Deploy ${server.displayName || server.name}`}>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{getServerIcon()}</FlexItem>
          <FlexItem>
            <Title headingLevel="h3" size="lg">
              {server.displayName || server.name}
            </Title>
          </FlexItem>
        </Flex>
        {server.description && (
          <div className="pf-u-color-200 pf-u-mt-sm">{server.description}</div>
        )}
      </ModalHeader>
      <ModalBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Deploy server configuration tabs"
          role="region"
        >
          <Tab
            eventKey={DeployDialogTab.SERVER}
            title={<TabTitleText>Server</TabTitleText>}
            aria-label="Server configuration tab"
          >
            <div className="pf-u-pt-md">
              <Form>
                <FormGroup label="Deployment Name" isRequired fieldId="deployment-name">
                  <TextInput
                    isRequired
                    type="text"
                    id="deployment-name"
                    name="deployment-name"
                    value={config.name}
                    onChange={(_, value) => updateConfig({ name: value })}
                    placeholder="my-server-deployment"
                  />
                  <HelperText>
                    <HelperTextItem>
                      A unique name for this deployment. Must be a valid Kubernetes name.
                    </HelperTextItem>
                  </HelperText>
                </FormGroup>

                <FormGroup label="Server Name" fieldId="server-name">
                  <TextInput
                    type="text"
                    id="server-name"
                    name="server-name"
                    value={server.name}
                    isDisabled
                  />
                  <HelperText>
                    <HelperTextItem>Original server name from registry.</HelperTextItem>
                  </HelperText>
                </FormGroup>

                <FormGroup label="Replicas" fieldId="replicas">
                  <TextInput
                    type="number"
                    value={config.replicas.toString()}
                    onChange={(_, value) => {
                      const numValue = parseInt(value, 10);
                      if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 10) {
                        updateConfig({ replicas: numValue });
                      }
                    }}
                    min={1}
                    max={10}
                  />
                  <HelperText>
                    <HelperTextItem>Number of server instances to run (1-10).</HelperTextItem>
                  </HelperText>
                </FormGroup>

                <FormGroup fieldId="auto-restart">
                  <Checkbox
                    id="auto-restart"
                    name="auto-restart"
                    label="Enable automatic restart"
                    description="Automatically restart the server if it crashes"
                    isChecked={config.enableAutoRestart}
                    onChange={(_, checked) => updateConfig({ enableAutoRestart: checked })}
                  />
                </FormGroup>

                {server.tools && server.tools.length > 0 && (
                  <Alert variant={AlertVariant.info} title="Server Capabilities" isInline>
                    This server provides {server.tools.length} tool
                    {server.tools.length !== 1 ? 's' : ''}
                    {server.prompts &&
                      server.prompts.length > 0 &&
                      `, ${server.prompts.length} prompt${server.prompts.length !== 1 ? 's' : ''}`}
                    {server.resources &&
                      server.resources.length > 0 &&
                      `, and ${server.resources.length} resource${
                        server.resources.length !== 1 ? 's' : ''
                      }`}
                    .
                  </Alert>
                )}
              </Form>
            </div>
          </Tab>

          <Tab
            eventKey={DeployDialogTab.ENVIRONMENT_VARIABLES}
            title={<TabTitleText>Environment Variables</TabTitleText>}
            aria-label="Environment variables tab"
          >
            <div className="pf-u-pt-md">
              <Form>
                <FormSection title="Environment Variables" titleElement="h3">
                  <FormGroup fieldId="environment-variables">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {config.environmentVariables.map((env, index) => (
                        <div
                          key={index}
                          style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
                        >
                          <div style={{ flex: 1 }}>
                            <TextInput
                              type="text"
                              value={env.name}
                              onChange={(_, value) =>
                                updateEnvironmentVariable(index, 'name', value)
                              }
                              placeholder="Variable name"
                              aria-label={`Environment variable name ${index + 1}`}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextInput
                              type="text"
                              value={env.value}
                              onChange={(_, value) =>
                                updateEnvironmentVariable(index, 'value', value)
                              }
                              placeholder="Variable value"
                              aria-label={`Environment variable value ${index + 1}`}
                            />
                          </div>
                          <Button
                            variant="link"
                            isDanger
                            onClick={() => removeEnvironmentVariable(index)}
                            aria-label={`Remove environment variable ${index + 1}`}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button variant="link" onClick={addEnvironmentVariable}>
                        Add Environment Variable
                      </Button>
                    </div>
                    <HelperText>
                      <HelperTextItem>
                        Add environment variables that will be passed to the server container.
                      </HelperTextItem>
                    </HelperText>
                  </FormGroup>
                </FormSection>
              </Form>
            </div>
          </Tab>

          <Tab
            eventKey={DeployDialogTab.RESOURCES}
            title={<TabTitleText>Resources</TabTitleText>}
            aria-label="Resources configuration tab"
          >
            <div className="pf-u-pt-md">
              <Form>
                <FormSection title="Resource Configuration" titleElement="h3">
                  <Title headingLevel="h4" size="md" className="pf-u-mb-sm">
                    Limits
                  </Title>
                  <FormGroup label="CPU Limit" fieldId="cpu-limit">
                    <TextInput
                      type="text"
                      id="cpu-limit"
                      name="cpu-limit"
                      value={config.cpuLimit}
                      onChange={(_, value) => updateConfig({ cpuLimit: value })}
                      placeholder="500m"
                    />
                    <HelperText>
                      <HelperTextItem>Maximum CPU allowed (e.g., 500m, 1).</HelperTextItem>
                    </HelperText>
                  </FormGroup>

                  <FormGroup label="Memory Limit" fieldId="memory-limit">
                    <TextInput
                      type="text"
                      id="memory-limit"
                      name="memory-limit"
                      value={config.memoryLimit}
                      onChange={(_, value) => updateConfig({ memoryLimit: value })}
                      placeholder="512Mi"
                    />
                    <HelperText>
                      <HelperTextItem>Maximum memory allowed (e.g., 512Mi, 2Gi).</HelperTextItem>
                    </HelperText>
                  </FormGroup>

                  <Title headingLevel="h4" size="md" className="pf-u-mb-sm pf-u-mt-md">
                    Requests
                  </Title>
                  <FormGroup label="CPU Request" fieldId="cpu-request">
                    <TextInput
                      type="text"
                      id="cpu-request"
                      name="cpu-request"
                      value={config.cpuRequest}
                      onChange={(_, value) => updateConfig({ cpuRequest: value })}
                      placeholder="100m"
                    />
                    <HelperText>
                      <HelperTextItem>Minimum CPU required (e.g., 100m, 0.5).</HelperTextItem>
                    </HelperText>
                  </FormGroup>

                  <FormGroup label="Memory Request" fieldId="memory-request">
                    <TextInput
                      type="text"
                      id="memory-request"
                      name="memory-request"
                      value={config.memoryRequest}
                      onChange={(_, value) => updateConfig({ memoryRequest: value })}
                      placeholder="128Mi"
                    />
                    <HelperText>
                      <HelperTextItem>Minimum memory required (e.g., 128Mi, 1Gi).</HelperTextItem>
                    </HelperText>
                  </FormGroup>
                </FormSection>
              </Form>
            </div>
          </Tab>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onCancelClose}
          onSubmit={onSubmit}
          submitLabel="Deploy Server"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle="Error deploying MCP server"
        />
      </ModalFooter>
    </Modal>
  );
};
