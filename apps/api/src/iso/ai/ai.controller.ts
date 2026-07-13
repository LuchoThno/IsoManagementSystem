import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import {
  AnalyzeDocumentInputDto,
  AnalyzeDocumentResultDto,
  AssistChatThreadInputDto,
  AssistChatThreadResultDto,
  GenerateProcedureInputDto,
  GenerateProcedureResultDto,
  ProposeCorrectiveActionsInputDto,
  ProposeCorrectiveActionsResultDto,
  SummarizeAuditInputDto,
  SummarizeAuditResultDto,
} from '../dto/ai.dto';
import { ClerkAuth } from '../clerk-auth.decorator';
import { ClerkAuthGuard } from '../clerk-auth.guard';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import type { ClerkSessionIdentity } from '../clerk.types';
import { PlatformAuditService } from '../platform-audit.service';

@Controller('iso/ai')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Post('analyze-document')
  @Roles('admin', 'manager', 'auditor')
  async analyzeDocument(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() input: AnalyzeDocumentInputDto
  ): Promise<AnalyzeDocumentResultDto> {
    try {
      const result = await this.aiService.analyzeDocument(input);
      await this.platformAuditService.captureFromSession(clerkAuth, {
        action: 'ai.analyze_document',
        resourceType: 'ai-execution',
        resourceId: result.id,
        status: 'success',
        metadata: {
          model: result.model,
          tenantId: result.tenantId,
          documentId: result.documentId,
        },
      });
      return result;
    } catch (error) {
      await this.captureAiFailure(clerkAuth, 'ai.analyze_document', {
        documentId: input.documentId,
      }, error);
      throw error;
    }
  }

  @Post('generate-procedure')
  @Roles('admin', 'manager', 'auditor')
  async generateProcedure(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() input: GenerateProcedureInputDto
  ): Promise<GenerateProcedureResultDto> {
    try {
      const result = await this.aiService.generateProcedure(input);
      await this.platformAuditService.captureFromSession(clerkAuth, {
        action: 'ai.generate_procedure',
        resourceType: 'ai-execution',
        resourceId: result.id,
        status: 'success',
        metadata: {
          model: result.model,
          tenantId: result.tenantId,
          topic: result.topic,
        },
      });
      return result;
    } catch (error) {
      await this.captureAiFailure(clerkAuth, 'ai.generate_procedure', {
        documentId: input.documentId ?? null,
        topic: input.topic,
      }, error);
      throw error;
    }
  }

  @Post('summarize-audit')
  @Roles('admin', 'manager', 'auditor')
  async summarizeAudit(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() input: SummarizeAuditInputDto
  ): Promise<SummarizeAuditResultDto> {
    try {
      const result = await this.aiService.summarizeAudit(input);
      await this.platformAuditService.captureFromSession(clerkAuth, {
        action: 'ai.summarize_audit',
        resourceType: 'ai-execution',
        resourceId: result.id,
        status: 'success',
        metadata: {
          model: result.model,
          tenantId: result.tenantId,
          auditId: result.auditId,
        },
      });
      return result;
    } catch (error) {
      await this.captureAiFailure(clerkAuth, 'ai.summarize_audit', {
        auditId: input.auditId,
      }, error);
      throw error;
    }
  }

  @Post('propose-corrective-actions')
  @Roles('admin', 'manager')
  async proposeCorrectiveActions(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() input: ProposeCorrectiveActionsInputDto
  ): Promise<ProposeCorrectiveActionsResultDto> {
    try {
      const result = await this.aiService.proposeCorrectiveActions(input);
      await this.platformAuditService.captureFromSession(clerkAuth, {
        action: 'ai.propose_corrective_actions',
        resourceType: 'ai-execution',
        resourceId: result.id,
        status: 'success',
        metadata: {
          model: result.model,
          tenantId: result.tenantId,
          auditId: input.auditId ?? null,
        },
      });
      return result;
    } catch (error) {
      await this.captureAiFailure(clerkAuth, 'ai.propose_corrective_actions', {
        auditId: input.auditId ?? null,
      }, error);
      throw error;
    }
  }

  @Post('chat-assist')
  @Roles('admin', 'manager', 'auditor')
  async assistChatThread(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() input: AssistChatThreadInputDto
  ): Promise<AssistChatThreadResultDto> {
    try {
      const result = await this.aiService.assistChatThread(input);
      await this.platformAuditService.captureFromSession(clerkAuth, {
        action: 'ai.chat_assist',
        resourceType: 'ai-execution',
        resourceId: result.id,
        status: 'success',
        metadata: {
          model: result.model,
          tenantId: result.tenantId,
          threadId: result.threadId,
        },
      });
      return result;
    } catch (error) {
      await this.captureAiFailure(
        clerkAuth,
        'ai.chat_assist',
        { threadId: input.threadId },
        error
      );
      throw error;
    }
  }

  private async captureAiFailure(
    clerkAuth: ClerkSessionIdentity | null,
    action: string,
    metadata: Record<string, unknown>,
    error: unknown
  ) {
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action,
      resourceType: 'ai-execution',
      status: 'failure',
      errorMessage:
        error instanceof Error ? error.message : 'La ejecución stub de IA falló.',
      metadata: {
        ...metadata,
        outcome:
          error instanceof NotFoundException ? 'resource_not_found_for_tenant' : 'unexpected_error',
      },
    });
  }
}
