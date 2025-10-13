import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
  Title,
  Flex,
  FlexItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { InfoCircleIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { McpServerMetadata, McpServer, McpTransport, McpServerTier, McpProxyMode } from '../types';
import { McpRegistry } from '../types/registry';
import { createMcpServer, updateMcpServer } from '../api/k8s/mcp';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';

interface McpServerDeployModalProps {
  onClose: () => void;
  onSuccess: () => void;
  server: McpServerMetadata;
  existingServer?: McpServer;
  registryContext?: {
    registry: McpRegistry;
    serverName: string;
  };
}

enum DeployDialogTab {
  SERVER = 'server',
  CONFIG = 'config',
  RESOURCES = 'resources',
}

interface DeploymentConfig {
  name: string;
  transport: McpTransport;
  proxyMode: McpProxyMode;
  port: number;
  targetPort: number;
  args: string;
  cpuRequest: string;
  memoryRequest: string;
  cpuLimit: string;
  memoryLimit: string;
  environmentVariables: Array<{
    name: string;
    value: string;
    required?: boolean;
    secret?: boolean;
  }>;
}

const initialConfig: DeploymentConfig = {
  name: '',
  transport: 'stdio',
  proxyMode: 'streamable-http',
  port: 8080,
  targetPort: 8080,
  args: '',
  cpuRequest: '100m',
  memoryRequest: '128Mi',
  cpuLimit: '500m',
  memoryLimit: '512Mi',
  environmentVariables: [],
};

export const McpServerDeployModal: React.FC<McpServerDeployModalProps> = ({
  onClose,
  onSuccess,
  server,
  existingServer,
  registryContext,
}) => {
  const notification = useNotification();
  const { preferredProject } = React.useContext(ProjectsContext);
  const [config, setConfig] = React.useState<DeploymentConfig>(initialConfig);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [activeTabKey, setActiveTabKey] = React.useState<string>(DeployDialogTab.SERVER);
  const [visibleSecrets, setVisibleSecrets] = React.useState<Set<number>>(new Set());

  const toggleSecretVisibility = (index: number) => {
    setVisibleSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Reset form when modal opens
  React.useEffect(() => {
    setVisibleSecrets(new Set());
    if (existingServer) {
      // Initialize from existing server
      setConfig({
        name: existingServer.metadata?.name || '',
        transport: existingServer.spec.transport || 'stdio',
        proxyMode: existingServer.spec.proxyMode || 'streamable-http',
        port: existingServer.spec.port || 8080,
        targetPort: existingServer.spec.targetPort || 8080,
        args: existingServer.spec.args?.join(' ') || '',
        cpuRequest: existingServer.spec.resources?.requests?.cpu || '100m',
        memoryRequest: existingServer.spec.resources?.requests?.memory || '128Mi',
        cpuLimit: existingServer.spec.resources?.limits?.cpu || '500m',
        memoryLimit: existingServer.spec.resources?.limits?.memory || '512Mi',
        environmentVariables:
          existingServer.spec.env?.map((e) => ({
            name: e.name,
            value: e.value || '',
          })) || [],
      });
    } else {
      // Initialize from server metadata for new deployment
      const defaultName = server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

      // Use transport from server metadata, or detect from tags as fallback
      const transports: McpTransport[] = ['stdio', 'sse', 'streamable-http'];
      const detectedTransport =
        server.transport ||
        transports.find((transport) =>
          server.tags?.some((tag) => {
            const tagLower = tag.toLowerCase();
            const transportLower = transport.toLowerCase();
            return tagLower === transportLower || tagLower.includes(transportLower);
          }),
        ) ||
        'stdio';

      // Initialize environment variables from server metadata
      const envVars =
        server.env_vars?.map((env) => ({
          name: env.name,
          value: env.default || '',
          required: env.required,
          secret: env.secret,
        })) || [];

      setConfig({
        ...initialConfig,
        name: defaultName,
        transport: detectedTransport,
        targetPort: server.target_port || 8080,
        args: server.args?.join(' ') || '',
        environmentVariables: envVars,
      });
    }
    setError(undefined);
    setActiveTabKey(DeployDialogTab.SERVER);
  }, [server.name, existingServer]);

  const updateConfig = (updates: Partial<DeploymentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateEnvironmentVariable = (index: number, field: 'name' | 'value', value: string) => {
    const updated = config.environmentVariables.map((env, i) =>
      i === index ? { ...env, [field]: value } : env,
    );
    updateConfig({ environmentVariables: updated });
  };

  const validateForm = (): string | null => {
    if (!config.name.trim()) {
      return 'Deployment name is required';
    }

    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(config.name)) {
      return 'Deployment name must be a valid Kubernetes name (lowercase letters, numbers, and hyphens)';
    }

    // Validate required environment variables have values
    for (const env of config.environmentVariables) {
      if (env.required && !env.value.trim()) {
        return `Required environment variable "${env.name}" must have a value`;
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
      // Build base labels
      const baseLabels: Record<string, string> = {
        'mcp.toolhive.stacklok.dev/server-type': server.name,
        'app.kubernetes.io/name': config.name,
        'app.kubernetes.io/component': 'mcp-server',
        'app.kubernetes.io/part-of': 'mcp-registry',
      };

      // Add registry labels if deploying from a registry
      if (registryContext) {
        baseLabels['toolhive.stacklok.io/registry-name'] =
          registryContext.registry.metadata?.name || '';
        baseLabels['toolhive.stacklok.io/registry-namespace'] =
          registryContext.registry.metadata?.namespace || '';
        baseLabels['toolhive.stacklok.io/server-registry-name'] = registryContext.serverName;
      }

      // Extract tier from server tags
      const getTierFromTags = (): McpServerTier => {
        const tiers: McpServerTier[] = ['official', 'community', 'experimental'];
        const found = tiers.find((tier) =>
          server.tags?.some((tag) => {
            const tagLower = tag.toLowerCase();
            const tierLower = tier.toLowerCase();
            return tagLower === tierLower || tagLower.includes(tierLower);
          }),
        );
        return found || 'community';
      };

      // Parse args string into array
      const argsArray = config.args
        .split(' ')
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);

      // Build the MCP server resource
      const mcpServer: McpServer = {
        apiVersion: 'toolhive.stacklok.dev/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: config.name,
          namespace: preferredProject.metadata.name,
          labels: baseLabels,
          annotations: {
            'mcp.toolhive.stacklok.dev/server-display-name': server.displayName || server.name,
            'mcp.toolhive.stacklok.dev/server-description': server.description || '',
            'mcp.toolhive.stacklok.dev/server-version': server.version || '',
            'mcp.toolhive.stacklok.dev/server-logo': server.logo || '',
          },
        },
        spec: {
          image: server.image || `mcp-server-${server.name}:latest`,
          transport: config.transport,
          tier: getTierFromTags(),
          proxyMode: config.transport === 'stdio' ? config.proxyMode : undefined,
          port: config.port,
          targetPort: config.targetPort,
          args: argsArray.length > 0 ? argsArray : undefined,
          env: config.environmentVariables
            .filter((env) => env.name && env.value && env.value.trim())
            .map((env) => ({
              name: env.name,
              value: env.value,
            })),
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
      };

      // Use update if editing existing server, create if new deployment
      if (existingServer) {
        await updateMcpServer(mcpServer);
      } else {
        await createMcpServer(mcpServer);
      }

      // Show success notification
      notification.success(
        `Server "${config.name}" ${existingServer ? 'updated' : 'deployed'} successfully`,
      );

      onSuccess();
      onClose();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
        notification.error(
          `Failed to ${existingServer ? 'update' : 'deploy'} server: ${e.message}`,
        );
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

  const modalTitle = existingServer
    ? `Edit ${server.displayName || server.name}`
    : `Deploy ${server.displayName || server.name}`;

  return (
    <Modal isOpen onClose={onCancelClose} variant="medium" data-testid="mcp-server-deploy-modal">
      <ModalHeader>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{getServerIcon()}</FlexItem>
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              {modalTitle}
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
                  />
                  <HelperText>
                    <HelperTextItem>
                      A unique name for this deployment. Must be lowercase letters, numbers, and
                      hyphens only.
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

                <FormGroup label="Transport" fieldId="transport" isRequired>
                  <TextInput
                    type="text"
                    id="transport"
                    name="transport"
                    value={config.transport}
                    isDisabled
                  />
                  <HelperText>
                    <HelperTextItem>
                      Transport protocol from server metadata (read-only).
                    </HelperTextItem>
                  </HelperText>
                </FormGroup>

                {config.transport === 'stdio' ? (
                  <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="Proxy Mode" fieldId="proxy-mode">
                        <FormSelect
                          id="proxy-mode"
                          value={config.proxyMode}
                          onChange={(_event, value) => {
                            const selectedProxyMode = String(value);
                            if (
                              selectedProxyMode === 'sse' ||
                              selectedProxyMode === 'streamable-http'
                            ) {
                              updateConfig({ proxyMode: selectedProxyMode });
                            }
                          }}
                          aria-label="Proxy mode"
                        >
                          <FormSelectOption value="streamable-http" label="Streamable HTTP" />
                          <FormSelectOption value="sse" label="SSE (Legacy)" />
                        </FormSelect>
                        <HelperText>
                          <HelperTextItem>
                            Proxy mode for stdio transport (how stdio will be exposed).
                          </HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="Port" fieldId="port">
                        <TextInput
                          type="number"
                          id="port"
                          value={config.port.toString()}
                          onChange={(_, value) => {
                            const numValue = parseInt(value, 10);
                            if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 65535) {
                              updateConfig({ port: numValue });
                            }
                          }}
                          min={1}
                          max={65535}
                        />
                        <HelperText>
                          <HelperTextItem>
                            Port to expose the MCP server on (1-65535).
                          </HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                  </Flex>
                ) : (
                  <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="Port" fieldId="port">
                        <TextInput
                          type="number"
                          id="port"
                          value={config.port.toString()}
                          onChange={(_, value) => {
                            const numValue = parseInt(value, 10);
                            if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 65535) {
                              updateConfig({ port: numValue });
                            }
                          }}
                          min={1}
                          max={65535}
                        />
                        <HelperText>
                          <HelperTextItem>
                            Port to expose the MCP server on (1-65535).
                          </HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="Target Port" fieldId="target-port">
                        <TextInput
                          type="number"
                          id="target-port"
                          value={config.targetPort.toString()}
                          isDisabled
                        />
                        <HelperText>
                          <HelperTextItem>
                            Port from server metadata (read-only for SSE and Streamable HTTP).
                          </HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                  </Flex>
                )}

                <FormGroup label="Arguments" fieldId="args">
                  <TextArea
                    id="args"
                    value={config.args}
                    onChange={(_, value) => updateConfig({ args: value })}
                    rows={2}
                  />
                  <HelperText>
                    <HelperTextItem>
                      Additional command-line arguments to pass to the server (space-separated).
                      Example: --verbose --timeout=30
                    </HelperTextItem>
                  </HelperText>
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
            eventKey={DeployDialogTab.CONFIG}
            title={<TabTitleText>Config</TabTitleText>}
            aria-label="Configuration tab"
          >
            <div className="pf-u-pt-md">
              {config.environmentVariables.length === 0 ? (
                <Alert variant={AlertVariant.info} title="No configuration required" isInline>
                  This server does not require any environment variables.
                </Alert>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {config.environmentVariables.map((env, index) => (
                    <div
                      key={index}
                      className="pf-u-py-md pf-u-px-md"
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? 'transparent'
                            : 'var(--pf-t--global--background--color--secondary--default)',
                      }}
                    >
                      <Flex
                        direction={{ default: 'column' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                          >
                            <FlexItem>
                              <strong>{env.name}</strong>
                            </FlexItem>
                            {env.required && (
                              <FlexItem>
                                <Label color="red" isCompact>
                                  Required
                                </Label>
                              </FlexItem>
                            )}
                            {env.secret && (
                              <FlexItem>
                                <Label color="orange" isCompact>
                                  Secret
                                </Label>
                              </FlexItem>
                            )}
                            {server.env_vars?.find((e) => e.name === env.name)?.description && (
                              <FlexItem className="pf-u-color-200 pf-u-font-size-sm">
                                {server.env_vars.find((e) => e.name === env.name)?.description}
                                {server.env_vars.find((e) => e.name === env.name)?.default && (
                                  <span className="pf-u-ml-sm">
                                    (Default:{' '}
                                    {server.env_vars.find((e) => e.name === env.name)?.default})
                                  </span>
                                )}
                              </FlexItem>
                            )}
                            {!server.env_vars?.find((e) => e.name === env.name)?.description &&
                              server.env_vars?.find((e) => e.name === env.name)?.default && (
                                <FlexItem className="pf-u-color-200 pf-u-font-size-sm">
                                  Default:{' '}
                                  {server.env_vars.find((e) => e.name === env.name)?.default}
                                </FlexItem>
                              )}
                          </Flex>
                        </FlexItem>
                        <FlexItem>
                          {env.secret ? (
                            <InputGroup>
                              <InputGroupItem isFill>
                                <TextInput
                                  type={visibleSecrets.has(index) ? 'text' : 'password'}
                                  value={env.value}
                                  onChange={(_, value) =>
                                    updateEnvironmentVariable(index, 'value', value)
                                  }
                                  validated={env.required && !env.value ? 'error' : 'default'}
                                  isRequired={env.required}
                                  aria-label={`Value for ${env.name}`}
                                />
                              </InputGroupItem>
                              <InputGroupItem>
                                <Button
                                  variant="control"
                                  onClick={() => toggleSecretVisibility(index)}
                                  aria-label={
                                    visibleSecrets.has(index) ? 'Hide password' : 'Show password'
                                  }
                                >
                                  {visibleSecrets.has(index) ? <EyeSlashIcon /> : <EyeIcon />}
                                </Button>
                              </InputGroupItem>
                            </InputGroup>
                          ) : (
                            <TextInput
                              type="text"
                              value={env.value}
                              onChange={(_, value) =>
                                updateEnvironmentVariable(index, 'value', value)
                              }
                              validated={env.required && !env.value ? 'error' : 'default'}
                              isRequired={env.required}
                              aria-label={`Value for ${env.name}`}
                            />
                          )}
                        </FlexItem>
                      </Flex>
                    </div>
                  ))}
                </div>
              )}
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
                  <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="CPU" fieldId="cpu-limit">
                        <TextInput
                          type="text"
                          id="cpu-limit"
                          name="cpu-limit"
                          value={config.cpuLimit}
                          onChange={(_, value) => updateConfig({ cpuLimit: value })}
                          placeholder="500m"
                        />
                        <HelperText>
                          <HelperTextItem>e.g., 500m, 1</HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="Memory" fieldId="memory-limit">
                        <TextInput
                          type="text"
                          id="memory-limit"
                          name="memory-limit"
                          value={config.memoryLimit}
                          onChange={(_, value) => updateConfig({ memoryLimit: value })}
                          placeholder="512Mi"
                        />
                        <HelperText>
                          <HelperTextItem>e.g., 512Mi, 2Gi</HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                  </Flex>

                  <Title headingLevel="h4" size="md" className="pf-u-mb-sm pf-u-mt-md">
                    Requests
                  </Title>
                  <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="CPU" fieldId="cpu-request">
                        <TextInput
                          type="text"
                          id="cpu-request"
                          name="cpu-request"
                          value={config.cpuRequest}
                          onChange={(_, value) => updateConfig({ cpuRequest: value })}
                          placeholder="100m"
                        />
                        <HelperText>
                          <HelperTextItem>e.g., 100m, 0.5</HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <FormGroup label="Memory" fieldId="memory-request">
                        <TextInput
                          type="text"
                          id="memory-request"
                          name="memory-request"
                          value={config.memoryRequest}
                          onChange={(_, value) => updateConfig({ memoryRequest: value })}
                          placeholder="128Mi"
                        />
                        <HelperText>
                          <HelperTextItem>e.g., 128Mi, 1Gi</HelperTextItem>
                        </HelperText>
                      </FormGroup>
                    </FlexItem>
                  </Flex>
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
