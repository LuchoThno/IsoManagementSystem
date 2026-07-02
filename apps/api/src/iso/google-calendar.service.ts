import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { google, type calendar_v3 } from 'googleapis';
import { Model } from 'mongoose';
import { Audit } from './schemas/audit.schema';
import { TaskEntity } from './schemas/task.schema';

type SyncableTask = {
  _id: unknown;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  standard: string;
};

type SyncableAudit = {
  _id: unknown;
  type: 'internal' | 'external';
  standard: string;
  date: Date;
  status: 'planned' | 'in-progress' | 'completed';
  findings: Array<{
    id: string;
    type: 'nonconformity' | 'observation' | 'opportunity';
    description: string;
    status: 'open' | 'in-progress' | 'closed';
    dueDate: Date;
    assignedTo: string;
  }>;
};

type GoogleCalendarStatus = {
  enabled: boolean;
  configured: boolean;
  calendarId: string | null;
  missing: string[];
};

type GoogleCalendarSyncResult = GoogleCalendarStatus & {
  created: number;
  updated: number;
  processed: number;
};

@Injectable()
export class GoogleCalendarService {
  constructor(
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>
  ) {}

  getStatus(): GoogleCalendarStatus {
    const credentials = this.getCredentials();
    const required = {
      GOOGLE_CALENDAR_CLIENT_ID: credentials.clientId,
      GOOGLE_CALENDAR_CLIENT_SECRET: credentials.clientSecret,
      GOOGLE_CALENDAR_REFRESH_TOKEN: credentials.refreshToken,
      GOOGLE_CALENDAR_ID: credentials.calendarId,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value || !value.trim())
      .map(([key]) => key);

    return {
      enabled: true,
      configured: missing.length === 0,
      calendarId: credentials.calendarId || null,
      missing,
    };
  }

  async syncEvents(): Promise<GoogleCalendarSyncResult> {
    const status = this.getStatus();

    if (!status.configured) {
      throw new ServiceUnavailableException(
        `Google Calendar no está configurado. Faltan: ${status.missing.join(', ')}`
      );
    }

    const calendar = this.createCalendarClient();
    const [tasks, audits] = await Promise.all([
      this.taskModel.find().sort({ dueDate: 1 }).lean<SyncableTask[]>(),
      this.auditModel.find().sort({ date: 1 }).lean<SyncableAudit[]>(),
    ]);

    let created = 0;
    let updated = 0;

    for (const task of tasks) {
      const result = await this.upsertEvent(
        calendar,
        'task',
        String(task._id),
        this.buildTaskEvent(task)
      );
      created += result === 'created' ? 1 : 0;
      updated += result === 'updated' ? 1 : 0;
    }

    for (const audit of audits) {
      const result = await this.upsertEvent(
        calendar,
        'audit',
        String(audit._id),
        this.buildAuditEvent(audit)
      );
      created += result === 'created' ? 1 : 0;
      updated += result === 'updated' ? 1 : 0;
    }

    return {
      ...status,
      created,
      updated,
      processed: tasks.length + audits.length,
    };
  }

  private createCalendarClient() {
    const credentials = this.getCredentials();
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret
    );

    auth.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    return google.calendar({
      version: 'v3',
      auth,
    });
  }

  private async upsertEvent(
    calendar: calendar_v3.Calendar,
    sourceType: 'task' | 'audit',
    sourceId: string,
    event: calendar_v3.Schema$Event
  ) {
    const calendarId = this.getCredentials().calendarId!;
    const existing = await calendar.events.list({
      calendarId,
      maxResults: 1,
      singleEvents: true,
      privateExtendedProperty: [
        `isoSourceType=${sourceType}`,
        `isoSourceId=${sourceId}`,
      ],
    });

    const existingEventId = existing.data.items?.[0]?.id;
    if (existingEventId) {
      await calendar.events.update({
        calendarId,
        eventId: existingEventId,
        requestBody: event,
      });
      return 'updated';
    }

    await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    return 'created';
  }

  private buildTaskEvent(task: SyncableTask): calendar_v3.Schema$Event {
    const date = this.toCalendarDate(task.dueDate);

    return {
      summary: `[${task.standard}] ${task.title}`,
      description: [
        'Tipo: Tarea',
        `Responsable: ${task.assignedTo}`,
        `Estado: ${task.status}`,
        `Prioridad: ${task.priority}`,
        '',
        task.description,
      ].join('\n'),
      start: { date },
      end: { date: this.addOneDay(date) },
      colorId: this.getTaskColor(task.status),
      extendedProperties: {
        private: {
          isoSourceType: 'task',
          isoSourceId: String(task._id),
        },
      },
    };
  }

  private buildAuditEvent(audit: SyncableAudit): calendar_v3.Schema$Event {
    const date = this.toCalendarDate(audit.date);

    return {
      summary: `[${audit.standard}] Auditoría ${audit.type === 'internal' ? 'interna' : 'externa'}`,
      description: [
        'Tipo: Auditoría',
        `Estado: ${audit.status}`,
        `Hallazgos: ${audit.findings.length}`,
        '',
        ...audit.findings.slice(0, 5).map((finding) => {
          return `- ${finding.type}: ${finding.description} (${finding.status})`;
        }),
      ].join('\n'),
      start: { date },
      end: { date: this.addOneDay(date) },
      colorId: this.getAuditColor(audit.status),
      extendedProperties: {
        private: {
          isoSourceType: 'audit',
          isoSourceId: String(audit._id),
        },
      },
    };
  }

  private toCalendarDate(value: Date) {
    return new Date(value).toISOString().slice(0, 10);
  }

  private addOneDay(date: string) {
    const nextDate = new Date(`${date}T00:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    return nextDate.toISOString().slice(0, 10);
  }

  private getTaskColor(status: SyncableTask['status']) {
    switch (status) {
      case 'completed':
        return '2';
      case 'overdue':
        return '11';
      case 'in-progress':
        return '5';
      default:
        return '6';
    }
  }

  private getAuditColor(status: SyncableAudit['status']) {
    switch (status) {
      case 'completed':
        return '10';
      case 'in-progress':
        return '9';
      default:
        return '7';
    }
  }

  private getCredentials() {
    const read = (...keys: string[]) => {
      for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) {
          return value;
        }
      }

      return '';
    };

    return {
      clientId: read('GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CLIENT_ID'),
      clientSecret: read('GOOGLE_CALENDAR_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'),
      refreshToken: read('GOOGLE_CALENDAR_REFRESH_TOKEN', 'GOOGLE_REFRESH_TOKEN'),
      calendarId: read('GOOGLE_CALENDAR_ID'),
    };
  }
}
