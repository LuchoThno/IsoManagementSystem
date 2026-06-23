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
        <div key={alert.id} className={`rounded-xl border p-4 shadow-sm ${getPriorityColor(alert.priority)}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-700">{alert.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{alert.description}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {alert.type}
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Vence: {new Date(alert.date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-rose-50 border-rose-100';
    case 'medium':
      return 'bg-amber-50 border-amber-100';
    case 'low':
      return 'bg-emerald-50 border-emerald-100';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};
