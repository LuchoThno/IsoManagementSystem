import { Controller, Get, UseGuards } from '@nestjs/common';
import { BootstrapDomainService } from './bootstrap-domain.service';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { RolesGuard } from './roles.guard';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class BootstrapController {
  constructor(private readonly bootstrapDomainService: BootstrapDomainService) {}

  @Get('bootstrap')
  getBootstrap() {
    return this.bootstrapDomainService.getBootstrap();
  }

  @Get('bootstrap-shell')
  getBootstrapShell() {
    return this.bootstrapDomainService.getBootstrapShell();
  }
}
