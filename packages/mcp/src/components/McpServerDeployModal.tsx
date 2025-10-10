import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  Checkbox,
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
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { InfoCircleIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { McpServerMetadata, McpServer, McpTransport, McpServerTier, McpProxyMode } from '../types';
import { McpRegistry } from '../types/registry';
import { createMcpServer, updateMcpServer } from '../api/k8s/mcp';
import { ProjectsContext } from '../../../../frontend/src/concepts/projects/ProjectsContext';
import { useSecrets, getSecretKeys } from '../hooks/useSecrets';
import { useServiceAccounts } from '../hooks/useServiceAccounts';

interface McpServerDeployModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  server: McpServerMetadata;
  existingServer?: McpServer;
  serverMetadata?: McpServerMetadata; // Complete metadata when editing (includes all env_vars)
  registryContext?: {
    registry: McpRegistry;
    serverName: string;
  };
}

enum DeployDialogTab {
  SERVER = 'server',
  CONFIG = 'config',
  RESOURCES = 'resources',
  ADVANCED = 'advanced',
}

interface EnvironmentVariable {
  name: string;
  value: string;
  required?: boolean;
  secret?: boolean;
  // Secret reference support
  sourceType: 'value' | 'secretRef';
  secretRef?: {
    secretName: string;
    secretKey: string;
  };
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
  environmentVariables: EnvironmentVariable[];
  // Advanced pod configuration
  imagePullSecrets: string[];
  serviceAccount: string;
  nodeSelector: Record<string, string>;
  runAsNonRoot: boolean;
  runAsUser: string;
  runAsGroup: string;
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
  imagePullSecrets: [],
  serviceAccount: '',
  nodeSelector: {},
  runAsNonRoot: false,
  runAsUser: '',
  runAsGroup: '',
};

