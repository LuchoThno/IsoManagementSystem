export type NotificationSettingsDto = {
  email: {
    enabled: boolean;
    taskReminders: boolean;
    auditReminders: boolean;
    documentUpdates: boolean;
  };
  inApp: {
    enabled: boolean;
    taskReminders: boolean;
    auditReminders: boolean;
    documentUpdates: boolean;
  };
  desktop: {
    enabled: boolean;
    chatMessages: boolean;
    connectionAlerts: boolean;
  };
};

export type GeneralSettingsDto = {
  companyName: string;
  standards: Record<string, boolean>;
  defaultLanguage: string;
  timezone: string;
};

export type UpdateSettingsDto = {
  settings: GeneralSettingsDto;
  notifications: NotificationSettingsDto;
};

export type SecurityPostureDto = {
  authMode: 'clerk' | 'demo' | 'disabled';
  authenticationAvailable: boolean;
  clerkConfigured: boolean;
  controls: {
    rbac: boolean;
    platformAudit: boolean;
  };
  policies: {
    mfa: {
      managedBy: 'clerk' | 'application' | 'none';
      required: boolean;
      status: 'enforced' | 'delegated' | 'not-applicable';
    };
    password: {
      managedBy: 'clerk' | 'application' | 'none';
      minLength: number | null;
      policy: string;
    };
    session: {
      managedBy: 'clerk' | 'application' | 'none';
      revocationModel: string;
    };
  };
};
