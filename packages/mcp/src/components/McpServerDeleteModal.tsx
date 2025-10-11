import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { McpServer } from '../types/server';

interface McpServerDeleteModalProps {
  onClose: () => void;
  server: McpServer;
  onDelete: () => Promise<void>;
}

export const McpServerDeleteModal: React.FC<McpServerDeleteModalProps> = ({
  onClose,
  server,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
      onClose();
    } catch (err) {
      console.error('Error deleting server:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete server');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <Modal onClose={handleClose} variant="small" aria-labelledby="delete-server-modal-title">
      <ModalHeader title="Delete Server?" titleIconVariant="warning" />
      <ModalBody>
        {error && (
          <Alert variant={AlertVariant.danger} title="Error" className="pf-v6-u-mb-md" isInline>
            {error}
          </Alert>
        )}

        <Alert
          variant={AlertVariant.warning}
          title="Warning"
          className="pf-v6-u-mb-md"
          isInline
          customIcon={<ExclamationTriangleIcon />}
        >
          This will delete the server deployment and all associated resources. This action cannot be
          undone.
        </Alert>

        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Server Name</DescriptionListTerm>
            <DescriptionListDescription>
              <strong>{server.metadata?.name}</strong>
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Namespace</DescriptionListTerm>
            <DescriptionListDescription>{server.metadata?.namespace}</DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label
                color={
                  server.status?.phase === 'Running'
                    ? 'green'
                    : server.status?.phase === 'Failed'
                    ? 'red'
                    : server.status?.phase === 'Pending'
                    ? 'blue'
                    : 'grey'
                }
                isCompact
              >
                {server.status?.phase || 'Unknown'}
              </Label>
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
        </DescriptionList>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleDelete}
          isDisabled={isDeleting}
          isLoading={isDeleting}
        >
          Delete Server
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