export const McpServerDeployModal: React.FC<McpServerDeployModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  server,
  existingServer,
  serverMetadata,
  registryContext,
}) => {
  const notification = useNotification();
  const { preferredProject } = React.useContext(ProjectsContext);
  const [config, setConfig] = React.useState<DeploymentConfig>(initialConfig);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [activeTabKey, setActiveTabKey] = React.useState<string>(DeployDialogTab.SERVER);
  const [visibleSecrets, setVisibleSecrets] = React.useState<Set<number>>(new Set());

  // Fetch secrets and service accounts for advanced configuration
  const namespace = preferredProject?.metadata.name;
  const [secrets, secretsLoaded] = useSecrets(namespace);
  const [serviceAccounts, serviceAccountsLoaded] = useServiceAccounts(namespace);

  // Debug logging
  React.useEffect(() => {
    console.log('Advanced tab - namespace:', namespace);
    console.log('Advanced tab - secrets:', secrets.length, 'loaded:', secretsLoaded);
    console.log(
      'Advanced tab - serviceAccounts:',
      serviceAccounts.length,
      'loaded:',
      serviceAccountsLoaded,
    );
  }, [namespace, secrets, secretsLoaded, serviceAccounts, serviceAccountsLoaded]);

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
        environmentVariables: (() => {
          // If we have complete metadata, merge configured values with all available env vars
          if (serverMetadata?.env_vars) {
            // Create map of configured values
            const configuredEnvVars = new Map<string, EnvironmentVariable>();

            // Add existing value-based env vars
            existingServer.spec.env?.forEach((e) => {
              const metadata = serverMetadata.env_vars?.find((v) => v.name === e.name);
              configuredEnvVars.set(e.name, {
                name: e.name,
                value: e.value || '',
                required: metadata?.required,
                secret: metadata?.secret,
                sourceType: 'value' as const,
                secretRef: undefined,
              });
            });

            // Add existing secret-based env vars
            existingServer.spec.secrets?.forEach((s) => {
              const envName = s.targetEnvName || s.key;
              const metadata = serverMetadata.env_vars?.find((v) => v.name === envName);
              configuredEnvVars.set(envName, {
                name: envName,
                value: '',
                required: metadata?.required,
                secret: metadata?.secret,
                sourceType: 'secretRef' as const,
                secretRef: {
                  secretName: s.name,
                  secretKey: s.key,
                },
              });
            });

            // Merge with ALL expected env vars from metadata
            return serverMetadata.env_vars.map((envMeta) => {
              const existing = configuredEnvVars.get(envMeta.name);
              return (
                existing || {
                  name: envMeta.name,
                  value: envMeta.default || '',
                  required: envMeta.required,
                  secret: envMeta.secret,
                  sourceType: 'value' as const,
                  secretRef: undefined,
                }
              );
            });
          }

          // Fallback: If no metadata, just show configured values
          return [
            // Load plain value env vars
            ...(existingServer.spec.env?.map((e) => ({
              name: e.name,
              value: e.value || '',
              sourceType: 'value' as const,
              secretRef: undefined,
            })) || []),
            // Load secret reference env vars from the secrets array
            ...(existingServer.spec.secrets?.map((s) => ({
              name: s.targetEnvName || s.key,
              value: '',
              sourceType: 'secretRef' as const,
              secretRef: {
                secretName: s.name,
                secretKey: s.key,
              },
            })) || []),
          ];
        })(),
        imagePullSecrets:
          existingServer.spec.podTemplateSpec?.spec?.imagePullSecrets?.map((s) => s.name) || [],
        serviceAccount: existingServer.spec.podTemplateSpec?.spec?.serviceAccountName || '',
        nodeSelector: existingServer.spec.podTemplateSpec?.spec?.nodeSelector || {},
        runAsNonRoot:
          existingServer.spec.podTemplateSpec?.spec?.securityContext?.runAsNonRoot || false,
        runAsUser:
          existingServer.spec.podTemplateSpec?.spec?.securityContext?.runAsUser?.toString() || '',
        runAsGroup:
          existingServer.spec.podTemplateSpec?.spec?.securityContext?.runAsGroup?.toString() || '',
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
      // Always default to 'value' mode - users can switch to 'secretRef' if needed
      const envVars: EnvironmentVariable[] =
        server.env_vars?.map((env) => ({
          name: env.name,
          value: env.default || '',
          required: env.required,
          secret: env.secret,
          sourceType: 'value' as const,
          secretRef: undefined,
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
  }, [server.name, existingServer, serverMetadata]);

  const updateConfig = (updates: Partial<DeploymentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const addEnvironmentVariable = () => {
    updateConfig({
      environmentVariables: [
        ...config.environmentVariables,
        { name: '', value: '', sourceType: 'value' as const },
      ],
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

    // Validate required environment variables have values or secret references
    for (const env of config.environmentVariables) {
      if (env.required) {
        if (env.sourceType === 'value' && !env.value.trim()) {
          return `Required environment variable "${env.name}" must have a value`;
        }
        if (
          env.sourceType === 'secretRef' &&
          (!env.secretRef?.secretName || !env.secretRef.secretKey)
        ) {
          return `Required environment variable "${env.name}" must have a secret reference`;
        }
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

      // Build environment variables array (plain values only)
      // Secret references go in the separate `secrets` array per MCPServer CRD spec
      console.log('All environment variables before filtering:', config.environmentVariables);

      const envArray = config.environmentVariables
        .filter((env) => env.sourceType === 'value' && env.name && env.value && env.value.trim())
        .map((env) => ({
          name: env.name,
          value: env.value,
        }));

      // Build secrets array for secret references using MCPServer SecretRef structure
      const secretsArray = config.environmentVariables
        .filter(
          (env) =>
            env.sourceType === 'secretRef' &&
            env.name &&
            env.secretRef?.secretName &&
            env.secretRef.secretKey,
        )
        .map((env) => ({
          name: env.secretRef?.secretName || '',
          key: env.secretRef?.secretKey || '',
          targetEnvName: env.name, // Map to the environment variable name
        }));

      console.log('Final env array (plain values):', JSON.stringify(envArray, null, 2));
      console.log('Final secrets array (secret refs):', JSON.stringify(secretsArray, null, 2));

      // Build podTemplateSpec if advanced config is provided
      // Note: We include a minimal container spec with the 'mcp' container name
      // The operator will merge this with its generated container configuration
      const podTemplateSpec =
        config.imagePullSecrets.length > 0 ||
        config.serviceAccount ||
        Object.keys(config.nodeSelector).length > 0 ||
        config.runAsNonRoot
          ? {
              spec: {
                // Include minimal container spec that operator will merge with
                containers: [
                  {
                    name: 'mcp',
                  },
                ],
                ...(config.imagePullSecrets.length > 0 && {
                  imagePullSecrets: config.imagePullSecrets.map((name) => ({ name })),
                }),
                ...(config.serviceAccount && {
                  serviceAccountName: config.serviceAccount,
                }),
                ...(Object.keys(config.nodeSelector).length > 0 && {
                  nodeSelector: config.nodeSelector,
                }),
                ...(config.runAsNonRoot && {
                  securityContext: {
                    runAsNonRoot: true,
                    ...(config.runAsUser && { runAsUser: parseInt(config.runAsUser, 10) }),
                    ...(config.runAsGroup && { runAsGroup: parseInt(config.runAsGroup, 10) }),
                  },
                }),
              },
            }
          : undefined;

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
          // Preserve required metadata fields when updating
          ...(existingServer?.metadata?.resourceVersion && {
            resourceVersion: existingServer.metadata.resourceVersion,
          }),
          ...(existingServer?.metadata?.uid && {
            uid: existingServer.metadata.uid,
          }),
          ...(existingServer?.metadata?.creationTimestamp && {
            creationTimestamp: existingServer.metadata.creationTimestamp,
          }),
        },
        spec: {
          image: server.image || `mcp-server-${server.name}:latest`,
          transport: config.transport,
          tier: getTierFromTags(),
          proxyMode: config.transport === 'stdio' ? config.proxyMode : undefined,
          port: config.port,
          targetPort: config.targetPort,
          args: argsArray.length > 0 ? argsArray : undefined,
          env: envArray.length > 0 ? envArray : undefined,
          secrets: secretsArray.length > 0 ? secretsArray : undefined,
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
          ...(podTemplateSpec && { podTemplateSpec }),
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

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancelClose} variant="medium" data-testid="mcp-server-deploy-modal">
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
                    isDisabled={!!existingServer}
                    placeholder="my-server-deployment"
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
                <>
                  <Alert
                    variant="warning"
                    isInline
                    isPlain
                    title="Security recommendation"
                    className="pf-u-mb-md"
                  >
                    For sensitive values, use &quot;Secret&quot; mode to reference Kubernetes
                    secrets instead of storing plain text in the MCPServer spec.
                  </Alert>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {config.environmentVariables.map((env, index) => {
                      const envMetadata = server.env_vars?.find((e) => e.name === env.name);
                      return (
                        <div
                          key={index}
                          className="pf-u-p-md"
                          style={{
                            backgroundColor:
                              index % 2 === 0
                                ? 'transparent'
                                : 'var(--pf-t--global--background--color--secondary--default)',
                            borderRadius: '4px',
                          }}
                        >
                          {/* Compact header: name, badges, description on one line */}
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                            className="pf-u-mb-sm"
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
                            {envMetadata?.description && (
                              <FlexItem className="pf-u-color-200 pf-u-font-size-sm">
                                {envMetadata.description}
                              </FlexItem>
                            )}
                          </Flex>

                          {/* Input field with inline toggle on the right */}
                          {env.sourceType === 'value' ? (
                            <InputGroup>
                              <InputGroupItem isFill>
                                <TextInput
                                  type={
                                    env.secret
                                      ? visibleSecrets.has(index)
                                        ? 'text'
                                        : 'password'
                                      : 'text'
                                  }
                                  value={env.value}
                                  onChange={(_, value) =>
                                    updateEnvironmentVariable(index, 'value', value)
                                  }
                                  validated={env.required && !env.value ? 'error' : 'default'}
                                  isRequired={env.required}
                                  placeholder={
                                    env.required && !env.value
                                      ? 'Required - please fill out this field'
                                      : envMetadata?.default
                                      ? `Default: ${envMetadata.default}`
                                      : undefined
                                  }
                                  aria-label={`Value for ${env.name}`}
                                />
                              </InputGroupItem>
                              {env.secret && (
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
                              )}
                              <InputGroupItem>
                                <ToggleGroup aria-label="Value source type">
                                  <ToggleGroupItem
                                    text="Value"
                                    buttonId={`${env.name}-toggle-value-${index}`}
                                    isSelected={
                                      config.environmentVariables[index].sourceType === 'value'
                                    }
                                    onChange={() => {
                                      const updated = [...config.environmentVariables];
                                      updated[index] = {
                                        ...updated[index],
                                        sourceType: 'value',
                                        secretRef: undefined,
                                      };
                                      updateConfig({ environmentVariables: updated });
                                    }}
                                  />
                                  <ToggleGroupItem
                                    text="Secret"
                                    buttonId={`${env.name}-toggle-secret-${index}`}
                                    isSelected={
                                      config.environmentVariables[index].sourceType === 'secretRef'
                                    }
                                    onChange={() => {
                                      const updated = [...config.environmentVariables];
                                      updated[index] = {
                                        ...updated[index],
                                        sourceType: 'secretRef',
                                        secretRef: {
                                          secretName: '',
                                          secretKey: '',
                                        },
                                      };
                                      updateConfig({ environmentVariables: updated });
                                    }}
                                  />
                                </ToggleGroup>
                              </InputGroupItem>
                            </InputGroup>
                          ) : (
                            <>
                              {/* Secret Reference mode with dropdowns */}
                              <InputGroup>
                                <InputGroupItem isFill>
                                  <FormSelect
                                    value={env.secretRef?.secretName || ''}
                                    onChange={(_, value) => {
                                      const updated = [...config.environmentVariables];
                                      updated[index] = {
                                        ...updated[index],
                                        secretRef: {
                                          secretName: value,
                                          secretKey: '',
                                        },
                                      };
                                      updateConfig({ environmentVariables: updated });
                                    }}
                                    validated={
                                      env.required && !env.secretRef?.secretName
                                        ? 'error'
                                        : 'default'
                                    }
                                    aria-label="Select secret"
                                  >
                                    <FormSelectOption
                                      key="placeholder"
                                      value=""
                                      label="Select a secret..."
                                      isDisabled
                                    />
                                    {secretsLoaded &&
                                      secrets.map((secret) => (
                                        <FormSelectOption
                                          key={secret.metadata?.name}
                                          value={secret.metadata?.name || ''}
                                          label={secret.metadata?.name || ''}
                                        />
                                      ))}
                                  </FormSelect>
                                </InputGroupItem>
                                <InputGroupItem>
                                  <FormSelect
                                    value={env.secretRef?.secretKey || ''}
                                    onChange={(_, value) => {
                                      const updated = [...config.environmentVariables];
                                      const currentSecretRef = updated[index].secretRef || {
                                        secretName: '',
                                        secretKey: '',
                                      };
                                      updated[index] = {
                                        ...updated[index],
                                        secretRef: {
                                          ...currentSecretRef,
                                          secretKey: value,
                                        },
                                      };
                                      updateConfig({ environmentVariables: updated });
                                    }}
                                    isDisabled={!env.secretRef?.secretName}
                                    validated={
                                      env.required && !env.secretRef?.secretKey
                                        ? 'error'
                                        : 'default'
                                    }
                                    aria-label="Select key"
                                  >
                                    <FormSelectOption
                                      key="placeholder"
                                      value=""
                                      label="Select a key..."
                                      isDisabled
                                    />
                                    {env.secretRef?.secretName &&
                                      (() => {
                                        const secret = secrets.find(
                                          (s) => s.metadata?.name === env.secretRef?.secretName,
                                        );
                                        return secret
                                          ? getSecretKeys(secret).map((key) => (
                                              <FormSelectOption key={key} value={key} label={key} />
                                            ))
                                          : null;
                                      })()}
                                  </FormSelect>
                                </InputGroupItem>
                                <InputGroupItem>
                                  <ToggleGroup aria-label="Value source type">
                                    <ToggleGroupItem
                                      text="Value"
                                      buttonId={`${env.name}-toggle-value-${index}`}
                                      isSelected={
                                        config.environmentVariables[index].sourceType === 'value'
                                      }
                                      onChange={() => {
                                        const updated = [...config.environmentVariables];
                                        updated[index] = {
                                          ...updated[index],
                                          sourceType: 'value',
                                          secretRef: undefined,
                                        };
                                        updateConfig({ environmentVariables: updated });
                                      }}
                                    />
                                    <ToggleGroupItem
                                      text="Secret"
                                      buttonId={`${env.name}-toggle-secret-${index}`}
                                      isSelected={
                                        config.environmentVariables[index].sourceType ===
                                        'secretRef'
                                      }
                                      onChange={() => {
                                        const updated = [...config.environmentVariables];
                                        updated[index] = {
                                          ...updated[index],
                                          sourceType: 'secretRef',
                                          secretRef: {
                                            secretName: '',
                                            secretKey: '',
                                          },
                                        };
                                        updateConfig({ environmentVariables: updated });
                                      }}
                                    />
                                  </ToggleGroup>
                                </InputGroupItem>
                              </InputGroup>
                              <HelperText>
                                <HelperTextItem>
                                  Reference an existing Kubernetes secret in this project
                                </HelperTextItem>
                              </HelperText>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
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

          <Tab
            eventKey={DeployDialogTab.ADVANCED}
            title={<TabTitleText>Advanced</TabTitleText>}
            aria-label="Advanced pod configuration tab"
          >
            <div className="pf-u-pt-md">
              <Form>
                <FormSection title="Advanced Pod Configuration" titleElement="h3">
                  <Alert
                    variant="info"
                    isInline
                    title="Optional advanced settings for pod customization"
                    className="pf-u-mb-md"
                  >
                    Configure additional pod settings like image pull secrets for private
                    registries, service accounts, node scheduling, and security context.
                  </Alert>

                  {/* Image Pull Secrets */}
                  <FormGroup label="Image Pull Secrets" fieldId="image-pull-secrets">
                    <FormSelect
                      value=""
                      onChange={(_, value) => {
                        if (value && !config.imagePullSecrets.includes(value)) {
                          updateConfig({
                            imagePullSecrets: [...config.imagePullSecrets, value],
                          });
                        }
                      }}
                      id="image-pull-secrets"
                      name="image-pull-secrets"
                      aria-label="Select image pull secret"
                    >
                      <FormSelectOption
                        key="placeholder"
                        value=""
                        label="Select a secret to add..."
                        isDisabled
                      />
                      {secretsLoaded &&
                        secrets
                          .filter((s) => !config.imagePullSecrets.includes(s.metadata?.name || ''))
                          .map((secret) => (
                            <FormSelectOption
                              key={secret.metadata?.name}
                              value={secret.metadata?.name || ''}
                              label={secret.metadata?.name || ''}
                            />
                          ))}
                    </FormSelect>
                    <HelperText>
                      <HelperTextItem>
                        Select secrets to authenticate with private container registries
                      </HelperTextItem>
                    </HelperText>

                    {config.imagePullSecrets.length > 0 && (
                      <div className="pf-u-mt-sm">
                        <Title headingLevel="h5" className="pf-u-mb-xs">
                          Selected secrets:
                        </Title>
                        <Flex
                          direction={{ default: 'column' }}
                          spaceItems={{ default: 'spaceItemsXs' }}
                        >
                          {config.imagePullSecrets.map((secretName, index) => (
                            <FlexItem key={index}>
                              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                                <FlexItem>
                                  <Label color="blue">{secretName}</Label>
                                </FlexItem>
                                <FlexItem>
                                  <Button
                                    variant="link"
                                    isDanger
                                    onClick={() => {
                                      updateConfig({
                                        imagePullSecrets: config.imagePullSecrets.filter(
                                          (_, i) => i !== index,
                                        ),
                                      });
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </FlexItem>
                              </Flex>
                            </FlexItem>
                          ))}
                        </Flex>
                      </div>
                    )}
                  </FormGroup>

                  {/* Service Account */}
                  <FormGroup label="Service Account" fieldId="service-account">
                    <FormSelect
                      value={config.serviceAccount}
                      onChange={(_, value) => updateConfig({ serviceAccount: value })}
                      id="service-account"
                      name="service-account"
                      aria-label="Select service account"
                    >
                      <FormSelectOption key="none" value="" label="None (use default)" />
                      {serviceAccountsLoaded &&
                        serviceAccounts.map((sa) => (
                          <FormSelectOption
                            key={sa.metadata?.name}
                            value={sa.metadata?.name || ''}
                            label={sa.metadata?.name || ''}
                          />
                        ))}
                    </FormSelect>
                    <HelperText>
                      <HelperTextItem>
                        Optional service account for pod authentication
                      </HelperTextItem>
                    </HelperText>
                  </FormGroup>

                  {/* Node Selector */}
                  <FormGroup label="Node Selector" fieldId="node-selector">
                    {Object.entries(config.nodeSelector).map(([key, value], index) => (
                      <Flex
                        key={index}
                        spaceItems={{ default: 'spaceItemsSm' }}
                        className="pf-u-mb-sm"
                      >
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <TextInput
                            type="text"
                            value={key}
                            onChange={(_, newKey) => {
                              const newNodeSelector = { ...config.nodeSelector };
                              delete newNodeSelector[key];
                              if (newKey) {
                                newNodeSelector[newKey] = value;
                              }
                              updateConfig({ nodeSelector: newNodeSelector });
                            }}
                            placeholder="Key (e.g., kubernetes.io/hostname)"
                            aria-label="Node selector key"
                          />
                        </FlexItem>
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <TextInput
                            type="text"
                            value={value}
                            onChange={(_, newValue) => {
                              updateConfig({
                                nodeSelector: { ...config.nodeSelector, [key]: newValue },
                              });
                            }}
                            placeholder="Value (e.g., node-1)"
                            aria-label="Node selector value"
                          />
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="link"
                            isDanger
                            onClick={() => {
                              const newNodeSelector = { ...config.nodeSelector };
                              delete newNodeSelector[key];
                              updateConfig({ nodeSelector: newNodeSelector });
                            }}
                          >
                            Remove
                          </Button>
                        </FlexItem>
                      </Flex>
                    ))}
                    <Button
                      variant="link"
                      onClick={() => {
                        const newKey = `label-${Object.keys(config.nodeSelector).length + 1}`;
                        updateConfig({
                          nodeSelector: { ...config.nodeSelector, [newKey]: '' },
                        });
                      }}
                    >
                      + Add Label
                    </Button>
                    <HelperText>
                      <HelperTextItem>
                        Schedule pods on nodes with matching labels (key=value pairs)
                      </HelperTextItem>
                    </HelperText>
                  </FormGroup>

                  {/* Security Context */}
                  <FormSection title="Security Context" titleElement="h4">
                    <Checkbox
                      id="run-as-non-root"
                      label="Run as non-root user"
                      isChecked={config.runAsNonRoot}
                      onChange={(_, checked) => updateConfig({ runAsNonRoot: checked })}
                    />

                    {config.runAsNonRoot && (
                      <Flex spaceItems={{ default: 'spaceItemsMd' }} className="pf-u-mt-md">
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <FormGroup label="User ID" fieldId="run-as-user">
                            <TextInput
                              type="text"
                              id="run-as-user"
                              name="run-as-user"
                              value={config.runAsUser}
                              onChange={(_, value) => updateConfig({ runAsUser: value })}
                              placeholder="1000"
                            />
                            <HelperText>
                              <HelperTextItem>
                                Numeric user ID to run the container (e.g., 1000)
                              </HelperTextItem>
                            </HelperText>
                          </FormGroup>
                        </FlexItem>
                        <FlexItem flex={{ default: 'flex_1' }}>
                          <FormGroup label="Group ID" fieldId="run-as-group">
                            <TextInput
                              type="text"
                              id="run-as-group"
                              name="run-as-group"
                              value={config.runAsGroup}
                              onChange={(_, value) => updateConfig({ runAsGroup: value })}
                              placeholder="1000"
                            />
                            <HelperText>
                              <HelperTextItem>
                                Numeric group ID to run the container (e.g., 1000)
                              </HelperTextItem>
                            </HelperText>
                          </FormGroup>
                        </FlexItem>
                      </Flex>
                    )}
                  </FormSection>
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
          submitLabel={existingServer ? 'Save Changes' : 'Deploy Server'}
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle={existingServer ? 'Error updating MCP server' : 'Error deploying MCP server'}
        />
      </ModalFooter>
    </Modal>
  );
};
