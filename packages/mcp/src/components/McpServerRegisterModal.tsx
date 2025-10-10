import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  TextInput,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { McpServer } from '../types/server';
import { McpRegistry } from '../types/registry';

interface McpServerRegisterModalProps {
  onClose: () => void;
  server: McpServer;
  registries: McpRegistry[];
  onRegister: (
    serverId: string,
    serverNamespace: string,
    registryName: string,
    registryNamespace: string,
    serverNameInRegistry: string,
  ) => Promise<void>;
}

export const McpServerRegisterModal: React.FC<McpServerRegisterModalProps> = ({
  onClose,
  server,
  registries,
  onRegister,
}) => {
  const [selectedRegistry, setSelectedRegistry] = React.useState<string>('');
  const [serverNameInRegistry, setServerNameInRegistry] = React.useState<string>(
    server.metadata?.name || '',
  );
  const [isRegistrySelectOpen, setIsRegistrySelectOpen] = React.useState(false);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRegister = async () => {
    if (!selectedRegistry || !serverNameInRegistry.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const registry = registries.find((r) => r.metadata?.name === selectedRegistry);
    if (!registry) {
      setError('Selected registry not found');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      await onRegister(
        server.metadata?.name || '',
        server.metadata?.namespace || '',
        registry.metadata?.name || '',
        registry.metadata?.namespace || '',
        serverNameInRegistry.trim(),
      );
      onClose();
    } catch (err) {
      console.error('Error registering server to registry:', err);
      setError(err instanceof Error ? err.message : 'Failed to register server to registry');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = () => {
    if (!isRegistering) {
      onClose();
    }
  };

  const selectedRegistryObj = registries.find((r) => r.metadata?.name === selectedRegistry);

  return (
    <Modal onClose={handleClose} variant="medium" aria-labelledby="register-server-modal-title">
      <ModalHeader
        title="Register Server to Registry"
        description="Connect this server to a registry by adding the required registry labels"
      />
      <ModalBody>
        {error && (
          <Alert variant={AlertVariant.danger} title="Error" className="pf-v6-u-mb-md" isInline>
            {error}
          </Alert>
        )}

        <Form>
          <FormGroup label="Server" isRequired fieldId="server-name">
            <TextInput
              id="server-name"
              value={server.metadata?.name}
              isDisabled
              aria-label="Server name"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Namespace: {server.metadata?.namespace}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Registry" isRequired fieldId="registry-select">
            <Select
              id="registry-select"
              isOpen={isRegistrySelectOpen}
              selected={selectedRegistry}
              onSelect={(_event, value) => {
                setSelectedRegistry(String(value));
                setIsRegistrySelectOpen(false);
              }}
              onOpenChange={(nextIsOpen) => setIsRegistrySelectOpen(nextIsOpen)}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsRegistrySelectOpen(!isRegistrySelectOpen)}
                  isExpanded={isRegistrySelectOpen}
                  isDisabled={isRegistering || registries.length === 0}
                  style={{ width: '100%' }}
                >
                  {selectedRegistry || 'Select a registry'}
                </MenuToggle>
              )}
              aria-label="Select registry"
            >
              <SelectList>
                {registries.map((registry) => (
                  <SelectOption key={registry.metadata?.name} value={registry.metadata?.name}>
                    {registry.metadata?.name}
                    {registry.metadata?.namespace &&
                      registry.metadata.namespace !== server.metadata?.namespace && (
                        <span className="pf-v6-u-color-200 pf-v6-u-ml-sm">
                          ({registry.metadata.namespace})
                        </span>
                      )}
                  </SelectOption>
                ))}
                {registries.length === 0 && (
                  <SelectOption isDisabled>No registries available</SelectOption>
                )}
              </SelectList>
            </Select>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Select the registry to connect this server to</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Server Name in Registry" isRequired fieldId="server-name-in-registry">
            <TextInput
              id="server-name-in-registry"
              value={serverNameInRegistry}
              onChange={(_event, value) => setServerNameInRegistry(value)}
              isDisabled={isRegistering}
              placeholder={server.metadata?.name}
              aria-label="Server name in registry"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  The name this server should have within the registry (defaults to current server
                  name)
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {selectedRegistryObj && serverNameInRegistry && (
            <Alert
              variant={AlertVariant.info}
              title="Labels that will be added"
              className="pf-v6-u-mt-md"
              isInline
            >
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                      toolhive.stacklok.io/registry-name
                    </code>
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {selectedRegistryObj.metadata?.name}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                      toolhive.stacklok.io/registry-namespace
                    </code>
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {selectedRegistryObj.metadata?.namespace}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    <code className="pf-v6-u-font-family-monospace pf-v6-u-font-size-sm">
                      toolhive.stacklok.io/server-registry-name
                    </code>
                  </DescriptionListTerm>
                  <DescriptionListDescription>{serverNameInRegistry}</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleRegister}
          isDisabled={
            isRegistering ||
            !selectedRegistry ||
            !serverNameInRegistry.trim() ||
            registries.length === 0
          }
          isLoading={isRegistering}
        >
          Register
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isRegistering}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
