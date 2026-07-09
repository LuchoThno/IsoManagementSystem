import type { Audit, AuditExecutionReport, Evidence } from '../types/iso';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const logoUrl = `${window.location.origin}/servasmar-iso-mark.svg`;

export function exportAuditExecutionPdf(audit: Audit, report: AuditExecutionReport) {
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

  const findingsMarkup = audit.findings
    .map((finding) => {
      const findingTasks = report.tasks.filter((task) => task.relatedFindingIds?.includes(finding.id));
      const findingEvidences = report.evidences.filter((evidence) => evidence.findingId === finding.id);

      return `
        <section class="finding-card">
          <div class="finding-header">
            <div>
              <p class="eyebrow">${escapeHtml(finding.type)}</p>
              <h3>${escapeHtml(finding.description)}</h3>
            </div>
            <span class="status-pill">${escapeHtml(finding.status)}</span>
          </div>
          <p class="meta">Responsable: ${escapeHtml(finding.assignedTo)} | Fecha compromiso: ${finding.dueDate.toLocaleDateString('es-CL')}</p>
          <div class="subsection">
            <h4>Tareas asociadas</h4>
            <ul>
              ${
                findingTasks.length > 0
                  ? findingTasks
                      .map(
                        (task) =>
                          `<li><strong>${escapeHtml(task.title)}</strong> - ${escapeHtml(task.status)} - ${escapeHtml(task.assignedTo)}</li>`
                      )
                      .join('')
                  : '<li>Sin tareas asociadas.</li>'
              }
            </ul>
          </div>
          <div class="subsection">
            <h4>Evidencias de cumplimiento</h4>
            <ul>
              ${
                findingEvidences.length > 0
                  ? findingEvidences
                      .map(
                        (evidence) =>
                          `<li>
                            <strong>${escapeHtml(evidence.title)}</strong>
                            <div>${escapeHtml(evidence.status)} | ${(evidence.completionPercentage ?? 0).toString()}% cumplimiento</div>
                            <div>${escapeHtml(
                              evidence.fulfillmentSummary || evidence.notes || 'Sin detalle registrado.'
                            )}</div>
                          </li>`
                      )
                      .join('')
                  : '<li>Sin evidencias registradas.</li>'
              }
            </ul>
          </div>
        </section>
      `;
    })
    .join('');

  const printableWindow = window.open('', '_blank', 'noopener,noreferrer,width=1120,height=840');
  if (!printableWindow) {
    return;
  }

  printableWindow.document.write(`
    <html>
      <head>
        <title>Informe de auditoría ${escapeHtml(audit.standard)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #1f2937; background: #f4f7fb; }
          .page { padding: 40px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; background:linear-gradient(135deg,#313a46 0%,#3f4d5f 100%); color:white; padding:28px; border-radius:24px; }
          .header img { height: 42px; }
          .eyebrow { margin:0 0 8px; font-size:11px; letter-spacing:.22em; text-transform:uppercase; opacity:.7; }
          h1 { margin:0; font-size:30px; }
          .header p { margin:8px 0 0; color:rgba(255,255,255,.78); }
          .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin:24px 0; }
          .stat { background:white; border-radius:20px; padding:18px; border:1px solid #dbe3ea; }
          .stat-label { font-size:11px; text-transform:uppercase; letter-spacing:.18em; color:#6b7280; margin:0 0 8px; }
          .stat-value { font-size:26px; font-weight:700; margin:0; }
          .section-title { margin:0 0 16px; font-size:22px; }
          .finding-card { background:white; border:1px solid #dbe3ea; border-radius:20px; padding:20px; margin-bottom:18px; }
          .finding-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
          .finding-header h3 { margin:6px 0 0; font-size:19px; }
          .status-pill { display:inline-flex; align-items:center; padding:8px 12px; border-radius:999px; background:#eef4ff; color:#2d4f85; font-size:12px; font-weight:700; text-transform:uppercase; }
          .meta { margin:12px 0 0; color:#667085; font-size:13px; }
          .subsection { margin-top:16px; }
          .subsection h4 { margin:0 0 8px; font-size:14px; }
          .subsection ul { margin:0; padding-left:18px; color:#475467; }
          .subsection li { margin-bottom:8px; line-height:1.45; }
          @media print {
            body { background:white; }
            .page { padding: 18px; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="header">
            <div>
              <p class="eyebrow">Sistema de auditorías ISO</p>
              <h1>Informe de auditoría ${escapeHtml(audit.type === 'internal' ? 'interna' : 'externa')}</h1>
              <p>Norma: ${escapeHtml(audit.standard)} | Fecha: ${audit.date.toLocaleDateString('es-CL')} | Estado: ${escapeHtml(audit.status)}</p>
            </div>
            <img src="${logoUrl}" alt="Servasmar ISO" />
          </section>

          <section class="stats">
            <article class="stat">
              <p class="stat-label">Hallazgos</p>
              <p class="stat-value">${totalFindings}</p>
            </article>
            <article class="stat">
              <p class="stat-label">Tareas</p>
              <p class="stat-value">${report.tasks.length}</p>
            </article>
            <article class="stat">
              <p class="stat-label">Evidencias</p>
              <p class="stat-value">${totalEvidences}</p>
            </article>
            <article class="stat">
              <p class="stat-label">Cumplimiento medio</p>
              <p class="stat-value">${averageCompliance}%</p>
            </article>
          </section>

          <section>
            <h2 class="section-title">Observaciones, incumplimientos y oportunidades de mejora</h2>
            ${findingsMarkup || '<p>Sin hallazgos registrados.</p>'}
          </section>

          <section style="margin-top:24px;background:white;border:1px solid #dbe3ea;border-radius:20px;padding:20px;">
            <h2 class="section-title" style="margin-bottom:8px;">Resumen de cumplimiento</h2>
            <p style="margin:0;color:#667085;">Evidencias aprobadas: ${completedEvidences} de ${totalEvidences}</p>
          </section>
        </main>
      </body>
    </html>
  `);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
}

