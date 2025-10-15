import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { PencilAltIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { McpServer, McpServerMetadata } from '../types/server';

interface McpDeployedServerDetailsModalProps {
  onClose: () => void;
  server: McpServer;
  serverMetadata?: McpServerMetadata;
  onEdit?: (server: McpServer) => void;
}

enum DetailsTab {
  SERVER = 'server',
  CONFIG = 'config',
  RESOURCES = 'resources',
  ADVANCED = 'advanced',
}

export const McpDeployedServerDetailsModal: React.FC<McpDeployedServerDetailsModalProps> = ({
  onClose,
  server,
  serverMetadata,
  onEdit,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string>(DetailsTab.SERVER);

  const getServerIcon = () => {
    const logoUrl = server.metadata?.annotations?.['mcp.toolhive.stacklok.dev/server-logo'];
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt="Server logo"
          style={{ width: '32px', height: '32px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return <InfoCircleIcon style={{ width: '32px', height: '32px' }} />;
  };

  const displayName =
    server.metadata?.annotations?.['mcp.toolhive.stacklok.dev/server-display-name'] ||
    server.metadata?.name ||
    'Unknown Server';

  const description =
    server.metadata?.annotations?.['mcp.toolhive.stacklok.dev/server-description'] || '';

  const getStatusColor = (phase?: string): 'green' | 'red' | 'blue' | 'grey' => {
    switch (phase) {
      case 'Running':
        return 'green';
      case 'Failed':
        return 'red';
      case 'Pending':
        return 'blue';
      default:
        return 'grey';
    }
  };

  const renderServerTab = () => (
    <div className="pf-u-pt-md">
      <DescriptionList isHorizontal isCompact>
        <DescriptionListGroup>
          <DescriptionListTerm>Deployment Name</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{server.metadata?.name}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>Server Name</DescriptionListTerm>
          <DescriptionListDescription>
            {server.metadata?.labels?.['mcp.toolhive.stacklok.dev/server-type'] || 'N/A'}
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription>
            <Label color={getStatusColor(server.status?.phase)} isCompact>
              {server.status?.phase || 'Unknown'}
            </Label>
            {server.status?.endpoint && (
              <div className="pf-u-mt-xs">
                <code className="pf-u-font-size-sm">{server.status.endpoint}</code>
              </div>
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>Transport</DescriptionListTerm>
          <DescriptionListDescription>
            <Label color="blue" isCompact>
              {server.spec.transport || 'stdio'}
            </Label>
          </DescriptionListDescription>
        </DescriptionListGroup>

        {server.spec.transport === 'stdio' && server.spec.proxyMode && (
          <DescriptionListGroup>
            <DescriptionListTerm>Proxy Mode</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color="purple" isCompact>
                {server.spec.proxyMode}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}

        {server.spec.transport === 'stdio' && server.spec.port && (
          <DescriptionListGroup>
            <DescriptionListTerm>Port</DescriptionListTerm>
            <DescriptionListDescription>{server.spec.port}</DescriptionListDescription>
          </DescriptionListGroup>
        )}

        {server.spec.transport !== 'stdio' && (
          <>
            {server.spec.port && (
              <DescriptionListGroup>
                <DescriptionListTerm>Port</DescriptionListTerm>
                <DescriptionListDescription>{server.spec.port}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {server.spec.targetPort && (
              <DescriptionListGroup>
                <DescriptionListTerm>Target Port</DescriptionListTerm>
                <DescriptionListDescription>{server.spec.targetPort}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </>
        )}

        {server.spec.args && server.spec.args.length > 0 && (
          <DescriptionListGroup>
            <DescriptionListTerm>Arguments</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{server.spec.args.join(' ')}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    </div>
  );

  const renderConfigTab = () => {
    // If we have server metadata, show ALL env vars (including undefined ones)
    if (serverMetadata?.env_vars) {
      // Create map of configured values
      const configuredEnvVars = new Map<string, { type: 'value' | 'secret'; data: string }>();

      // Add value-based env vars to map
      server.spec.env?.forEach((env) => {
        configuredEnvVars.set(env.name, {
          type: 'value',
          data: env.value || '',
        });
      });

      // Add secret-based env vars to map
      server.spec.secrets?.forEach((secret) => {
        const envName = secret.targetEnvName || secret.key;
        configuredEnvVars.set(envName, {
          type: 'secret',
          data: `${secret.name}/${secret.key}`,
        });
      });

      // Build display list from ALL expected env vars
      const allEnvVars = serverMetadata.env_vars.map((envMeta) => {
        const configured = configuredEnvVars.get(envMeta.name);
        return {
          name: envMeta.name,
          type: configured?.type || 'value',
          data: configured?.data || '',
          isDefined: !!configured,
          required: envMeta.required,
          secret: envMeta.secret,
          description: envMeta.description,
          default: envMeta.default,
        };
      });

      return (
        <div className="pf-u-pt-md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allEnvVars.map((envVar, index) => (
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
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                  className="pf-u-mb-sm"
                >
                  <FlexItem>
                    <strong>{envVar.name}</strong>
                  </FlexItem>
                  {!envVar.isDefined && (
                    <FlexItem>
                      <Label color="grey" isCompact>
                        Undefined
                      </Label>
                    </FlexItem>
                  )}
                  {envVar.required && (
                    <FlexItem>
                      <Label color="red" isCompact>
                        Required
                      </Label>
                    </FlexItem>
                  )}
                  {envVar.secret && (
                    <FlexItem>
                      <Label color="orange" isCompact>
                        Secret
                      </Label>
                    </FlexItem>
                  )}
                  {envVar.description && (
                    <FlexItem className="pf-u-color-200 pf-u-font-size-sm">
                      {envVar.description}
                    </FlexItem>
                  )}
                </Flex>
                {envVar.isDefined ? (
                  <div className="pf-u-ml-lg">
                    {envVar.type === 'value' ? (
                      <div>
                        <Label color="blue" isCompact>
                          Value
                        </Label>
                        <code className="pf-u-ml-sm pf-u-font-size-sm">
                          {envVar.secret ? '••••••••' : envVar.data}
                        </code>
                      </div>
                    ) : (
                      <div>
                        <Label color="purple" isCompact>
                          Secret Reference
                        </Label>
                        <code className="pf-u-ml-sm pf-u-font-size-sm">{envVar.data}</code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pf-u-ml-lg pf-u-color-200 pf-u-font-size-sm">
                    Not configured
                    {envVar.default && ` (Default: ${envVar.default})`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fallback: If no metadata, show only configured env vars
    const hasEnv = server.spec.env && server.spec.env.length > 0;
    const hasSecrets = server.spec.secrets && server.spec.secrets.length > 0;

    if (!hasEnv && !hasSecrets) {
      return (
        <div className="pf-u-pt-md">
          <Alert variant={AlertVariant.info} title="No configuration" isInline>
            This server has no environment variables configured.
          </Alert>
        </div>
      );
    }

    // Collect all env vars (both values and secrets)
    const allEnvVars: Array<{
      name: string;
      type: 'value' | 'secret';
      data: string;
      required?: boolean;
      secret?: boolean;
      description?: string;
    }> = [];

    // Add value-based env vars
    server.spec.env?.forEach((env) => {
      const metadata = serverMetadata?.env_vars?.find((v) => v.name === env.name);
      allEnvVars.push({
        name: env.name,
        type: 'value',
        data: env.value || '',
        required: metadata?.required,
        secret: metadata?.secret,
        description: metadata?.description,
      });
    });

    // Add secret-based env vars
    server.spec.secrets?.forEach((secret) => {
      const envName = secret.targetEnvName || secret.key;
      const metadata = serverMetadata?.env_vars?.find((v) => v.name === envName);
      allEnvVars.push({
        name: envName,
        type: 'secret',
        data: `${secret.name}/${secret.key}`,
        required: metadata?.required,
        secret: metadata?.secret,
        description: metadata?.description,
      });
    });

    return (
      <div className="pf-u-pt-md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {allEnvVars.map((envVar, index) => (
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
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
                className="pf-u-mb-sm"
              >
                <FlexItem>
                  <strong>{envVar.name}</strong>
                </FlexItem>
                {envVar.required && (
                  <FlexItem>
                    <Label color="red" isCompact>
                      Required
                    </Label>
                  </FlexItem>
                )}
                {envVar.secret && (
                  <FlexItem>
                    <Label color="orange" isCompact>
                      Secret
                    </Label>
                  </FlexItem>
                )}
                <FlexItem>
                  <Label color={envVar.type === 'secret' ? 'orange' : 'blue'} isCompact>
                    {envVar.type === 'secret' ? 'Secret' : 'Value'}
                  </Label>
                </FlexItem>
                {envVar.description && (
                  <FlexItem className="pf-u-color-200 pf-u-font-size-sm">
                    {envVar.description}
                  </FlexItem>
                )}
              </Flex>
              <div>
                {envVar.type === 'secret' ? (
                  <>
                    Secret: <code>{envVar.data.split('/')[0]}</code>, Key:{' '}
                    <code>{envVar.data.split('/')[1]}</code>
                  </>
                ) : (
                  <code>{envVar.data || '***'}</code>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderResourcesTab = () => (
    <div className="pf-u-pt-md">
      <DescriptionList isHorizontal isCompact>
        <DescriptionListGroup>
          <DescriptionListTerm>
            <strong>Limits</strong>
          </DescriptionListTerm>
          <DescriptionListDescription> </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>CPU</DescriptionListTerm>
          <DescriptionListDescription>
            {server.spec.resources?.limits?.cpu || 'Not set'}
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>Memory</DescriptionListTerm>
          <DescriptionListDescription>
            {server.spec.resources?.limits?.memory || 'Not set'}
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>
            <strong>Requests</strong>
          </DescriptionListTerm>
          <DescriptionListDescription> </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>CPU</DescriptionListTerm>
          <DescriptionListDescription>
            {server.spec.resources?.requests?.cpu || 'Not set'}
          </DescriptionListDescription>
        </DescriptionListGroup>

        <DescriptionListGroup>
          <DescriptionListTerm>Memory</DescriptionListTerm>
          <DescriptionListDescription>
            {server.spec.resources?.requests?.memory || 'Not set'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </div>
  );

  const renderAdvancedTab = () => {
    const podSpec = server.spec.podTemplateSpec?.spec;

    if (!podSpec) {
      return (
        <div className="pf-u-pt-md">
          <Alert variant={AlertVariant.info} title="No advanced configuration" isInline>
            This server has no advanced pod configuration.
          </Alert>
        </div>
      );
    }

    return (
      <div className="pf-u-pt-md">
        <DescriptionList isHorizontal isCompact>
          {podSpec.imagePullSecrets && podSpec.imagePullSecrets.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Image Pull Secrets</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                  {podSpec.imagePullSecrets.map((secret, index) => (
                    <FlexItem key={index}>
                      <Label color="blue" isCompact>
                        {secret.name}
                      </Label>
                    </FlexItem>
                  ))}
                </Flex>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {podSpec.serviceAccountName && (
            <DescriptionListGroup>
              <DescriptionListTerm>Service Account</DescriptionListTerm>
              <DescriptionListDescription>{podSpec.serviceAccountName}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {podSpec.nodeSelector && Object.keys(podSpec.nodeSelector).length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Node Selector</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
                  {Object.entries(podSpec.nodeSelector).map(([key, value]) => (
                    <FlexItem key={key}>
                      <code>
                        {key}={value}
                      </code>
                    </FlexItem>
                  ))}
                </Flex>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {podSpec.securityContext && (
            <>
              {podSpec.securityContext.runAsNonRoot && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Run as Non-Root</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="green" isCompact>
                      Enabled
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}

              {podSpec.securityContext.runAsUser !== undefined && (
                <DescriptionListGroup>
                  <DescriptionListTerm>User ID</DescriptionListTerm>
                  <DescriptionListDescription>
                    {podSpec.securityContext.runAsUser}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}

              {podSpec.securityContext.runAsGroup !== undefined && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Group ID</DescriptionListTerm>
                  <DescriptionListDescription>
                    {podSpec.securityContext.runAsGroup}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </>
          )}
        </DescriptionList>
      </div>
    );
  };

  return (
    <Modal isOpen onClose={onClose} variant="medium" data-testid="mcp-deployed-server-details">
      <ModalHeader>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{getServerIcon()}</FlexItem>
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              {displayName}
            </Title>
          </FlexItem>
        </Flex>
        {description && <div className="pf-u-color-200 pf-u-mt-sm">{description}</div>}
      </ModalHeader>
      <ModalBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Server details tabs"
        >
          <Tab eventKey={DetailsTab.SERVER} title={<TabTitleText>Server</TabTitleText>}>
            {renderServerTab()}
          </Tab>
          <Tab eventKey={DetailsTab.CONFIG} title={<TabTitleText>Config</TabTitleText>}>
            {renderConfigTab()}
          </Tab>
          <Tab eventKey={DetailsTab.RESOURCES} title={<TabTitleText>Resources</TabTitleText>}>
            {renderResourcesTab()}
          </Tab>
          <Tab eventKey={DetailsTab.ADVANCED} title={<TabTitleText>Advanced</TabTitleText>}>
            {renderAdvancedTab()}
          </Tab>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button
            variant="primary"
            icon={<PencilAltIcon />}
            onClick={() => {
              onEdit(server);
              onClose();
            }}
          >
            Edit
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};
