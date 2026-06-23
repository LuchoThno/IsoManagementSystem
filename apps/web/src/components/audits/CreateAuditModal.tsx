import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { ISOStandard, Audit, Finding } from '../../types/iso';

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

  const addFinding = () => {
    if (newFinding.description && newFinding.dueDate) {
      setFormData({
        ...formData,
        findings: [...formData.findings, { ...newFinding }],
      });
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
    setFormData({
      ...formData,
      findings: formData.findings.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-slate-700">Programar auditoria</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Audit['type'] })}
                className="admin-select mt-2 w-full"
              >
                <option value="internal">Interna</option>
                <option value="external">Externa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Norma</label>
              <select
                value={formData.standard}
                onChange={(e) => setFormData({ ...formData, standard: e.target.value as ISOStandard })}
                className="admin-select mt-2 w-full"
              >
                <option value="ISO9001">ISO 9001</option>
                <option value="ISO14001">ISO 14001</option>
                <option value="ISO45001">ISO 45001</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="admin-input mt-2"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Hallazgos</h4>
            
            <div className="space-y-4 mb-4">
              {formData.findings.map((finding, index) => (
                <div key={index} className="flex items-center space-x-2 rounded-lg bg-slate-50 p-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    finding.type === 'nonconformity' ? 'bg-red-100 text-red-800' :
                    finding.type === 'observation' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {finding.type}
                  </span>
                  <span className="flex-1 text-sm">{finding.description}</span>
                  <button
                    type="button"
                    onClick={() => removeFinding(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de hallazgo</label>
                <select
                  value={newFinding.type}
                  onChange={(e) => setNewFinding({ ...newFinding, type: e.target.value as Finding['type'] })}
                  className="admin-select mt-2 w-full"
                >
                  <option value="nonconformity">No conformidad</option>
                  <option value="observation">Observacion</option>
                  <option value="opportunity">Oportunidad</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha limite</label>
                <input
                  type="date"
                  value={newFinding.dueDate}
                  onChange={(e) => setNewFinding({ ...newFinding, dueDate: e.target.value })}
                  className="admin-input mt-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Descripcion</label>
                <input
                  type="text"
                  value={newFinding.description}
                  onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                  className="admin-input mt-2"
                  placeholder="Describe el hallazgo"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Responsable</label>
                <input
                  type="text"
                  value={newFinding.assignedTo}
                  onChange={(e) => setNewFinding({ ...newFinding, assignedTo: e.target.value })}
                  className="admin-input mt-2"
                  placeholder="Nombre del responsable"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="button"
                  onClick={addFinding}
                  className="flex items-center space-x-2 rounded-lg bg-slate-100 px-4 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar hallazgo</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#727cf5] px-4 py-2.5 font-bold text-white transition hover:bg-[#636df0]"
          >
            Programar auditoria
          </button>
        </form>
      </div>
    </div>
  );
};