export function exportEvidenceFulfillmentPdf(evidence: Evidence, auditLabel: string, findingLabel: string) {
  const activityMarkup = (evidence.activityLog ?? [])
    .slice()
    .reverse()
    .map(
      (entry) => `
        <article class="activity-card">
          <div class="activity-top">
            <span class="status-pill">${escapeHtml(entry.action)}</span>
            <span class="date-label">${entry.date.toLocaleString('es-CL')}</span>
          </div>
          <p>${escapeHtml(entry.details)}</p>
          <p class="meta">${escapeHtml(entry.author)} | ${escapeHtml(entry.status)}</p>
        </article>
      `
    )
    .join('');

  const printableWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=820');
  if (!printableWindow) {
    return;
  }

  printableWindow.document.write(`
    <html>
      <head>
        <title>Cumplimiento de evidencia ${escapeHtml(evidence.title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #1f2937; background: #f4f7fb; }
          .page { padding: 40px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; background:linear-gradient(135deg,#313a46 0%,#3f4d5f 100%); color:white; padding:28px; border-radius:24px; }
          .header img { height:42px; }
          .eyebrow { margin:0 0 8px; font-size:11px; letter-spacing:.22em; text-transform:uppercase; opacity:.7; }
          h1 { margin:0; font-size:28px; }
          .panel { background:white; border:1px solid #dbe3ea; border-radius:20px; padding:20px; margin-top:20px; }
          .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
          .meta { color:#667085; font-size:13px; }
          .status-pill { display:inline-flex; align-items:center; padding:8px 12px; border-radius:999px; background:#eef4ff; color:#2d4f85; font-size:12px; font-weight:700; text-transform:uppercase; }
          .activity-card { border:1px solid #dbe3ea; border-radius:16px; padding:16px; margin-top:12px; }
          .activity-top { display:flex; justify-content:space-between; gap:12px; align-items:center; }
          .date-label { color:#667085; font-size:12px; }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="header">
            <div>
              <p class="eyebrow">Cumplimiento de evidencia</p>
              <h1>${escapeHtml(evidence.title)}</h1>
              <p>${escapeHtml(auditLabel)} | ${escapeHtml(findingLabel)}</p>
            </div>
            <img src="${logoUrl}" alt="Servasmar ISO" />
          </section>

          <section class="grid">
            <article class="panel">
              <p class="eyebrow" style="color:#667085;opacity:1;">Estado</p>
              <h2 style="margin:0;">${escapeHtml(evidence.status)}</h2>
              <p class="meta">Cumplimiento ${(evidence.completionPercentage ?? 0).toString()}%</p>
            </article>
            <article class="panel">
              <p class="eyebrow" style="color:#667085;opacity:1;">Responsable</p>
              <h2 style="margin:0;">${escapeHtml(evidence.owner)}</h2>
              <p class="meta">Requisito ${escapeHtml(evidence.requirementId)}</p>
            </article>
          </section>

          <section class="panel">
            <h2 style="margin:0 0 12px;">Resumen de cumplimiento</h2>
            <p style="margin:0 0 12px;">${escapeHtml(evidence.fulfillmentSummary || 'Sin resumen de cumplimiento registrado.')}</p>
            <p class="meta">${escapeHtml(evidence.notes || 'Sin notas registradas.')}</p>
          </section>

          <section class="panel">
            <h2 style="margin:0 0 12px;">Historial de actividades</h2>
            ${activityMarkup || '<p>Sin actividades registradas.</p>'}
          </section>
        </main>
      </body>
    </html>
  `);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
}
