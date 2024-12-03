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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Schedule New Audit</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Audit['type'] })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Standard</label>
              <select
                value={formData.standard}
                onChange={(e) => setFormData({ ...formData, standard: e.target.value as ISOStandard })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ISO9001">ISO 9001</option>
                <option value="ISO14001">ISO 14001</option>
                <option value="ISO45001">ISO 45001</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Findings</h4>
            
            <div className="space-y-4 mb-4">
              {formData.findings.map((finding, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
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
                <label className="block text-sm font-medium text-gray-700">Finding Type</label>
                <select
                  value={newFinding.type}
                  onChange={(e) => setNewFinding({ ...newFinding, type: e.target.value as Finding['type'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="nonconformity">Nonconformity</option>
                  <option value="observation">Observation</option>
                  <option value="opportunity">Opportunity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={newFinding.dueDate}
                  onChange={(e) => setNewFinding({ ...newFinding, dueDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newFinding.description}
                  onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter finding description"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <input
                  type="text"
                  value={newFinding.assignedTo}
                  onChange={(e) => setNewFinding({ ...newFinding, assignedTo: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter assignee name"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="button"
                  onClick={addFinding}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Finding</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Schedule Audit
          </button>
        </form>
      </div>
    </div>
  );
};