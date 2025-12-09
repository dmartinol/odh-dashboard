import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  StackItem,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

interface McpDeploymentRestartModalProps {
  isOpen: boolean;
  deploymentName: string;
  namespace: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isRestarting?: boolean;
}

export const McpDeploymentRestartModal: React.FC<McpDeploymentRestartModalProps> = ({
  isOpen,
  deploymentName,
  namespace,
  onClose,
  onConfirm,
  isRestarting = false,
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error restarting deployment:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen onClose={onClose} variant="small" data-testid="restart-deployment-modal">
      <ModalHeader title="Restart Registry API Deployment?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert
              variant={AlertVariant.info}
              title="Deployment Restart Required"
              customIcon={<ExclamationTriangleIcon />}
              isInline
            >
              The registry API deployment needs to be restarted to apply the new registry
              configuration. This is a temporary workaround until API endpoints are added.
            </Alert>
          </StackItem>
          <StackItem>
            The deployment <strong>{deploymentName}</strong> in namespace{' '}
            <strong>{namespace}</strong> will be deleted. The operator will automatically recreate
            it, picking up the new registry configuration.
          </StackItem>
          <StackItem>
            <div className="pf-u-color-200">
              <strong>Note:</strong> This may cause a brief service interruption while the
              deployment is being recreated.
            </div>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="restart"
          variant="primary"
          onClick={handleConfirm}
          isDisabled={isRestarting}
          isLoading={isRestarting}
        >
          {isRestarting ? 'Restarting...' : 'Restart Deployment'}
        </Button>
        <Button key="cancel" variant="link" onClick={onClose} isDisabled={isRestarting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
