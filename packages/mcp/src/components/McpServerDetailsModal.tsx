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
} from '@patternfly/react-icons';
import { McpServerMetadata, McpTransport, McpServerTier } from '../types';

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

  const getServerIcon = () => {
    if (server.logo) {
      return (
        <img
          src={server.logo}
          alt={`${server.displayName || server.name} logo`}
          style={{ width: '32px', height: '32px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return <InfoCircleIcon style={{ width: '32px', height: '32px' }} />;
  };

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
    const transport = getTransportFromTags();
    const tier = getTierFromTags();

    return (
      <div>
        <Title headingLevel="h3" size="lg" className="pf-u-mb-md">
          Server Information
        </Title>
        <DescriptionList>
          <DescriptionListGroup>
            <DescriptionListTerm>Name</DescriptionListTerm>
            <DescriptionListDescription>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>{getServerIcon()}</FlexItem>
                <FlexItem>
                  <strong>{server.displayName || server.name}</strong>
                </FlexItem>
              </Flex>
            </DescriptionListDescription>
          </DescriptionListGroup>

          {server.description && (
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>{server.description}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          <DescriptionListGroup>
            <DescriptionListTerm>Version</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color="grey" isCompact>
                {formatVersion()}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>

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

          {transport && (
            <DescriptionListGroup>
              <DescriptionListTerm>Transport</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color="blue" isCompact>
                  {transport}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {tier && (
            <DescriptionListGroup>
              <DescriptionListTerm>Tier</DescriptionListTerm>
              <DescriptionListDescription>
                <Label
                  color={tier === 'official' ? 'green' : tier === 'community' ? 'blue' : 'orange'}
                  isCompact
                >
                  {tier}
                </Label>
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

          <DescriptionListGroup>
            <DescriptionListTerm>Capabilities</DescriptionListTerm>
            <DescriptionListDescription>
              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                {server.tools && server.tools.length > 0 && (
                  <FlexItem>
                    <Badge isRead>
                      {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
                    </Badge>
                  </FlexItem>
                )}
                {server.prompts && server.prompts.length > 0 && (
                  <FlexItem>
                    <Badge isRead>
                      {server.prompts.length} prompt{server.prompts.length !== 1 ? 's' : ''}
                    </Badge>
                  </FlexItem>
                )}
                {server.resources && server.resources.length > 0 && (
                  <FlexItem>
                    <Badge isRead>
                      {server.resources.length} resource{server.resources.length !== 1 ? 's' : ''}
                    </Badge>
                  </FlexItem>
                )}
              </Flex>
            </DescriptionListDescription>
          </DescriptionListGroup>
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
      <div>
        <Title headingLevel="h3" size="lg" className="pf-u-mb-md">
          Available Tools ({server.tools.length})
        </Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {server.tools.map((tool, index) => (
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
                    <strong>{tool.name || 'Unnamed Tool'}</strong>
                  </FlexItem>
                </Flex>
              </CardTitle>
              <CardBody>
                {tool.description && <div className="pf-u-mb-sm">{tool.description}</div>}
                {tool.inputSchema && (
                  <div>
                    <strong>Input Schema:</strong>
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
                      <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
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
          <div className="pf-u-mb-lg">
            <Title headingLevel="h3" size="lg" className="pf-u-mb-md">
              Environment Variables ({server.env_vars?.length || 0})
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {server.env_vars?.map((envVar, index) => (
                <Card key={index} isCompact style={{ backgroundColor: '#f5f5f5' }}>
                  <CardBody style={{ padding: '12px' }}>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                      style={{ marginBottom: '4px', flexWrap: 'wrap' }}
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
                    </Flex>
                    <div className="pf-u-color-200">
                      {envVar.description || 'No description available'}
                      {envVar.default && ` (Default: ${envVar.default})`}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
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
    const dockerCommand = `docker run -p 8080:8080 ${server.name}${
      server.version ? `:${server.version}` : ''
    }`;

    return (
      <div>
        <Title headingLevel="h3" size="lg" className="pf-u-mb-md">
          Manual Installation
        </Title>
        <div className="pf-u-color-200 pf-u-font-size-sm pf-u-mb-md">
          Use these commands to manually install and run this server:
        </div>

        <Card isCompact className="pf-u-mb-md">
          <CardTitle>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <CodeIcon />
              </FlexItem>
              <FlexItem>
                <strong>Docker Command</strong>
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <div
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
          </CardBody>
        </Card>

        {(server.repository || server.homepage) && (
          <Card isCompact>
            <CardTitle>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <ExternalLinkAltIcon />
                </FlexItem>
                <FlexItem>
                  <strong>Source Repository</strong>
                </FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                {server.repository && (
                  <FlexItem>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ExternalLinkAltIcon />}
                      onClick={() => window.open(server.repository, '_blank')}
                    >
                      View Source Code
                    </Button>
                  </FlexItem>
                )}
                {server.homepage && (
                  <FlexItem>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ExternalLinkAltIcon />}
                      onClick={() => window.open(server.homepage, '_blank')}
                    >
                      Documentation
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen onClose={onClose} variant="large" data-testid="mcp-server-details-modal">
      <ModalHeader>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{getServerIcon()}</FlexItem>
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              {server.displayName || server.name}
            </Title>
          </FlexItem>
        </Flex>
        {server.description && (
          <div className="pf-u-color-200 pf-u-mt-sm">{server.description}</div>
        )}
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
            title={<TabTitleText>Config</TabTitleText>}
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
