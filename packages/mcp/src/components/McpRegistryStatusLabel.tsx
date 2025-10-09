import * as React from 'react';
import { Label, Popover, Stack, StackItem } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { McpRegistryStatus } from '../types/registry';

interface McpRegistryStatusLabelProps {
  status?: McpRegistryStatus;
}

export const McpRegistryStatusLabel: React.FC<McpRegistryStatusLabelProps> = ({ status }) => {
  if (!status) {
    return (
      <Label icon={<PendingIcon />} status="info" isCompact>
        Unknown
      </Label>
    );
  }

  const { phase, message, conditions } = status;

  let statusLabel: string;
  let icon: React.ReactNode;
  let labelStatus: React.ComponentProps<typeof Label>['status'];
  const popoverMessages: string[] = [];
  let popoverTitle = '';

  switch (phase) {
    case 'Ready':
      statusLabel = 'Ready';
      icon = <CheckCircleIcon />;
      labelStatus = 'success';
      break;
    case 'Syncing':
      statusLabel = 'Syncing';
      icon = <InProgressIcon className="odh-u-spin" />;
      labelStatus = 'info';
      break;
    case 'Failed':
      statusLabel = 'Failed';
      icon = <ExclamationCircleIcon />;
      labelStatus = 'danger';
      popoverTitle = 'Registry sync failed';
      if (message) {
        popoverMessages.push(message);
      }
      // Add condition messages for failed conditions
      if (conditions) {
        popoverMessages.push(
          ...conditions
            .filter((condition) => condition.status === 'False' && condition.message)
            .map((condition) => condition.message || 'Unknown error'),
        );
      }
      break;
    case 'Pending':
    default:
      statusLabel = 'Pending';
      icon = <InProgressIcon className="odh-u-spin" />;
      labelStatus = 'info';
      break;
  }

  const isClickable = popoverTitle && popoverMessages.length > 0;

  const label = (
    <Label
      {...(isClickable
        ? {
            onClick: () => {
              /* intentional no-op - Click event is handled by the Popover parent,
              this prop enables clickable styles in the PatternFly Label */
            },
          }
        : {})}
      data-testid="mcp-registry-status-label"
      icon={icon}
      status={labelStatus}
      isCompact
    >
      {statusLabel}
    </Label>
  );

  return isClickable ? (
    <Popover
      headerContent={popoverTitle}
      alertSeverityVariant={labelStatus === 'danger' ? 'danger' : 'warning'}
      headerIcon={
        labelStatus === 'danger' ? <ExclamationCircleIcon /> : <ExclamationTriangleIcon />
      }
      bodyContent={
        <Stack hasGutter>
          {popoverMessages.map((msg, index) => (
            <StackItem key={`message-${index}`}>{msg}</StackItem>
          ))}
        </Stack>
      }
    >
      {label}
    </Popover>
  ) : (
    label
  );
};
