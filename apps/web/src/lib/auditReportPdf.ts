import React from 'react';
import type { Audit, AuditExecutionReport, Evidence, ExportValidation } from '../types/iso';
import { executePdfDocumentPipeline } from './pdf/pdfDocumentPipeline';
import {
  AuditExecutionPdfDocument,
  EvidenceFulfillmentPdfDocument,
} from './pdf/isoPdfDocuments';

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export async function exportAuditExecutionPdf(
  audit: Audit,
  report: AuditExecutionReport,
  validation: ExportValidation
) {
  await executePdfDocumentPipeline({
    document: <AuditExecutionPdfDocument audit={audit} report={report} validation={validation} />,
    fileName: `${sanitizeFileName(`auditoria-${audit.standard}-${validation.exportId}`)}.pdf`,
    title: `Informe de auditoria ${audit.standard}`,
    subject: `Auditoria ${audit.type} ${audit.standard}`,
    keywords: ['iso-manager', 'auditoria', audit.standard, validation.exportId],
    sourceType: 'audit',
    sourceId: audit.id,
    generatedByName: validation.generatedBy.name,
    generatedByEmail: validation.generatedBy.email,
  });
}

export async function exportEvidenceFulfillmentPdf(
  evidence: Evidence,
  auditLabel: string,
  findingLabel: string,
  validation: ExportValidation
) {
  await executePdfDocumentPipeline({
    document: <EvidenceFulfillmentPdfDocument
      evidence={evidence}
      auditLabel={auditLabel}
      findingLabel={findingLabel}
      validation={validation}
    />,
    fileName: `${sanitizeFileName(`evidencia-${evidence.title}-${validation.exportId}`)}.pdf`,
    title: `Cumplimiento de evidencia ${evidence.title}`,
    subject: `Evidencia ${evidence.requirementId}`,
    keywords: ['iso-manager', 'evidencia', evidence.requirementId, validation.exportId],
    sourceType: 'evidence',
    sourceId: evidence.id,
    generatedByName: validation.generatedBy.name,
    generatedByEmail: validation.generatedBy.email,
  });
}
