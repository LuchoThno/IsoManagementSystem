import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type { ClerkSessionIdentity } from './clerk.types';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { ensureIntegerInRange } from './request-validation';
import { WorkflowsService } from './workflows.service';

@Controller('iso/workflows')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('rules')
  @Roles('admin', 'manager')
  listRules() {
    return this.workflowsService.listRules();
  }

  @Get('executions')
  @Roles('admin', 'manager')
  listExecutions(@Query('limit') limit?: string) {
    const parsedLimit = limit === undefined ? 25 : Number(limit);
    ensureIntegerInRange(parsedLimit, 'limit', { min: 1, max: 100 });
    return this.workflowsService.listExecutions(parsedLimit);
  }

  @Post('run-upcoming-audits')
  @Roles('admin', 'manager')
  runUpcomingAudits(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    return this.workflowsService.runUpcomingAudits(clerkAuth);
  }
}
