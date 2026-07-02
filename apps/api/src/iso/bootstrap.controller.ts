import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { IsoService } from './iso.service';
import { RolesGuard } from './roles.guard';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class BootstrapController {
  constructor(private readonly isoService: IsoService) {}

  @Get('bootstrap')
  getBootstrap() {
    return this.isoService.getBootstrap();
  }

  @Get('bootstrap-shell')
  getBootstrapShell() {
    return this.isoService.getBootstrapShell();
  }
}
