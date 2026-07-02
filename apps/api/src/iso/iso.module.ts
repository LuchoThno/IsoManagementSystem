import { AuditsController } from './audits.controller';
import { AuthController } from './auth.controller';
import { BootstrapController } from './bootstrap.controller';
import { CollaborationController } from './collaboration.controller';
import { CommunicationsController } from './communications.controller';
import { DocumentsController } from './documents.controller';
import { GrcController } from './grc.controller';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModeService } from './auth-mode.service';
import { GrcService } from './grc.service';
import { ChatGateway } from './chat.gateway';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkAuthService } from './clerk-auth.service';
import { ClerkDirectoryService } from './clerk-directory.service';
import { EmailDeliveryService } from './email-delivery.service';
import { GoogleCalendarService } from './google-calendar.service';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import { RolesGuard } from './roles.guard';
import { Audit, AuditSchema } from './schemas/audit.schema';
import { AuditChecklistEntity, AuditChecklistSchema } from './schemas/audit-checklist.schema';
import {
  AuditChecklistItemEntity,
  AuditChecklistItemSchema,
} from './schemas/audit-checklist-item.schema';
import { ChatThreadEntity, ChatThreadSchema } from './schemas/chat-thread.schema';
import { ContractDocumentEntity, ContractDocumentSchema } from './schemas/contract-document.schema';
import {
  ContractObligationEntity,
  ContractObligationSchema,
} from './schemas/contract-obligation.schema';
import { ContractEntity, ContractSchema } from './schemas/contract.schema';
import { CorrectiveActionEntity, CorrectiveActionSchema } from './schemas/corrective-action.schema';
import { DocumentEntity, DocumentSchema } from './schemas/document.schema';
import { EmailCampaignEntity, EmailCampaignSchema } from './schemas/email-campaign.schema';
import { EmailTemplateEntity, EmailTemplateSchema } from './schemas/email-template.schema';
import { EvidenceEntity, EvidenceSchema } from './schemas/evidence.schema';
import {
  PlatformAuditLogEntity,
  PlatformAuditLogSchema,
} from './schemas/platform-audit-log.schema';
import { SettingsEntity, SettingsSchema } from './schemas/settings.schema';
import { StandardAppendixEntity, StandardAppendixSchema } from './schemas/standard-appendix.schema';
import { StandardClauseEntity, StandardClauseSchema } from './schemas/standard-clause.schema';
import {
  StandardRequirementEntity,
  StandardRequirementSchema,
} from './schemas/standard-requirement.schema';
import { StandardSectionEntity, StandardSectionSchema } from './schemas/standard-section.schema';
import { StandardEntity, StandardSchema } from './schemas/standard.schema';
import { SettingsController } from './settings.controller';
import { TaskEntity, TaskSchema } from './schemas/task.schema';
import { UsersController } from './users.controller';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentSchema },
      { name: TaskEntity.name, schema: TaskSchema },
      { name: Audit.name, schema: AuditSchema },
      { name: ChatThreadEntity.name, schema: ChatThreadSchema },
      { name: EmailTemplateEntity.name, schema: EmailTemplateSchema },
      { name: EmailCampaignEntity.name, schema: EmailCampaignSchema },
      { name: PlatformAuditLogEntity.name, schema: PlatformAuditLogSchema },
      { name: SettingsEntity.name, schema: SettingsSchema },
      { name: StandardEntity.name, schema: StandardSchema },
      { name: StandardSectionEntity.name, schema: StandardSectionSchema },
      { name: StandardClauseEntity.name, schema: StandardClauseSchema },
      { name: StandardRequirementEntity.name, schema: StandardRequirementSchema },
      { name: StandardAppendixEntity.name, schema: StandardAppendixSchema },
      { name: EvidenceEntity.name, schema: EvidenceSchema },
      { name: ContractEntity.name, schema: ContractSchema },
      { name: ContractObligationEntity.name, schema: ContractObligationSchema },
      { name: ContractDocumentEntity.name, schema: ContractDocumentSchema },
      { name: AuditChecklistEntity.name, schema: AuditChecklistSchema },
      { name: AuditChecklistItemEntity.name, schema: AuditChecklistItemSchema },
      { name: CorrectiveActionEntity.name, schema: CorrectiveActionSchema },
    ]),
  ],
  controllers: [
    AuthController,
    UsersController,
    DocumentsController,
    AuditsController,
    TasksController,
    CommunicationsController,
    GrcController,
    CollaborationController,
    SettingsController,
    BootstrapController,
  ],
  providers: [
    IsoService,
    GrcService,
    ChatGateway,
    GoogleCalendarService,
    EmailDeliveryService,
    AuthModeService,
    PlatformAuditService,
    ClerkAuthService,
    ClerkAuthGuard,
    ClerkDirectoryService,
    RolesGuard,
  ],
})
export class IsoModule {}
