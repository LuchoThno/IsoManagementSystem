import { Injectable } from '@nestjs/common';
import type { StandardPayload } from './dto/grc.dto';
import { GrcStandardsDomainService } from './grc-standards-domain.service';

@Injectable()
export class GrcService {
  constructor(private readonly grcStandardsDomainService: GrcStandardsDomainService) {}

  listStandards() {
    return this.grcStandardsDomainService.listStandards();
  }

  createStandard(payload: StandardPayload) {
    return this.grcStandardsDomainService.createStandard(payload);
  }

  updateStandard(standardId: string, payload: StandardPayload) {
    return this.grcStandardsDomainService.updateStandard(standardId, payload);
  }

  deleteStandard(standardId: string) {
    return this.grcStandardsDomainService.deleteStandard(standardId);
  }

  getStandardStructure(standardId: string) {
    return this.grcStandardsDomainService.getStandardStructure(standardId);
  }

  getAuditChecklist(auditId: string) {
    return this.grcStandardsDomainService.getAuditChecklist(auditId);
  }
}
