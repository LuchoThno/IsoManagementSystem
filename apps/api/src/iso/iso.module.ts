import { AuditsController } from './audits.controller';
import { AuditsDomainService } from './audits-domain.service';
import { AuditsOperationsService } from './audits-operations.service';
import { AuthController } from './auth.controller';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapDomainService } from './bootstrap-domain.service';
import { CollaborationDomainService } from './collaboration-domain.service';
import { CollaborationOperationsService } from './collaboration-operations.service';
import { CollaborationController } from './collaboration.controller';
import { CommunicationsDomainService } from './communications-domain.service';
import { CommunicationsOperationsService } from './communications-operations.service';
import { CommunicationsController } from './communications.controller';
import { DocumentsController } from './documents.controller';
import { DocumentsDomainService } from './documents-domain.service';
import { DocumentsOperationsService } from './documents-operations.service';
import { DemoSeedService } from './demo-seed.service';
import { GrcController } from './grc.controller';
import { GrcOperationalDomainService } from './grc-operational-domain.service';
import { GrcOperationsService } from './grc-operations.service';
import { GrcStandardsDomainService } from './grc-standards-domain.service';
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
import { SettingsDocumentService } from './settings-document.service';
import { SettingsOperationsService } from './settings-operations.service';
import { TaskEntity, TaskSchema } from './schemas/task.schema';
import { UsersController } from './users.controller';
import { UsersOperationsService } from './users-operations.service';
import { TasksOperationsService } from './tasks-operations.service';
import { TasksController } from './tasks.controller';
import { TasksDomainService } from './tasks-domain.service';
import { TenantEntity, TenantSchema } from './schemas/tenant.schema';
import { TenantContextService } from './tenant-context.service';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantsController } from './tenants.controller';
import { TenantsOperationsService } from './tenants-operations.service';

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
      { name: TenantEntity.name, schema: TenantSchema },
    ]),
  ],
  controllers: [
    AuthController,
    UsersController,
    TenantsController,
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
    GrcOperationalDomainService,
    GrcStandardsDomainService,
    GrcOperationsService,
    BootstrapDomainService,
    AuditsDomainService,
    AuditsOperationsService,
    CollaborationDomainService,
    CollaborationOperationsService,
    ChatGateway,
    GoogleCalendarService,
    EmailDeliveryService,
    AuthModeService,
    PlatformAuditService,
    DocumentsDomainService,
    TasksDomainService,
    CommunicationsDomainService,
    DocumentsOperationsService,
    CommunicationsOperationsService,
    ClerkAuthService,
    ClerkAuthGuard,
    ClerkDirectoryService,
    DemoSeedService,
    UsersOperationsService,
    SettingsDocumentService,
    SettingsOperationsService,
    TasksOperationsService,
    TenantContextService,
    TenantBackfillService,
    TenantsOperationsService,
    RolesGuard,
  ],
})
export class IsoModule {}
