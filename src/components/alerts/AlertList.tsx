// src/components/alerts/AlertList.tsx
import React from 'react';
import type { Alert } from '../../types/iso';

interface AlertListProps {
  alerts: Alert[];
}

export const AlertList: React.FC<AlertListProps> = ({ alerts }) => {
  return (
    <div className="space-y-4">
      {alerts.map(alert => (
        <div key={alert.id} className={`p-4 rounded-lg border ${getPriorityColor(alert.priority)}`}>
          <h3 className="text-lg font-semibold">{alert.title}</h3>
          <p className="text-sm">{alert.description}</p>
          <p className="text-xs">Due: {new Date(alert.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-50 border-red-200';
    case 'medium':
      return 'bg-yellow-50 border-yellow-200';
    case 'low':
      return 'bg-green-50 border-green-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};