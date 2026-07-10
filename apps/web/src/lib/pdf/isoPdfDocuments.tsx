import React from 'react';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { Audit, AuditExecutionReport, Evidence, ExportValidation } from '../../types/iso';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f4f7fb',
    color: '#1f2937',
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    padding: 28,
  },
  header: {
    backgroundColor: '#313a46',
    borderRadius: 18,
    color: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    padding: 20,
  },
  headerContent: {
    flexGrow: 1,
    flexShrink: 1,
  },
  eyebrow: {
    color: '#dbe7f3',
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
  },
  subtitle: {
    color: '#e2e8f0',
    fontSize: 10,
    marginTop: 8,
  },
  logo: {
    alignSelf: 'flex-start',
    height: 34,
    width: 126,
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1 solid #dbe3ea',
    borderRadius: 16,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
  },
  muted: {
    color: '#667085',
  },
  validationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  validationItem: {
    backgroundColor: '#ffffff',
    border: '1 solid #dbe3ea',
    borderRadius: 12,
    minHeight: 64,
    padding: 10,
    width: '48%',
  },
  validationWide: {
    width: '100%',
  },
  label: {
    color: '#64748b',
    fontSize: 8,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 11,
    fontWeight: 700,
  },
  meta: {
    color: '#667085',
    fontSize: 9,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    border: '1 solid #dbe3ea',
    borderRadius: 16,
    flexGrow: 1,
    padding: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 6,
  },
  findingCard: {
    backgroundColor: '#ffffff',
    border: '1 solid #dbe3ea',
    borderRadius: 14,
    marginTop: 12,
    padding: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusPill: {
    backgroundColor: '#eef4ff',
    borderRadius: 999,
    color: '#2d4f85',
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
  },
  listItem: {
    marginBottom: 6,
  },
  gridTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  gridColumn: {
    flexGrow: 1,
    width: '50%',
  },
  activityCard: {
    border: '1 solid #dbe3ea',
    borderRadius: 12,
    marginTop: 10,
    padding: 12,
  },
  code: {
    fontFamily: 'Courier',
    wordBreak: 'break-all',
  },
});

const getLogoUrl = () => `${window.location.origin}/servasmar-iso-mark.svg`;

const PdfHeader: React.FC<{
  eyebrow: string;
  title: string;
  subtitle: string;
}> = ({ eyebrow, title, subtitle }) => (
  <View style={styles.header}>
    <View style={styles.headerContent}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    <Image src={getLogoUrl()} style={styles.logo} />
  </View>
);

