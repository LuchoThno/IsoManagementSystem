import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Audit, Finding, ISOStandard } from '../../types/iso';

interface CreateAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (audit: Omit<Audit, 'id'>) => void;
}

export const CreateAuditModal: React.FC<CreateAuditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    type: 'internal' as Audit['type'],
    standard: 'ISO9001' as ISOStandard,
    date: '',
    status: 'planned' as Audit['status'],
    findings: [] as Omit<Finding, 'id'>[],
  });

  const [newFinding, setNewFinding] = useState({
    type: 'observation' as Finding['type'],
    description: '',
    status: 'open' as Finding['status'],
    dueDate: '',
    assignedTo: '',
  });

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const addFinding = () => {
    if (newFinding.description && newFinding.dueDate) {
      setFormData((current) => ({
        ...current,
        findings: [...current.findings, { ...newFinding }],
      }));
      setNewFinding({
        type: 'observation',
        description: '',
        status: 'open',
        dueDate: '',
        assignedTo: '',
      });
    }
  };

  const removeFinding = (index: number) => {
    setFormData((current) => ({
      ...current,
      findings: current.findings.filter((_, findingIndex) => findingIndex !== index),
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...formData,
      date: new Date(formData.date),
      findings: formData.findings.map((finding, index) => ({
        ...finding,
        id: `finding-${index}`,
        dueDate: new Date(finding.dueDate),
      })),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-4xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Módulo de auditorías
              </p>
              <h3 className="mt-2 text-xl font-extrabold">Programar auditoría</h3>
              <p className="mt-2 text-sm text-white/75">
                Define el tipo, la norma y los hallazgos iniciales con el patrón actual del sistema.
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                        setFormData({
                          ...formData,
                          standard: event.target.value as ISOStandard,
                        })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      <option value="ISO9001">ISO 9001</option>
                      <option value="ISO14001">ISO 14001</option>
                      <option value="ISO45001">ISO 45001</option>
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-bold text-slate-600">Fecha</span>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </label>
                </div>

                <div className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5">
                  <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    Nuevo hallazgo
                  </h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-bold text-slate-600">Tipo de hallazgo</span>
                      <select
                        value={newFinding.type}
                        onChange={(event) =>
                          setNewFinding({
                            ...newFinding,
                            type: event.target.value as Finding['type'],
                          })
                        }
                        className="admin-select mt-2 w-full"
                      >
                        <option value="nonconformity">No conformidad</option>
                        <option value="observation">Observación</option>
                        <option value="opportunity">Oportunidad</option>
                      </select>
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

                    <label className="block md:col-span-2">
                      <span className="text-sm font-bold text-slate-600">Descripción</span>
                      <input
                        type="text"
                        value={newFinding.description}
                        onChange={(event) =>
                          setNewFinding({ ...newFinding, description: event.target.value })
                        }
                        className="admin-input mt-2"
                        placeholder="Describe el hallazgo"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="text-sm font-bold text-slate-600">Responsable</span>
                      <input
                        type="text"
                        value={newFinding.assignedTo}
                        onChange={(event) =>
                          setNewFinding({ ...newFinding, assignedTo: event.target.value })
                        }
                        className="admin-input mt-2"
                        placeholder="Nombre del responsable"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={addFinding}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-app-surface px-4 py-2.5 font-bold text-slate-600 transition hover:bg-white"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar hallazgo
                  </button>
                </div>
              </div>

              <aside className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    Hallazgos cargados
                  </h4>
                  <span className="rounded-full bg-app-info/10 px-3 py-1 text-xs font-bold text-app-info">
                    {formData.findings.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {formData.findings.length > 0 ? (
                    formData.findings.map((finding, index) => (
                      <article
                        key={`${finding.description}-${index}`}
                        className="rounded-[24px] border border-app-border bg-white/85 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                finding.type === 'nonconformity'
                                  ? 'bg-red-100 text-red-800'
                                  : finding.type === 'observation'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {finding.type}
                            </span>
                            <p className="mt-3 text-sm font-semibold text-app-text">
                              {finding.description}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {finding.assignedTo || 'Sin responsable'} · {finding.dueDate}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFinding(index)}
                            className="rounded-xl p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-app-border px-4 py-10 text-center text-sm text-slate-500">
                      Agrega hallazgos iniciales para dejarlos listos en la auditoría.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>

          <div className="border-t border-app-border bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="app-button-secondary w-full sm:w-auto sm:min-w-[160px]"
              >
                Cancelar
              </button>
              <button type="submit" className="app-button-primary w-full sm:flex-1">
                Programar auditoría
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
