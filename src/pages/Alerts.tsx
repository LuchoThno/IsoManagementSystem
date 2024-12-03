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
      <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
      <AlertFilters 
        onFilterType={setTypeFilter} 
        onFilterPriority={setPriorityFilter} 
      />
      {filteredAlerts.length > 0 ? (
        <AlertList alerts={filteredAlerts} />
      ) : (
        <div className="p-4 text-gray-500">No hay alertas disponibles.</div>
      )}
    </div>
  );
};