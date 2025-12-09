import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
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
import {
  ExternalLinkAltIcon,
  CubesIcon,
  CodeIcon,
  CogIcon,
  InfoCircleIcon,
  StarIcon,
  DownloadIcon,
} from '@patternfly/react-icons';
import { McpServerMetadata, McpTransport, McpServerTier } from '../types';
import { useServerLogo } from '../hooks/useServerLogo';

interface McpServerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: McpServerMetadata;
  onDeploy?: (server: McpServerMetadata) => void;
}

enum ServerDetailsTab {
  OVERVIEW = 'overview',
  TOOLS = 'tools',
  CONFIG = 'config',
  MANUAL_INSTALLATION = 'manual-installation',
}

export const McpServerDetailsModal: React.FC<McpServerDetailsModalProps> = ({
  isOpen,
  onClose,
  server,
  onDeploy,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string>(ServerDetailsTab.OVERVIEW);

  // Debug logging for server data
  React.useEffect(() => {
    if (isOpen) {
      console.log(`🔍 [MODAL] Server details modal opened for: ${server.name}`);
      console.log(`🔍 [MODAL] Server tools:`, server.tools);
      console.log(`🔍 [MODAL] Tools count:`, server.tools?.length || 0);
      if (server.tools && server.tools.length > 0) {
        server.tools.forEach((tool, index) => {
          console.log(`🔍 [MODAL] Tool ${index}:`, tool);
          console.log(`🔍 [MODAL] Tool ${index} keys:`, Object.keys(tool));
          console.log(`🔍 [MODAL] Tool ${index} entries:`, Object.entries(tool));
          console.log(`🔍 [MODAL] Tool ${index} detailed:`, {
            name: tool.name,
            description: tool.description,
            hasInputSchema: !!tool.inputSchema,
            inputSchema: tool.inputSchema,
            allProperties: tool,
          });
        });
      }
      console.log(`🔍 [MODAL] Server prompts:`, server.prompts);
      console.log(`🔍 [MODAL] Server resources:`, server.resources);
      console.log(`🔍 [MODAL] Server env_vars:`, server.env_vars);
    }
  }, [isOpen, server]);

  const serverIcon = useServerLogo({ server, size: 32 });

  const getTransportFromTags = (): McpTransport | undefined => {
    const transports: McpTransport[] = ['stdio', 'sse', 'streamable-http'];
    return transports.find((transport) =>
      server.tags?.some((tag) => {
        const tagLower = tag.toLowerCase();
        const transportLower = transport.toLowerCase();
        // Try exact match first, then contains for backwards compatibility
        return tagLower === transportLower || tagLower.includes(transportLower);
      }),
    );
  };

  const getTierFromTags = (): McpServerTier | undefined => {
    const tiers: McpServerTier[] = ['official', 'community', 'experimental'];
    return tiers.find((tier) =>
      server.tags?.some((tag) => {
        const tagLower = tag.toLowerCase();
        const tierLower = tier.toLowerCase();
        // Try exact match first, then contains for backwards compatibility
        return tagLower === tierLower || tagLower.includes(tierLower);
      }),
    );
  };

  const formatVersion = () => {
    return server.version ? `v${server.version}` : 'Unknown';
  };

  const renderOverviewTab = () => {
    return (
      <div>
        <DescriptionList isHorizontal isCompact>
          {server.image && (
            <DescriptionListGroup>
              <DescriptionListTerm>Container Image</DescriptionListTerm>
              <DescriptionListDescription>
                <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                  {server.image}
                </code>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {server.author && (
            <DescriptionListGroup>
              <DescriptionListTerm>Author</DescriptionListTerm>
              <DescriptionListDescription>{server.author}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {server.license && (
            <DescriptionListGroup>
              <DescriptionListTerm>License</DescriptionListTerm>
              <DescriptionListDescription>{server.license}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {server.homepage && (
            <DescriptionListGroup>
              <DescriptionListTerm>Homepage</DescriptionListTerm>
              <DescriptionListDescription>
                <Button
                  variant="link"
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  onClick={() => window.open(server.homepage, '_blank')}
                >
                  {server.homepage}
                </Button>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {server.repository && (
            <DescriptionListGroup>
              <DescriptionListTerm>Repository</DescriptionListTerm>
              <DescriptionListDescription>
                <Button
                  variant="link"
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  onClick={() => window.open(server.repository, '_blank')}
                >
                  {server.repository}
                </Button>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {server.metadata &&
            (server.metadata.stars !== undefined ||
              server.metadata.pulls !== undefined ||
              server.metadata.last_updated) && (
              <DescriptionListGroup>
                <DescriptionListTerm>Repository Statistics</DescriptionListTerm>
                <DescriptionListDescription>
                  <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                    {server.metadata.stars !== undefined && server.metadata.stars > 0 && (
                      <FlexItem>
                        <Label variant="outline" icon={<StarIcon />} isCompact>
                          {server.metadata.stars} stars
                        </Label>
                      </FlexItem>
                    )}
                    {server.metadata.pulls !== undefined && server.metadata.pulls > 0 && (
                      <FlexItem>
                        <Label variant="outline" icon={<DownloadIcon />} isCompact>
                          {server.metadata.pulls} pulls
                        </Label>
                      </FlexItem>
                    )}
                    {server.metadata.last_updated && (
                      <FlexItem>
                        <Label variant="outline" isCompact>
                          Updated: {new Date(server.metadata.last_updated).toLocaleDateString()}
                        </Label>
                      </FlexItem>
                    )}
                  </Flex>
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}

          {server.tags && server.tags.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Tags</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                  {server.tags.map((tag, index) => (
                    <FlexItem key={index}>
                      <Label variant="outline" isCompact>
                        {tag}
                      </Label>
                    </FlexItem>
                  ))}
                </Flex>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </div>
    );
  };

  const renderToolsTab = () => {
    if (!server.tools || server.tools.length === 0) {
      return (
        <Alert variant={AlertVariant.info} title="No tools available" isInline>
          This server does not expose any tools.
        </Alert>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {server.tools.map((tool, index) => (
          <div
            key={index}
            className="pf-u-py-sm pf-u-px-md"
            style={{
              backgroundColor:
                index % 2 === 0
                  ? 'transparent'
                  : 'var(--pf-t--global--background--color--secondary--default)',
            }}
          >
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsXs' }}
            >
              <FlexItem>
                <CogIcon />
              </FlexItem>
              <FlexItem>
                <strong>{tool.name || 'Unnamed Tool'}</strong>
              </FlexItem>
              {tool.description && (
                <FlexItem className="pf-u-color-200">— {tool.description}</FlexItem>
              )}
            </Flex>
            {tool.inputSchema && (
              <details className="pf-u-mt-xs pf-u-ml-lg">
                <summary
                  style={{
                    cursor: 'pointer',
                    color: 'var(--pf-t--global--color--brand--default)',
                  }}
                >
                  View input schema
                </summary>
                <div
                  style={{
                    backgroundColor: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    marginTop: '4px',
                    border: '1px solid #d2d2d2',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0 }}>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderConfigTab = () => {
    // Check if we have environment variables, prompts, or resources configuration information
    const hasEnvVars = server.env_vars && server.env_vars.length > 0;
    const hasPrompts = server.prompts && server.prompts.length > 0;
    const hasResources = server.resources && server.resources.length > 0;
    const hasConfig = hasEnvVars || hasPrompts || hasResources;

    if (!hasConfig) {
      return (
        <Alert variant={AlertVariant.info} title="No configuration available" isInline>
          This server does not expose any environment variables, prompts, or resources
          configuration.
        </Alert>
      );
    }

    return (
      <div>
        {hasEnvVars && (
          <div className="pf-u-mb-lg" style={{ display: 'flex', flexDirection: 'column' }}>
            {server.env_vars?.map((envVar, index) => (
              <div
                key={index}
                className="pf-u-py-sm pf-u-px-md"
                style={{
                  backgroundColor:
                    index % 2 === 0
                      ? 'transparent'
                      : 'var(--pf-t--global--background--color--secondary--default)',
                }}
              >
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsXs' }}
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
                  {envVar.description && (
                    <FlexItem className="pf-u-color-200">
                      — {envVar.description}
                      {envVar.default && ` (Default: ${envVar.default})`}
                    </FlexItem>
                  )}
                  {!envVar.description && envVar.default && (
                    <FlexItem className="pf-u-color-200">(Default: {envVar.default})</FlexItem>
                  )}
                </Flex>
              </div>
            ))}
          </div>
        )}

        {hasPrompts && (
          <div className="pf-u-mb-lg">
            <Title headingLevel="h3" size="lg" className="pf-u-mb-md">
              Available Prompts ({server.prompts?.length || 0})
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {server.prompts?.map((prompt, index) => (
                <Card key={index} isCompact>
                  <CardTitle>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <InfoCircleIcon />
                      </FlexItem>
                      <FlexItem>
                        <strong>{prompt.name}</strong>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    {prompt.description && <div className="pf-u-mb-sm">{prompt.description}</div>}
                    {prompt.arguments && prompt.arguments.length > 0 && (
                      <div>
                        <strong>Arguments:</strong>
                        <div style={{ marginTop: '8px' }}>
                          {prompt.arguments.map((arg, argIndex) => (
                            <div key={argIndex} style={{ marginBottom: '8px' }}>
                              <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                spaceItems={{ default: 'spaceItemsSm' }}
                              >
                                <FlexItem>
                                  <Label variant="outline" isCompact>
                                    {arg.name}
                                  </Label>
                                </FlexItem>
                                {arg.required && (
                                  <FlexItem>
                                    <Label color="red" isCompact>
                                      required
                                    </Label>
                                  </FlexItem>
                                )}
                              </Flex>
                              {arg.description && (
                                <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mt-xs">
                                  {arg.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}

        {hasResources && (
          <div>
            <Title headingLevel="h3" size="lg" className="pf-u-mb-md">
              Available Resources ({server.resources?.length || 0})
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {server.resources?.map((resource, index) => (
                <Card key={index} isCompact>
                  <CardTitle>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <CogIcon />
                      </FlexItem>
                      <FlexItem>
                        <strong>{resource.name || resource.uri}</strong>
                      </FlexItem>
                      {resource.mimeType && (
                        <FlexItem>
                          <Label color="purple" isCompact>
                            {resource.mimeType}
                          </Label>
                        </FlexItem>
                      )}
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <div>
                      <strong>URI:</strong> <code>{resource.uri}</code>
                    </div>
                    {resource.description && (
                      <div style={{ marginTop: '8px' }}>
                        <strong>Description:</strong> {resource.description}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderManualInstallationTab = () => {
    const dockerCommand = `docker run -p 8080:8080 ${server.image || server.name}${
      server.version ? `:${server.version}` : ''
    }`;

    return (
      <div>
        <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mb-md">
          Use this command to manually install and run this server:
        </div>

        <div
          className="pf-u-py-sm pf-u-px-md"
          style={{
            backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
          }}
        >
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem>
              <CodeIcon />
            </FlexItem>
            <FlexItem>
              <strong>Docker Command</strong>
            </FlexItem>
          </Flex>
          <div
            className="pf-u-mt-sm"
            style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              border: '1px solid #d2d2d2',
              position: 'relative',
            }}
          >
            <code>{dockerCommand}</code>
            <Button
              variant="plain"
              size="sm"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '4px',
              }}
              onClick={() => navigator.clipboard.writeText(dockerCommand)}
              title="Copy command"
            >
              📋
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  const transport = getTransportFromTags();
  const tier = getTierFromTags();
  const toolsCount = server.tools?.length || 0;
  const promptsCount = server.prompts?.length || 0;
  const resourcesCount = server.resources?.length || 0;
  const envVarsCount = server.env_vars?.length || 0;

  return (
    <Modal isOpen onClose={onClose} variant="large" data-testid="mcp-server-details-modal">
      <ModalHeader>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{serverIcon}</FlexItem>
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              {server.displayName || server.name}
            </Title>
          </FlexItem>
        </Flex>
        {server.description && (
          <div className="pf-u-color-200 pf-u-mt-sm">{server.description}</div>
        )}
        <Flex spaceItems={{ default: 'spaceItemsXs' }} className="pf-u-mt-sm">
          {tier && (
            <FlexItem>
              <Label
                color={tier === 'official' ? 'green' : tier === 'community' ? 'blue' : 'orange'}
                isCompact
              >
                {tier}
              </Label>
            </FlexItem>
          )}
          {transport && (
            <FlexItem>
              <Label color="blue" isCompact>
                {transport}
              </Label>
            </FlexItem>
          )}
          {server.version && (
            <FlexItem>
              <Label color="grey" isCompact>
                {formatVersion()}
              </Label>
            </FlexItem>
          )}
          {toolsCount > 0 && (
            <FlexItem>
              <Badge isRead>
                {toolsCount} tool{toolsCount !== 1 ? 's' : ''}
              </Badge>
            </FlexItem>
          )}
          {promptsCount > 0 && (
            <FlexItem>
              <Badge isRead>
                {promptsCount} prompt{promptsCount !== 1 ? 's' : ''}
              </Badge>
            </FlexItem>
          )}
          {resourcesCount > 0 && (
            <FlexItem>
              <Badge isRead>
                {resourcesCount} resource{resourcesCount !== 1 ? 's' : ''}
              </Badge>
            </FlexItem>
          )}
        </Flex>
      </ModalHeader>
      <ModalBody style={{ minHeight: '400px' }}>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Server details tabs"
          role="region"
        >
          <Tab
            eventKey={ServerDetailsTab.OVERVIEW}
            title={<TabTitleText>Overview</TabTitleText>}
            aria-label="Server overview tab"
          >
            <div className="pf-u-p-md">{renderOverviewTab()}</div>
          </Tab>
          <Tab
            eventKey={ServerDetailsTab.TOOLS}
            title={
              <TabTitleText>
                Tools{' '}
                {server.tools && server.tools.length > 0 && (
                  <Badge isRead>{server.tools.length}</Badge>
                )}
              </TabTitleText>
            }
            aria-label="Server tools tab"
          >
            <div className="pf-u-p-md">{renderToolsTab()}</div>
          </Tab>
          <Tab
            eventKey={ServerDetailsTab.CONFIG}
            title={
              <TabTitleText>
                Config {envVarsCount > 0 && <Badge isRead>{envVarsCount}</Badge>}
              </TabTitleText>
            }
            aria-label="Server config tab"
          >
            <div className="pf-u-p-md">{renderConfigTab()}</div>
          </Tab>
          <Tab
            eventKey={ServerDetailsTab.MANUAL_INSTALLATION}
            title={<TabTitleText>Manual Installation</TabTitleText>}
            aria-label="Server manual installation tab"
          >
            <div className="pf-u-p-md">{renderManualInstallationTab()}</div>
          </Tab>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              {server.homepage && (
                <FlexItem>
                  <Button
                    variant="link"
                    icon={<ExternalLinkAltIcon />}
                    onClick={() => window.open(server.homepage, '_blank')}
                  >
                    View Documentation
                  </Button>
                </FlexItem>
              )}
              {server.repository && (
                <FlexItem>
                  <Button
                    variant="link"
                    icon={<ExternalLinkAltIcon />}
                    onClick={() => window.open(server.repository, '_blank')}
                  >
                    View Source
                  </Button>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  icon={<CubesIcon />}
                  onClick={() => {
                    onDeploy?.(server);
                    onClose();
                  }}
                >
                  Deploy Server
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};
