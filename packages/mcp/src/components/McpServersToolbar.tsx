import * as React from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  MenuToggle,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { McpRegistry } from '../types/registry';

interface McpServersToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedRegistry: string;
  onRegistryChange: (registry: string) => void;
  selectedTransport: string;
  onTransportChange: (transport: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  registries: McpRegistry[];
}

const TRANSPORT_OPTIONS = [
  { value: 'all', label: 'All Transports' },
  { value: 'stdio', label: 'stdio' },
  { value: 'sse', label: 'SSE' },
  { value: 'streamable-http', label: 'Streamable HTTP' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Running', label: 'Running' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Unknown', label: 'Unknown' },
];

export const McpServersToolbar: React.FC<McpServersToolbarProps> = ({
  searchValue,
  onSearchChange,
  selectedRegistry,
  onRegistryChange,
  selectedTransport,
  onTransportChange,
  selectedStatus,
  onStatusChange,
  registries,
}) => {
  const [isRegistryOpen, setIsRegistryOpen] = React.useState(false);
  const [isTransportOpen, setIsTransportOpen] = React.useState(false);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);

  const registryOptions = React.useMemo(() => {
    const options = [
      { value: 'all', label: 'All Registries' },
      { value: 'unregistered', label: 'Unregistered' },
    ];

    registries.forEach((registry) => {
      if (registry.metadata?.name) {
        options.push({
          value: registry.metadata.name,
          label: registry.metadata.name,
        });
      }
    });

    return options;
  }, [registries]);

  const getSelectedLabel = (value: string, options: Array<{ value: string; label: string }>) => {
    return options.find((opt) => opt.value === value)?.label || value;
  };

  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <SearchInput
            placeholder="Search by name..."
            value={searchValue}
            onChange={(_event, value) => onSearchChange(value)}
            onClear={() => onSearchChange('')}
            style={{ minWidth: '300px' }}
          />
        </ToolbarItem>

        <ToolbarItem>
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <FilterIcon className="pf-v6-u-mr-xs" />
            </FlexItem>
            <FlexItem>
              <Select
                id="registry-filter"
                isOpen={isRegistryOpen}
                selected={selectedRegistry}
                onSelect={(_event, value) => {
                  onRegistryChange(String(value));
                  setIsRegistryOpen(false);
                }}
                onOpenChange={(isOpen) => setIsRegistryOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsRegistryOpen(!isRegistryOpen)}
                    isExpanded={isRegistryOpen}
                    style={{ minWidth: '180px' }}
                  >
                    {getSelectedLabel(selectedRegistry, registryOptions)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {registryOptions.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FlexItem>

            <FlexItem>
              <Select
                id="transport-filter"
                isOpen={isTransportOpen}
                selected={selectedTransport}
                onSelect={(_event, value) => {
                  onTransportChange(String(value));
                  setIsTransportOpen(false);
                }}
                onOpenChange={(isOpen) => setIsTransportOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsTransportOpen(!isTransportOpen)}
                    isExpanded={isTransportOpen}
                    style={{ minWidth: '160px' }}
                  >
                    {getSelectedLabel(selectedTransport, TRANSPORT_OPTIONS)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {TRANSPORT_OPTIONS.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FlexItem>

            <FlexItem>
              <Select
                id="status-filter"
                isOpen={isStatusOpen}
                selected={selectedStatus}
                onSelect={(_event, value) => {
                  onStatusChange(String(value));
                  setIsStatusOpen(false);
                }}
                onOpenChange={(isOpen) => setIsStatusOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                    isExpanded={isStatusOpen}
                    style={{ minWidth: '150px' }}
                  >
                    {getSelectedLabel(selectedStatus, STATUS_OPTIONS)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FlexItem>
          </Flex>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};
