// src/pages/Alerts.tsx
import React, { useState } from 'react';
import { AlertList } from '../components/alerts/AlertList';
import { AlertFilters } from '../components/alerts/AlertFilters';
import { useISOStore } from '../store/useISOStore';
import type { Alert } from '../types/iso';

export const Alerts: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<Alert['type'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Alert['priority'] | 'all'>('all');

  // Obtener las alertas de la tienda
  const alerts = useISOStore((state) => state.alerts);

  // Filtrar las alertas según los filtros seleccionados
  const filteredAlerts = alerts.filter(alert => {
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || alert.priority === priorityFilter;
    return matchesType && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-700">Alertas</h2>
        <p className="mt-1 text-sm text-slate-400">
          Prioriza riesgos, vencimientos y acciones que requieren seguimiento inmediato.
        </p>
      </div>
      <div className="panel-card p-4">
        <AlertFilters 
          onFilterType={setTypeFilter} 
          onFilterPriority={setPriorityFilter} 
        />
      </div>
      {filteredAlerts.length > 0 ? (
        <AlertList alerts={filteredAlerts} />
      ) : (
        <div className="panel-card p-6 text-slate-500">No hay alertas disponibles.</div>
      )}
    </div>
  );
};
