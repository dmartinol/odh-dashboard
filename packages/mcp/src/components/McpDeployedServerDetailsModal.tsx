import * as React from 'react';
import {
  Badge,
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
  Tooltip,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  QuestionCircleIcon,
  CopyIcon,
  ExternalLinkAltIcon,
} from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { McpServer, McpServerMetadata } from '../types/server';
import { McpRegistry } from '../types/registry';

interface McpDeployedServerDetailsModalProps {
  onClose: () => void;
  server: McpServer;
  linkedRegistry?: McpRegistry;
  serverMetadata?: McpServerMetadata;
  onEdit?: (server: McpServer) => void;
}

enum ServerDetailsTab {
  OVERVIEW = 'overview',
  SPEC = 'spec',
  STATUS = 'status',
  LABELS = 'labels',
}

const getStatusIcon = (phase?: string) => {
  switch (phase) {
    case 'Running':
      return <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />;
    case 'Failed':
      return (
        <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
      );
    case 'Pending':
      return <InProgressIcon color="var(--pf-t--global--icon--color--status--info--default)" />;
    default:
      return (
        <QuestionCircleIcon color="var(--pf-t--global--icon--color--status--custom--default)" />
      );
  }
};

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

export const McpDeployedServerDetailsModal: React.FC<McpDeployedServerDetailsModalProps> = ({
  onClose,
  server,
  linkedRegistry,
  serverMetadata,
  onEdit,
}) => {
  const navigate = useNavigate();
  const [activeTabKey, setActiveTabKey] = React.useState<string>(ServerDetailsTab.OVERVIEW);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '—';
    }
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const renderOverviewTab = () => (
    <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Name</DescriptionListTerm>
        <DescriptionListDescription>{server.metadata?.name}</DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Namespace</DescriptionListTerm>
        <DescriptionListDescription>{server.metadata?.namespace}</DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Status</DescriptionListTerm>
        <DescriptionListDescription>
          <Label
            icon={getStatusIcon(server.status?.phase)}
            color={getStatusColor(server.status?.phase)}
            isCompact
          >
            {server.status?.phase || 'Unknown'}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Linked Registry</DescriptionListTerm>
        <DescriptionListDescription>
          {linkedRegistry ? (
            <Button
              variant="link"
              isInline
              onClick={() => {
                onClose();
                navigate(`/mcp/registries/${linkedRegistry.metadata?.name ?? ''}`);
              }}
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
            >
              {linkedRegistry.metadata?.name}
            </Button>
          ) : (
            <Label color="grey" isCompact>
              Unregistered
            </Label>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Image</DescriptionListTerm>
        <DescriptionListDescription>
          <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
            {server.spec.image}
          </code>
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Transport</DescriptionListTerm>
        <DescriptionListDescription>
          <Label color="blue" isCompact>
            {server.spec.transport}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Tier</DescriptionListTerm>
        <DescriptionListDescription>
          <Label color="blue" isCompact>
            {server.spec.tier}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Endpoint</DescriptionListTerm>
        <DescriptionListDescription>
          {server.status?.url || server.status?.endpoint ? (
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                  {server.status.url || server.status.endpoint}
                </code>
              </FlexItem>
              <FlexItem>
                <Tooltip content="Copy endpoint URL">
                  <Button
                    variant="plain"
                    aria-label="Copy endpoint"
                    onClick={() =>
                      handleCopyToClipboard(server.status?.url || server.status?.endpoint || '')
                    }
                    icon={<CopyIcon />}
                  />
                </Tooltip>
              </FlexItem>
            </Flex>
          ) : (
            <span className="pf-v6-u-color-200">—</span>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Created</DescriptionListTerm>
        <DescriptionListDescription>
          {formatDate(server.metadata?.creationTimestamp)}
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>UID</DescriptionListTerm>
        <DescriptionListDescription>
          <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-xs">
            {server.metadata?.uid}
          </code>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );

  const renderSpecTab = () => (
    <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Image</DescriptionListTerm>
        <DescriptionListDescription>
          <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
            {server.spec.image}
          </code>
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Transport</DescriptionListTerm>
        <DescriptionListDescription>{server.spec.transport}</DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Tier</DescriptionListTerm>
        <DescriptionListDescription>{server.spec.tier}</DescriptionListDescription>
      </DescriptionListGroup>

      {server.spec.args && server.spec.args.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Args</DescriptionListTerm>
          <DescriptionListDescription>
            <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
              {server.spec.args.join(' ')}
            </code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {server.spec.env && server.spec.env.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Environment Variables</DescriptionListTerm>
          <DescriptionListDescription>
            {server.spec.env.map((envVar) => (
              <div key={envVar.name}>
                <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                  {envVar.name}={envVar.value || '***'}
                </code>
              </div>
            ))}
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {server.spec.resources && (
        <DescriptionListGroup>
          <DescriptionListTerm>Resources</DescriptionListTerm>
          <DescriptionListDescription>
            {server.spec.resources.requests && (
              <div>
                <strong>Requests:</strong> CPU:{' '}
                {server.spec.resources.requests.cpu || '—'}, Memory:{' '}
                {server.spec.resources.requests.memory || '—'}
              </div>
            )}
            {server.spec.resources.limits && (
              <div>
                <strong>Limits:</strong> CPU:{' '}
                {server.spec.resources.limits.cpu || '—'}, Memory:{' '}
                {server.spec.resources.limits.memory || '—'}
              </div>
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {server.status?.replicas !== undefined && (
        <DescriptionListGroup>
          <DescriptionListTerm>Replicas</DescriptionListTerm>
          <DescriptionListDescription>{server.status.replicas}</DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  );

  const renderStatusTab = () => (
    <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>Phase</DescriptionListTerm>
        <DescriptionListDescription>
          <Label
            icon={getStatusIcon(server.status?.phase)}
            color={getStatusColor(server.status?.phase)}
            isCompact
          >
            {server.status?.phase || 'Unknown'}
          </Label>
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Ready</DescriptionListTerm>
        <DescriptionListDescription>
          {server.status?.ready ? (
            <Label color="green" isCompact>
              Yes
            </Label>
          ) : (
            <Label color="red" isCompact>
              No
            </Label>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>

      {server.status?.message && (
        <DescriptionListGroup>
          <DescriptionListTerm>Message</DescriptionListTerm>
          <DescriptionListDescription>{server.status.message}</DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {server.status?.endpoint && (
        <DescriptionListGroup>
          <DescriptionListTerm>Endpoint</DescriptionListTerm>
          <DescriptionListDescription>
            <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
              {server.status.endpoint}
            </code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {server.status?.url && (
        <DescriptionListGroup>
          <DescriptionListTerm>URL</DescriptionListTerm>
          <DescriptionListDescription>
            <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
              {server.status.url}
            </code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {(server.status?.replicas !== undefined || server.status?.readyReplicas !== undefined) && (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>Replicas</DescriptionListTerm>
            <DescriptionListDescription>{server.status.replicas ?? 0}</DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Ready Replicas</DescriptionListTerm>
            <DescriptionListDescription>
              {server.status.readyReplicas ?? 0}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </>
      )}

      {server.status?.conditions && server.status.conditions.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Conditions</DescriptionListTerm>
          <DescriptionListDescription>
            {server.status.conditions.map((condition, idx) => (
              <div key={idx} className="pf-v6-u-mb-sm">
                <strong>{condition.type}:</strong> {condition.status}
                {condition.message && <div className="pf-v6-u-ml-md">{condition.message}</div>}
              </div>
            ))}
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  );

  const renderLabelsTab = () => (
    <DescriptionList isHorizontal columnModifier={{ default: '1Col' }}>
      {server.metadata?.labels && Object.keys(server.metadata.labels).length > 0 ? (
        Object.entries(server.metadata.labels).map(([key, value]) => (
          <DescriptionListGroup key={key}>
            <DescriptionListTerm>
              <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">{key}</code>
            </DescriptionListTerm>
            <DescriptionListDescription>
              <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">{value}</code>
              {key.startsWith('toolhive.stacklok.io/') && (
                <Badge className="pf-v6-u-ml-sm" isRead>
                  Registry Label
                </Badge>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))
      ) : (
        <DescriptionListGroup>
          <DescriptionListTerm>Labels</DescriptionListTerm>
          <DescriptionListDescription>No labels</DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {server.metadata?.annotations && Object.keys(server.metadata.annotations).length > 0 && (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <strong>Annotations</strong>
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div />
            </DescriptionListDescription>
          </DescriptionListGroup>
          {Object.entries(server.metadata.annotations).map(([key, value]) => (
            <DescriptionListGroup key={key}>
              <DescriptionListTerm>
                <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">{key}</code>
              </DescriptionListTerm>
              <DescriptionListDescription>
                <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">{value}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </>
      )}
    </DescriptionList>
  );

  return (
    <Modal onClose={onClose} variant="medium" aria-labelledby="server-details-modal-title">
      <ModalHeader title={`Server: ${server.metadata?.name ?? 'Unknown'}`}>
        <div className="pf-v6-u-color-200 pf-v6-u-font-size-sm">
          Namespace: {server.metadata?.namespace ?? 'Unknown'}
        </div>
      </ModalHeader>
      <ModalBody>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(e, tabIndex) => setActiveTabKey(String(tabIndex))}
          aria-label="Server details tabs"
        >
          <Tab
            eventKey={ServerDetailsTab.OVERVIEW}
            title={<TabTitleText>Overview</TabTitleText>}
            aria-label="Overview tab"
          >
            {renderOverviewTab()}
          </Tab>
          <Tab
            eventKey={ServerDetailsTab.SPEC}
            title={<TabTitleText>Spec</TabTitleText>}
            aria-label="Spec tab"
          >
            {renderSpecTab()}
          </Tab>
          <Tab
            eventKey={ServerDetailsTab.STATUS}
            title={<TabTitleText>Status</TabTitleText>}
            aria-label="Status tab"
          >
            {renderStatusTab()}
          </Tab>
          <Tab
            eventKey={ServerDetailsTab.LABELS}
            title={<TabTitleText>Labels & Annotations</TabTitleText>}
            aria-label="Labels tab"
          >
            {renderLabelsTab()}
          </Tab>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        {onEdit && (
          <Button variant="secondary" onClick={() => onEdit(server)} className="pf-v6-u-mr-sm">
            Edit
          </Button>
        )}
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};
