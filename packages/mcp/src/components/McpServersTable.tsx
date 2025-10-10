import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, EmptyStateBody, Label, Button, Tooltip } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, ActionsColumn } from '@patternfly/react-table';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  QuestionCircleIcon,
  CopyIcon,
} from '@patternfly/react-icons';
import { McpServer, McpTransport } from '../types/server';
import { McpRegistry } from '../types/registry';

interface McpServersTableProps {
  servers: McpServer[];
  registries: McpRegistry[];
  onCopyEndpoint: (endpoint: string) => void;
  onServerClick: (server: McpServer) => void;
  onServerRegister: (server: McpServer) => void;
  onServerUnregister: (server: McpServer) => void;
  onServerDelete: (server: McpServer) => void;
}

type SortableColumn = 'name' | 'status' | 'registry' | 'transport';

const getLinkedRegistry = (
  server: McpServer,
  registries: McpRegistry[],
): McpRegistry | undefined => {
  const registryName = server.metadata?.labels?.['toolhive.stacklok.io/registry-name'];
  const registryNamespace = server.metadata?.labels?.['toolhive.stacklok.io/registry-namespace'];

  if (!registryName || !registryNamespace) {
    return undefined;
  }

  return registries.find(
    (r) => r.metadata?.name === registryName && r.metadata.namespace === registryNamespace,
  );
};

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

const getTransportColor = (transport: McpTransport): 'blue' | 'purple' | 'green' => {
  switch (transport) {
    case 'stdio':
      return 'blue';
    case 'sse':
      return 'purple';
    case 'streamable-http':
      return 'green';
    default:
      return 'blue';
  }
};

export const McpServersTable: React.FC<McpServersTableProps> = ({
  servers,
  registries,
  onCopyEndpoint,
  onServerClick,
  onServerRegister,
  onServerUnregister,
  onServerDelete,
}) => {
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = React.useState<SortableColumn>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedServers = React.useMemo(() => {
    const sorted = servers.toSorted((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortColumn) {
        case 'name':
          aValue = a.metadata?.name || '';
          bValue = b.metadata?.name || '';
          break;
        case 'status':
          aValue = a.status?.phase || 'Unknown';
          bValue = b.status?.phase || 'Unknown';
          break;
        case 'registry':
          aValue = getLinkedRegistry(a, registries)?.metadata?.name || '';
          bValue = getLinkedRegistry(b, registries)?.metadata?.name || '';
          break;
        case 'transport':
          aValue = a.spec.transport;
          bValue = b.spec.transport;
          break;
        default:
          aValue = a.metadata?.name || '';
          bValue = b.metadata?.name || '';
      }

      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [servers, registries, sortColumn, sortDirection]);

  const getSortParams = (column: SortableColumn) => ({
    sort: {
      sortBy: {
        index: column === 'name' ? 0 : column === 'status' ? 1 : column === 'registry' ? 2 : 3,
        direction: sortColumn === column ? sortDirection : 'asc',
      },
      onSort: () => handleSort(column),
      columnIndex: column === 'name' ? 0 : column === 'status' ? 1 : column === 'registry' ? 2 : 3,
    },
  });

  if (servers.length === 0) {
    return (
      <EmptyState titleText="No servers found" headingLevel="h4">
        <EmptyStateBody>
          No MCP servers match the current filters. Try adjusting your search criteria or deploy a
          new server.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="MCP Servers table" variant="compact">
      <Thead>
        <Tr>
          <Th {...getSortParams('name')}>Name</Th>
          <Th {...getSortParams('status')}>Status</Th>
          <Th {...getSortParams('registry')}>Linked Registry</Th>
          <Th>Endpoint</Th>
          <Th {...getSortParams('transport')}>Transport</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {sortedServers.map((server) => {
          const linkedRegistry = getLinkedRegistry(server, registries);
          const endpoint = server.status?.url || server.status?.endpoint;
          const status = server.status?.phase || 'Unknown';

          return (
            <Tr key={server.metadata?.uid || server.metadata?.name}>
              <Td dataLabel="Name">
                <Button variant="link" isInline onClick={() => onServerClick(server)}>
                  {server.metadata?.name}
                </Button>
              </Td>
              <Td dataLabel="Status">
                <Label icon={getStatusIcon(status)} color={getStatusColor(status)} isCompact>
                  {status}
                </Label>
              </Td>
              <Td dataLabel="Linked Registry">
                {linkedRegistry && linkedRegistry.metadata?.name ? (
                  <Button
                    variant="link"
                    isInline
                    onClick={() =>
                      navigate(`/mcp/registries/${linkedRegistry.metadata?.name || ''}`)
                    }
                  >
                    {linkedRegistry.metadata.name}
                  </Button>
                ) : (
                  <Label color="grey" isCompact>
                    Unregistered
                  </Label>
                )}
              </Td>
              <Td dataLabel="Endpoint">
                {endpoint ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                      {endpoint}
                    </code>
                    <Tooltip content="Copy endpoint URL">
                      <Button
                        variant="plain"
                        aria-label="Copy endpoint"
                        onClick={() => onCopyEndpoint(endpoint)}
                        icon={<CopyIcon />}
                      />
                    </Tooltip>
                  </div>
                ) : (
                  <span className="pf-v6-u-color-200">—</span>
                )}
              </Td>
              <Td dataLabel="Transport">
                <Label color={getTransportColor(server.spec.transport)} isCompact>
                  {server.spec.transport}
                </Label>
              </Td>
              <Td dataLabel="Actions" isActionCell>
                <ActionsColumn
                  items={[
                    {
                      title: 'View details',
                      onClick: () => onServerClick(server),
                    },
                    { isSeparator: true },
                    {
                      title: 'Register to registry',
                      onClick: () => onServerRegister(server),
                      isDisabled: !!linkedRegistry,
                    },
                    {
                      title: 'Unregister from registry',
                      onClick: () => onServerUnregister(server),
                      isDisabled: !linkedRegistry,
                    },
                    { isSeparator: true },
                    {
                      title: 'Delete server',
                      onClick: () => onServerDelete(server),
                    },
                  ]}
                />
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};