const ValidationSection: React.FC<{ validation: ExportValidation }> = ({ validation }) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Objeto de validacion del documento</Text>
    <View style={styles.validationGrid}>
      <View style={styles.validationItem}>
        <Text style={styles.label}>ID de exportacion</Text>
        <Text style={styles.value}>{validation.exportId}</Text>
      </View>
      <View style={styles.validationItem}>
        <Text style={styles.label}>Fuente</Text>
        <Text style={styles.value}>{`${validation.sourceType} · ${validation.sourceId}`}</Text>
      </View>
      <View style={styles.validationItem}>
        <Text style={styles.label}>Usuario</Text>
        <Text style={styles.value}>{validation.generatedBy.name}</Text>
        <Text style={styles.meta}>{`${validation.generatedBy.email} · ${validation.generatedBy.role}`}</Text>
      </View>
      <View style={styles.validationItem}>
        <Text style={styles.label}>Fecha y hora</Text>
        <Text style={styles.value}>
          {new Date(validation.generatedAtIso).toLocaleString('es-CL')}
        </Text>
        <Text style={styles.meta}>{validation.generatedAtIso}</Text>
      </View>
      <View style={[styles.validationItem, styles.validationWide]}>
        <Text style={styles.label}>Codigo de validacion</Text>
        <Text style={[styles.value, styles.code]}>{validation.checksum}</Text>
      </View>
      <View style={[styles.validationItem, styles.validationWide]}>
        <Text style={styles.label}>Version del objeto</Text>
        <Text style={styles.value}>{validation.version}</Text>
      </View>
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
      <Page size="A4" style={styles.page}>
        <PdfHeader
          eyebrow="Sistema de auditorias ISO"
          title={`Informe de auditoria ${audit.type === 'internal' ? 'interna' : 'externa'}`}
          subtitle={`Norma: ${audit.standard} | Fecha: ${audit.date.toLocaleDateString('es-CL')} | Estado: ${audit.status}`}
        />

        <ValidationSection validation={validation} />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.label}>Hallazgos</Text>
            <Text style={styles.statValue}>{String(totalFindings)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.label}>Tareas</Text>
            <Text style={styles.statValue}>{String(report.tasks.length)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.label}>Evidencias</Text>
            <Text style={styles.statValue}>{String(totalEvidences)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.label}>Cumplimiento medio</Text>
            <Text style={styles.statValue}>{`${averageCompliance}%`}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Observaciones, incumplimientos y oportunidades de mejora
          </Text>
          {audit.findings.length > 0 ? (
            audit.findings.map((finding) => {
              const findingTasks = report.tasks.filter((task) =>
                task.relatedFindingIds?.includes(finding.id)
              );
              const findingEvidences = report.evidences.filter(
                (evidence) => evidence.findingId === finding.id
              );

              return (
                <View key={finding.id} style={styles.findingCard}>
                  <View style={styles.rowBetween}>
                    <View style={styles.headerContent}>
                      <Text style={styles.eyebrow}>{finding.type}</Text>
                      <Text style={styles.value}>{finding.description}</Text>
                    </View>
                    <Text style={styles.statusPill}>{finding.status}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {`Responsable: ${finding.assignedTo} | Fecha compromiso: ${finding.dueDate.toLocaleDateString('es-CL')}`}
                  </Text>

                  <Text style={styles.subsectionTitle}>Tareas asociadas</Text>
                  {findingTasks.length > 0 ? (
                    findingTasks.map((task) => (
                      <Text key={task.id} style={styles.listItem}>
                        {`• ${task.title} - ${task.status} - ${task.assignedTo}`}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.listItem}>• Sin tareas asociadas.</Text>
                  )}

                  <Text style={styles.subsectionTitle}>Evidencias de cumplimiento</Text>
                  {findingEvidences.length > 0 ? (
                    findingEvidences.map((evidence) => (
                      <View key={evidence.id} style={styles.listItem}>
                        <Text>{`• ${evidence.title}`}</Text>
                        <Text style={styles.meta}>
                          {`${evidence.status} | ${evidence.completionPercentage ?? 0}% cumplimiento`}
                        </Text>
                        <Text style={styles.meta}>
                          {evidence.fulfillmentSummary || evidence.notes || 'Sin detalle registrado.'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.listItem}>• Sin evidencias registradas.</Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text>Sin hallazgos registrados.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen de cumplimiento</Text>
          <Text style={styles.muted}>
            {`Evidencias aprobadas: ${completedEvidences} de ${totalEvidences}`}
          </Text>
        </View>
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
    <Page size="A4" style={styles.page}>
      <PdfHeader
        eyebrow="Cumplimiento de evidencia"
        title={evidence.title}
        subtitle={`${auditLabel} | ${findingLabel}`}
      />

      <ValidationSection validation={validation} />

      <View style={[styles.card, styles.gridTwo]}>
        <View style={styles.gridColumn}>
          <Text style={styles.label}>Estado</Text>
          <Text style={styles.value}>{evidence.status}</Text>
          <Text style={styles.meta}>{`Cumplimiento ${evidence.completionPercentage ?? 0}%`}</Text>
        </View>
        <View style={styles.gridColumn}>
          <Text style={styles.label}>Responsable</Text>
          <Text style={styles.value}>{evidence.owner}</Text>
          <Text style={styles.meta}>{`Requisito ${evidence.requirementId}`}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumen de cumplimiento</Text>
        <Text>{evidence.fulfillmentSummary || 'Sin resumen de cumplimiento registrado.'}</Text>
        <Text style={styles.meta}>{evidence.notes || 'Sin notas registradas.'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Historial de actividades</Text>
        {(evidence.activityLog ?? []).length > 0 ? (
          [...(evidence.activityLog ?? [])].reverse().map((entry) => (
            <View key={entry.id} style={styles.activityCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.statusPill}>{entry.action}</Text>
                <Text style={styles.meta}>{entry.date.toLocaleString('es-CL')}</Text>
              </View>
              <Text style={{ marginTop: 8 }}>{entry.details}</Text>
              <Text style={styles.meta}>{`${entry.author} | ${entry.status}`}</Text>
            </View>
          ))
        ) : (
          <Text>Sin actividades registradas.</Text>
        )}
      </View>
    </Page>
  </Document>
);
