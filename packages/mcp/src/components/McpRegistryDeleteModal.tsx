import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { McpRegistry } from '../types/registry';

interface McpRegistryDeleteModalProps {
  registry: McpRegistry | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const McpRegistryDeleteModal: React.FC<McpRegistryDeleteModalProps> = ({
  registry,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const registryName = registry?.metadata?.name || 'Unknown Registry';
  const serverCount = registry?.status?.serverCount || 0;

  return (
    <Modal isOpen onClose={onClose} variant="small" data-testid="delete-mcp-registry-modal">
      <ModalHeader title="Delete MCP registry?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            Are you sure you want to delete the registry <strong>{registryName}</strong>?
          </StackItem>

          {serverCount > 0 && (
            <StackItem>
              <div className="pf-u-color-200">
                This registry contains {serverCount} {serverCount === 1 ? 'server' : 'servers'}.
                Deleting this registry will remove access to these servers from the registry
                catalog.
              </div>
            </StackItem>
          )}

          <StackItem>
            <div className="pf-u-color-200">
              <strong>Note:</strong> This action cannot be undone. Any deployed MCP server instances
              will continue running, but the registry configuration will be permanently removed.
            </div>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="delete"
          variant="danger"
          onClick={onConfirm}
          isDisabled={isDeleting}
          isLoading={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete registry'}
        </Button>
        <Button key="cancel" variant="link" onClick={onClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
