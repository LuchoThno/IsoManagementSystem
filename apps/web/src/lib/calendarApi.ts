import { requestIsoApi } from './isoApiClient';

export type CalendarSyncStatus = {
  enabled: boolean;
  configured: boolean;
  calendarId: string | null;
  missing: string[];
};

export type CalendarSyncResult = CalendarSyncStatus & {
  created: number;
  updated: number;
  processed: number;
};

export const getCalendarSyncStatus = () => requestIsoApi<CalendarSyncStatus>('/calendar/status');

export const syncGoogleCalendar = () =>
  requestIsoApi<CalendarSyncResult>('/calendar/sync', { method: 'POST' });
