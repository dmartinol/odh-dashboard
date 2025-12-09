import * as React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Flex,
  FlexItem,
  Title,
  Alert,
  AlertVariant,
  Spinner,
  Stack,
  StackItem,
  Label,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { McpServerMetadata } from '../types';

interface McpServerUnregisterModalProps {
  onClose: () => void;
  server: McpServerMetadata;
  onUnregister: () => Promise<void>;
}

export const McpServerUnregisterModal: React.FC<McpServerUnregisterModalProps> = ({
  onClose,
  server,
  onUnregister,
}) => {
  const [isUnregistering, setIsUnregistering] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    setError(null);
    setIsUnregistering(false);
  }, [server]);

  const handleUnregister = async () => {
    setIsUnregistering(true);
    setError(null);

    try {
      await onUnregister();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unregister server');
    } finally {
      setIsUnregistering(false);
    }
  };

  const handleCancel = () => {
    if (!isUnregistering) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen
      onClose={handleCancel}
      variant="medium"
      title={`Unregister Server: ${server.displayName || server.name}`}
      aria-labelledby="unregister-server-modal-title"
    >
      <ModalHeader>
        <Title headingLevel="h2" size="xl" id="unregister-server-modal-title">
          Unregister Server: {server.displayName || server.name}
        </Title>
      </ModalHeader>
      <ModalBody>
        <Stack hasGutter>
          {/* Warning Alert */}
          <StackItem>
            <Alert
              variant={AlertVariant.warning}
              isInline
              customIcon={<ExclamationTriangleIcon />}
              title="This action cannot be undone"
            >
              This action will permanently remove all versions of this server from the registry. The
              server will no longer be available in this registry.
            </Alert>
          </StackItem>

          {/* Server Information */}
          <StackItem>
            <Alert variant={AlertVariant.info} isInline title="Server Information">
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                {server.description && (
                  <FlexItem>
                    <strong>Description:</strong> {server.description}
                  </FlexItem>
                )}
                <FlexItem>
                  <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                    {server.version && (
                      <FlexItem>
                        <Label color="grey" isCompact>
                          Version: {server.version}
                        </Label>
                      </FlexItem>
                    )}
                    {server.tier && (
                      <FlexItem>
                        <Label
                          color={
                            server.tier === 'official'
                              ? 'green'
                              : server.tier === 'community'
                              ? 'blue'
                              : 'orange'
                          }
                          isCompact
                        >
                          {server.tier}
                        </Label>
                      </FlexItem>
                    )}
                    {server.transport && (
                      <FlexItem>
                        <Label color="blue" isCompact>
                          {server.transport}
                        </Label>
                      </FlexItem>
                    )}
                  </Flex>
                </FlexItem>
              </Flex>
            </Alert>
          </StackItem>

          {/* Error Message */}
          {error && (
            <StackItem>
              <Alert variant={AlertVariant.danger} isInline title="Error">
                {error}
              </Alert>
            </StackItem>
          )}

          {/* Loading State */}
          {isUnregistering && (
            <StackItem>
              <Flex justifyContent={{ default: 'justifyContentCenter' }}>
                <FlexItem>
                  <Spinner size="md" />
                </FlexItem>
                <FlexItem>
                  <span>Unregistering server...</span>
                </FlexItem>
              </Flex>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="link" onClick={handleCancel} isDisabled={isUnregistering}>
          Cancel
        </Button>
        <Button
          key="unregister"
          variant="danger"
          onClick={handleUnregister}
          isDisabled={isUnregistering}
          icon={isUnregistering ? <Spinner size="sm" /> : undefined}
        >
          Unregister
        </Button>
      </ModalFooter>
    </Modal>
  );
};
