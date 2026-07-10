import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Audit, AuditExecutionReport, Evidence, ExportValidation } from '../../types/iso';

const BORDER = '#9ca3af';
const BORDER_LIGHT = '#d1d5db';
const INK = '#111827';
const MUTED = '#4b5563';
const HEADER = '#e5e7eb';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: INK,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.35,
    paddingTop: 28,
    paddingBottom: 34,
    paddingHorizontal: 28,
  },
  header: {
    borderBottom: `1 solid ${BORDER}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  headerContent: {
    flexGrow: 1,
    paddingRight: 14,
  },
  orgName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    marginBottom: 2,
  },
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  docSubtitle: {
    color: MUTED,
    fontSize: 9,
  },
  logo: {
    height: 32,
    width: 118,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    backgroundColor: HEADER,
    border: `1 solid ${BORDER}`,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  sectionBody: {
    borderBottom: `1 solid ${BORDER}`,
    borderLeft: `1 solid ${BORDER}`,
    borderRight: `1 solid ${BORDER}`,
    padding: 8,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metadataItem: {
    borderBottom: `1 solid ${BORDER_LIGHT}`,
    borderRight: `1 solid ${BORDER_LIGHT}`,
    minHeight: 36,
    paddingHorizontal: 6,
    paddingVertical: 5,
    width: '50%',
  },
  metadataItemFull: {
    width: '100%',
  },
  metadataLabel: {
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontSize: 9,
  },
  summaryTable: {
    borderLeft: `1 solid ${BORDER}`,
    borderTop: `1 solid ${BORDER}`,
    flexDirection: 'row',
  },
  summaryCell: {
    borderBottom: `1 solid ${BORDER}`,
    borderRight: `1 solid ${BORDER}`,
    paddingHorizontal: 6,
    paddingVertical: 6,
    width: '25%',
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  table: {
    borderLeft: `1 solid ${BORDER}`,
    borderTop: `1 solid ${BORDER}`,
  },
  tableHeaderRow: {
    backgroundColor: HEADER,
    flexDirection: 'row',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    borderBottom: `1 solid ${BORDER_LIGHT}`,
    borderRight: `1 solid ${BORDER_LIGHT}`,
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  headerCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  textStrong: {
    fontFamily: 'Helvetica-Bold',
  },
  paragraph: {
    fontSize: 9,
    marginBottom: 6,
    textAlign: 'justify',
  },
  findingBlock: {
    borderBottom: `1 solid ${BORDER_LIGHT}`,
    paddingBottom: 10,
    paddingTop: 2,
  },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  findingTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    maxWidth: '78%',
  },
  badge: {
    border: `1 solid ${BORDER}`,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  subheading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginBottom: 4,
    marginTop: 6,
  },
  listLine: {
    fontSize: 9,
    marginBottom: 3,
  },
  mutedText: {
    color: MUTED,
    fontSize: 8,
  },
  smallTableCell: {
    borderBottom: `1 solid ${BORDER_LIGHT}`,
    borderRight: `1 solid ${BORDER_LIGHT}`,
    fontSize: 8.5,
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  footer: {
    borderTop: `1 solid ${BORDER_LIGHT}`,
    color: MUTED,
    fontSize: 8,
    left: 28,
    paddingTop: 6,
    position: 'absolute',
    right: 28,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const getLogoUrl = () => `${window.location.origin}/servasmar-iso-mark.svg`;

const PdfFooter: React.FC<{ validation: ExportValidation }> = ({ validation }) => (
  <View fixed style={styles.footer}>
    <Text>{`Codigo: ${validation.exportId}`}</Text>
    <Text
      render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
    />
  </View>
);

const PdfHeader: React.FC<{
  title: string;
  subtitle: string;
}> = ({ title, subtitle }) => (
  <View style={styles.header}>
    <View style={styles.headerContent}>
      <Text style={styles.orgName}>Servasmar</Text>
      <Text style={styles.docTitle}>{title}</Text>
      <Text style={styles.docSubtitle}>{subtitle}</Text>
    </View>
    <Image src={getLogoUrl()} style={styles.logo} />
  </View>
);

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const ValidationSection: React.FC<{ validation: ExportValidation }> = ({ validation }) => (
  <Section title="Validacion del documento">
    <View style={styles.metadataGrid}>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>ID de exportacion</Text>
        <Text style={styles.metadataValue}>{validation.exportId}</Text>
      </View>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>Fuente</Text>
        <Text style={styles.metadataValue}>{`${validation.sourceType} · ${validation.sourceId}`}</Text>
      </View>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>Usuario</Text>
        <Text style={styles.metadataValue}>{validation.generatedBy.name}</Text>
        <Text style={styles.mutedText}>{`${validation.generatedBy.email} · ${validation.generatedBy.role}`}</Text>
      </View>
      <View style={styles.metadataItem}>
        <Text style={styles.metadataLabel}>Fecha y hora</Text>
        <Text style={styles.metadataValue}>
          {new Date(validation.generatedAtIso).toLocaleString('es-CL')}
        </Text>
      </View>
      <View style={[styles.metadataItem, styles.metadataItemFull]}>
        <Text style={styles.metadataLabel}>Checksum</Text>
        <Text style={styles.metadataValue}>{validation.checksum}</Text>
      </View>
    </View>
  </Section>
);

const SummarySection: React.FC<{
  rows: Array<{ label: string; value: string }>;
}> = ({ rows }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Resumen ejecutivo</Text>
    <View style={styles.summaryTable}>
      {rows.map((row) => (
        <View key={row.label} style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>{row.label}</Text>
          <Text style={styles.summaryValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  </View>
);

export const AuditExecutionPdfDocument: React.FC<{
  audit: Audit;
  report: AuditExecutionReport;
  validation: ExportValidation;
}> = ({ audit, report, validation }) => {
  const totalFindings = audit.findings.length;
  const totalEvidences = report.evidences.length;
  const completedEvidences = report.evidences.filter((item) => item.status === 'approved').length;
  const averageCompliance =
    totalEvidences > 0
      ? Math.round(
          report.evidences.reduce((total, item) => total + (item.completionPercentage ?? 0), 0) /
            totalEvidences
        )
      : 0;

  return (
    <Document
      author="ISO Manager"
      creator="ISO Manager"
      producer="ISO Manager"
      subject={`Informe de auditoria ${audit.standard}`}
      title={`Informe de auditoria ${audit.standard}`}
    >
      <Page size="LETTER" style={styles.page} wrap>
        <PdfHeader
          title={`Informe de auditoria ${audit.type === 'internal' ? 'interna' : 'externa'}`}
          subtitle={`Norma: ${audit.standard} | Fecha: ${audit.date.toLocaleDateString('es-CL')} | Estado: ${audit.status}`}
        />
        <PdfFooter validation={validation} />

        <ValidationSection validation={validation} />

        <SummarySection
          rows={[
            { label: 'Hallazgos', value: String(totalFindings) },
            { label: 'Tareas', value: String(report.tasks.length) },
            { label: 'Evidencias', value: String(totalEvidences) },
            { label: 'Cumplimiento medio', value: `${averageCompliance}%` },
          ]}
        />

        <Section title="Datos generales de la auditoria">
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Tipo</Text>
              <Text style={styles.metadataValue}>
                {audit.type === 'internal' ? 'Interna' : 'Externa'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Estado</Text>
              <Text style={styles.metadataValue}>{audit.status}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Norma</Text>
              <Text style={styles.metadataValue}>{audit.standard}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Fecha</Text>
              <Text style={styles.metadataValue}>{audit.date.toLocaleDateString('es-CL')}</Text>
            </View>
          </View>
        </Section>

        <Section title="Hallazgos y seguimiento">
          {audit.findings.length > 0 ? (
            audit.findings.map((finding) => {
              const findingTasks = report.tasks.filter((task) =>
                task.relatedFindingIds?.includes(finding.id)
              );
              const findingEvidences = report.evidences.filter(
                (evidence) => evidence.findingId === finding.id
              );

              return (
                <View key={finding.id} style={styles.findingBlock} wrap={false}>
                  <View style={styles.findingHeader}>
                    <Text style={styles.findingTitle}>{finding.description}</Text>
                    <Text style={styles.badge}>{finding.status}</Text>
                  </View>
                  <Text style={styles.paragraph}>
                    <Text style={styles.textStrong}>Tipo: </Text>
                    {finding.type}
                    <Text style={styles.textStrong}> | Responsable: </Text>
                    {finding.assignedTo}
                    <Text style={styles.textStrong}> | Fecha compromiso: </Text>
                    {finding.dueDate.toLocaleDateString('es-CL')}
                  </Text>

                  <Text style={styles.subheading}>Tareas asociadas</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '48%' }]}>Tarea</Text>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '24%' }]}>Estado</Text>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '28%' }]}>Responsable</Text>
                    </View>
                    {findingTasks.length > 0 ? (
                      findingTasks.map((task) => (
                        <View key={task.id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { width: '48%' }]}>{task.title}</Text>
                          <Text style={[styles.tableCell, { width: '24%' }]}>{task.status}</Text>
                          <Text style={[styles.tableCell, { width: '28%' }]}>{task.assignedTo}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '100%' }]}>Sin tareas asociadas.</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.subheading}>Evidencias de cumplimiento</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '34%' }]}>Evidencia</Text>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '18%' }]}>Estado</Text>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '16%' }]}>Avance</Text>
                      <Text style={[styles.tableCell, styles.headerCell, { width: '32%' }]}>Detalle</Text>
                    </View>
                    {findingEvidences.length > 0 ? (
                      findingEvidences.map((evidence) => (
                        <View key={evidence.id} style={styles.tableRow}>
                          <Text style={[styles.smallTableCell, { width: '34%' }]}>{evidence.title}</Text>
                          <Text style={[styles.smallTableCell, { width: '18%' }]}>{evidence.status}</Text>
                          <Text style={[styles.smallTableCell, { width: '16%' }]}>{`${evidence.completionPercentage ?? 0}%`}</Text>
                          <Text style={[styles.smallTableCell, { width: '32%' }]}>
                            {evidence.fulfillmentSummary || evidence.notes || 'Sin detalle registrado.'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '100%' }]}>Sin evidencias registradas.</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.paragraph}>Sin hallazgos registrados.</Text>
          )}
        </Section>

        <Section title="Conclusiones">
          <Text style={styles.paragraph}>
            {`Evidencias aprobadas: ${completedEvidences} de ${totalEvidences}.`}
          </Text>
          <Text style={styles.paragraph}>
            {`El porcentaje promedio de cumplimiento observado en esta auditoria es de ${averageCompliance}%.`}
          </Text>
        </Section>
      </Page>
    </Document>
  );
};

export const EvidenceFulfillmentPdfDocument: React.FC<{
  evidence: Evidence;
  auditLabel: string;
  findingLabel: string;
  validation: ExportValidation;
}> = ({ evidence, auditLabel, findingLabel, validation }) => (
  <Document
    author="ISO Manager"
    creator="ISO Manager"
    producer="ISO Manager"
    subject={`Cumplimiento de evidencia ${evidence.title}`}
    title={`Cumplimiento de evidencia ${evidence.title}`}
  >
    <Page size="LETTER" style={styles.page} wrap>
      <PdfHeader
        title="Ficha de cumplimiento de evidencia"
        subtitle={`${auditLabel} | ${findingLabel}`}
      />
      <PdfFooter validation={validation} />

      <ValidationSection validation={validation} />

      <Section title="Identificacion de la evidencia">
        <View style={styles.metadataGrid}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Titulo</Text>
            <Text style={styles.metadataValue}>{evidence.title}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Estado</Text>
            <Text style={styles.metadataValue}>{evidence.status}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Responsable</Text>
            <Text style={styles.metadataValue}>{evidence.owner}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Requisito</Text>
            <Text style={styles.metadataValue}>{evidence.requirementId}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Cumplimiento</Text>
            <Text style={styles.metadataValue}>{`${evidence.completionPercentage ?? 0}%`}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Auditoria asociada</Text>
            <Text style={styles.metadataValue}>{auditLabel}</Text>
          </View>
        </View>
      </Section>

      <Section title="Resumen de cumplimiento">
        <Text style={styles.paragraph}>
          {evidence.fulfillmentSummary || 'Sin resumen de cumplimiento registrado.'}
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.textStrong}>Notas: </Text>
          {evidence.notes || 'Sin notas registradas.'}
        </Text>
      </Section>

      <Section title="Historial de actividades">
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCell, styles.headerCell, { width: '18%' }]}>Fecha</Text>
            <Text style={[styles.tableCell, styles.headerCell, { width: '18%' }]}>Accion</Text>
            <Text style={[styles.tableCell, styles.headerCell, { width: '20%' }]}>Autor</Text>
            <Text style={[styles.tableCell, styles.headerCell, { width: '14%' }]}>Estado</Text>
            <Text style={[styles.tableCell, styles.headerCell, { width: '30%' }]}>Detalle</Text>
          </View>
          {(evidence.activityLog ?? []).length > 0 ? (
            [...(evidence.activityLog ?? [])].reverse().map((entry) => (
              <View key={entry.id} style={styles.tableRow}>
                <Text style={[styles.smallTableCell, { width: '18%' }]}>
                  {entry.date.toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.smallTableCell, { width: '18%' }]}>{entry.action}</Text>
                <Text style={[styles.smallTableCell, { width: '20%' }]}>{entry.author}</Text>
                <Text style={[styles.smallTableCell, { width: '14%' }]}>{entry.status}</Text>
                <Text style={[styles.smallTableCell, { width: '30%' }]}>{entry.details}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%' }]}>Sin actividades registradas.</Text>
            </View>
          )}
        </View>
      </Section>
    </Page>
  </Document>
);
