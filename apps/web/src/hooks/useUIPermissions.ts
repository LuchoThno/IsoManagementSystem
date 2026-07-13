import React from 'react';
import { useAccessContext } from './useAccessContext';
import { useAuthConfig } from './useAuthConfig';
import {
  canAccessUsersPanel,
  canManageAudits,
  canManageCommunicationSettings,
  canManageCommunicationTemplates,
  canManageDocuments,
  canManageTasks,
  canManageWorkflows,
  canSendCommunicationCampaigns,
  canViewCommunicationContent,
} from '../lib/accessContext';

export function useUIPermissions() {
  const { authConfig, loading: authConfigLoading, error: authConfigError } = useAuthConfig();
  const {
    accessContext,
    loading: accessContextLoading,
    error: accessContextError,
  } = useAccessContext();

  return React.useMemo(
    () => ({
      authConfig,
      accessContext,
      loading: authConfigLoading || accessContextLoading,
      authConfigLoading,
      accessContextLoading,
      error: authConfigError || accessContextError,
      canAccessUsersPanel: accessContext
        ? canAccessUsersPanel(accessContext)
        : Boolean(authConfig?.capabilities.manualUserManagement),
      canManageUsers: Boolean(
        accessContext
          ? accessContext.permissions.canManageUsers || authConfig?.capabilities.manualUserManagement
          : authConfig?.capabilities.manualUserManagement
      ),
      canManageCommunicationSettings: canManageCommunicationSettings(accessContext, authConfig),
      canManageCommunicationTemplates: canManageCommunicationTemplates(accessContext, authConfig),
      canSendCommunicationCampaigns: canSendCommunicationCampaigns(accessContext, authConfig),
      canViewCommunicationContent: canViewCommunicationContent(accessContext, authConfig),
      canManageDocuments: canManageDocuments(accessContext, authConfig),
      canManageTasks: canManageTasks(accessContext, authConfig),
      canManageAudits: canManageAudits(accessContext, authConfig),
      canManageWorkflows: canManageWorkflows(accessContext, authConfig),
    }),
    [
      accessContext,
      accessContextError,
      accessContextLoading,
      authConfig,
      authConfigError,
      authConfigLoading,
    ]
  );
}
