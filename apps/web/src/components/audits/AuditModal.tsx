import React from 'react';
import { ClipboardCheck, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import type { Audit, Finding, ISOStandard } from '../../types/iso';

interface AuditModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialAudit?: Audit | null;
  onClose: () => void;
  onSubmit: (audit: Omit<Audit, 'id'>) => Promise<void> | void;
}

const emptyFinding = {
  type: 'observation' as Finding['type'],
  description: '',
  status: 'open' as Finding['status'],
  dueDate: '',
  assignedTo: '',
};

const emptyForm = {
  type: 'internal' as Audit['type'],
  standard: 'ISO9001' as ISOStandard,
  date: '',
  status: 'planned' as Audit['status'],
  findings: [] as Omit<Finding, 'id'>[],
};

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  mode,
  initialAudit,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = React.useState(emptyForm);
  const [newFinding, setNewFinding] = React.useState(emptyFinding);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialAudit) {
      setFormData({
        type: initialAudit.type,
        standard: initialAudit.standard,
        date: initialAudit.date.toISOString().slice(0, 10),
        status: initialAudit.status,
        findings: initialAudit.findings.map((finding) => ({
          type: finding.type,
          description: finding.description,
          status: finding.status,
          dueDate: finding.dueDate.toISOString().slice(0, 10),
          assignedTo: finding.assignedTo,
        })),
      });
      setNewFinding(emptyFinding);
      return;
    }

    setFormData(emptyForm);
    setNewFinding(emptyFinding);
  }, [initialAudit, isOpen, mode]);

  const addFinding = () => {
    if (!newFinding.description.trim() || !newFinding.dueDate || !newFinding.assignedTo.trim()) {
      return;
    }

    setFormData((current) => ({
      ...current,
      findings: [...current.findings, newFinding],
    }));
    setNewFinding(emptyFinding);
  };

  const removeFinding = (index: number) => {
    setFormData((current) => ({
      ...current,
      findings: current.findings.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        date: new Date(formData.date),
        findings: formData.findings.map((finding, index) => ({
          ...finding,
          id: initialAudit?.findings[index]?.id ?? `finding-${index}-${Date.now()}`,
          dueDate: new Date(finding.dueDate),
        })),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4">
      <div className="my-8 w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Módulo de auditorías
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                {mode === 'create' ? 'Programar auditoría' : 'Actualizar auditoría'}
              </h3>
              <p className="mt-2 text-sm text-white/75">
                Ajusta alcance, fecha, estado y hallazgos desde una sola vista.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Tipo</span>
              <select
                value={formData.type}
                onChange={(event) =>
                  setFormData({ ...formData, type: event.target.value as Audit['type'] })
                }
                className="admin-select mt-2 w-full"
              >
                <option value="internal">Interna</option>
                <option value="external">Externa</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-600">Norma</span>
              <select
                value={formData.standard}
                onChange={(event) =>
                  setFormData({ ...formData, standard: event.target.value as ISOStandard })
                }
                className="admin-select mt-2 w-full"
              >
                <option value="ISO9001">ISO 9001</option>
                <option value="ISO14001">ISO 14001</option>
                <option value="ISO45001">ISO 45001</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-600">Fecha</span>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                className="admin-input mt-2"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-600">Estado</span>
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData({ ...formData, status: event.target.value as Audit['status'] })
                }
                className="admin-select mt-2 w-full"
              >
                <option value="planned">Planificada</option>
                <option value="in-progress">En progreso</option>
                <option value="completed">Completada</option>
              </select>
            </label>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-700">Hallazgos</h4>
                <p className="mt-1 text-sm text-slate-400">
                  Registra no conformidades, observaciones y oportunidades.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {formData.findings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
                  Esta auditoría todavía no tiene hallazgos cargados.
                </div>
              ) : (
                formData.findings.map((finding, index) => (
                  <div
                    key={`${finding.description}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#727cf5]/10 px-3 py-1 text-xs font-bold uppercase text-[#727cf5]">
                            {finding.type}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {finding.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          {finding.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Responsable: {finding.assignedTo} · Límite: {finding.dueDate}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFinding(index)}
                        className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-600">Tipo de hallazgo</span>
                <select
                  value={newFinding.type}
                  onChange={(event) =>
                    setNewFinding({ ...newFinding, type: event.target.value as Finding['type'] })
                  }
                  className="admin-select mt-2 w-full"
                >
                  <option value="nonconformity">No conformidad</option>
                  <option value="observation">Observación</option>
                  <option value="opportunity">Oportunidad</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">Estado del hallazgo</span>
                <select
                  value={newFinding.status}
                  onChange={(event) =>
                    setNewFinding({ ...newFinding, status: event.target.value as Finding['status'] })
                  }
                  className="admin-select mt-2 w-full"
                >
                  <option value="open">Abierto</option>
                  <option value="in-progress">En progreso</option>
                  <option value="closed">Cerrado</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-slate-600">Descripción</span>
                <input
                  type="text"
                  value={newFinding.description}
                  onChange={(event) =>
                    setNewFinding({ ...newFinding, description: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="Describe el hallazgo observado"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">Responsable</span>
                <input
                  type="text"
                  value={newFinding.assignedTo}
                  onChange={(event) =>
                    setNewFinding({ ...newFinding, assignedTo: event.target.value })
                  }
                  className="admin-input mt-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">Fecha límite</span>
                <input
                  type="date"
                  value={newFinding.dueDate}
                  onChange={(event) =>
                    setNewFinding({ ...newFinding, dueDate: event.target.value })
                  }
                  className="admin-input mt-2"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={addFinding}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#727cf5] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#636df0]"
            >
              <Plus className="h-4 w-4" />
              Agregar hallazgo
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#727cf5] px-4 py-3 font-bold text-white transition hover:bg-[#636df0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {submitting
                  ? 'Guardando...'
                  : mode === 'create'
                    ? 'Programar auditoría'
                    : 'Guardar cambios'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
