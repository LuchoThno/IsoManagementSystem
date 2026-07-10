import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClerkDirectoryService } from './clerk-directory.service';
import type { ClerkSessionIdentity } from './clerk.types';
import { PlatformAuditLogEntity } from './schemas/platform-audit-log.schema';

type AuditStatus = 'success' | 'failure';

type AuditActor = {
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
};

type AuditEntryInput = AuditActor & {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: AuditStatus;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
};

@Injectable()
export class PlatformAuditService {
  constructor(
    @InjectModel(PlatformAuditLogEntity.name)
    private readonly platformAuditLogModel: Model<PlatformAuditLogEntity>,
    private readonly clerkDirectoryService: ClerkDirectoryService
  ) {}

  async capture(entry: AuditEntryInput) {
    const created = await this.platformAuditLogModel.create({
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      actorRole: entry.actorRole ?? null,
      status: entry.status,
      metadata: entry.metadata ?? {},
      errorMessage: entry.errorMessage ?? null,
    });

    return this.serialize(created.toObject());
  }

  async captureFromSession(
    clerkAuth: ClerkSessionIdentity | null,
    entry: Omit<AuditEntryInput, keyof AuditActor>
  ) {
    const actor = await this.resolveActor(clerkAuth);
    return this.capture({
      ...entry,
      ...actor,
    });
  }

  async getActorLabel(clerkAuth: ClerkSessionIdentity | null) {
    const actor = await this.resolveActor(clerkAuth);
    return actor.actorName ?? actor.actorEmail ?? actor.actorId ?? 'Sistema ISO';
  }

  async getActorDetails(clerkAuth: ClerkSessionIdentity | null) {
    return this.resolveActor(clerkAuth);
  }

  async listRecent(limit = 50) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;
    const logs = await this.platformAuditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    return logs.map((log) => this.serialize(log));
  }

  private async resolveActor(clerkAuth: ClerkSessionIdentity | null): Promise<AuditActor> {
    if (!clerkAuth?.userId) {
      return {
        actorId: clerkAuth?.appUserId ?? null,
        actorEmail: null,
        actorRole: null,
      };
    }

    try {
      const currentUser = await this.clerkDirectoryService.getCurrentUser(clerkAuth.userId);
      return {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
      };
    } catch {
      return {
        actorId: clerkAuth.appUserId,
        actorName: null,
        actorEmail: null,
        actorRole: null,
      };
    }
  }

  private serialize(log: any) {
    return {
      id: String(log._id),
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId ?? null,
      actorId: log.actorId ?? null,
      actorEmail: log.actorEmail ?? null,
      actorRole: log.actorRole ?? null,
      status: log.status,
      metadata: log.metadata ?? {},
      errorMessage: log.errorMessage ?? null,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }
}
