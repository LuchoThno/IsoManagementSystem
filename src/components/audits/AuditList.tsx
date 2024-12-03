import React from 'react';
import { format } from 'date-fns';
import { ClipboardCheck, AlertCircle, Clock } from 'lucide-react';
import type { Audit } from '../../types/iso';

interface AuditListProps {
  audits: Audit[];
  onStatusChange: (auditId: string, status: Audit['status']) => void;
}

export const AuditList: React.FC<AuditListProps> = ({ audits, onStatusChange }) => {
  const getStatusIcon = (status: Audit['status']) => {
    switch (status) {
      case 'completed':
        return <ClipboardCheck className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
      {audits.map((audit) => (
        <div key={audit.id} className="p-6 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                {getStatusIcon(audit.status)}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {audit.type.charAt(0).toUpperCase() + audit.type.slice(1)} Audit - {audit.standard}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Scheduled for {format(audit.date, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Findings ({audit.findings.length})</h4>
                <div className="space-y-2">
                  {audit.findings.map((finding) => (
                    <div key={finding.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full mr-2 ${
                          finding.type === 'nonconformity' ? 'bg-red-100 text-red-800' :
                          finding.type === 'observation' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {finding.type}
                        </span>
                        <span className="text-sm text-gray-700">{finding.description}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Due: {format(finding.dueDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <select
              value={audit.status}
              onChange={(e) => onStatusChange(audit.id, e.target.value as Audit['status'])}
              className="ml-4 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      ))}
      {audits.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No audits found matching your criteria.
        </div>
      )}
    </div>
  );
};