import React, { useState } from 'react';
import { CalendarView } from '../components/calendar/CalendarView';
import { EventModal } from '../components/calendar/EventModal';
import { CalendarFilters } from '../components/calendar/CalendarFilters';
import { useISOStore } from '../store/useISOStore';
import type { ISOStandard } from '../types/iso';

export const Calendar: React.FC = () => {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'task' | 'audit' | 'all'>('all');

  const events = useISOStore((state) => {
    const tasks = state.tasks.map(task => ({
      id: task.id,
      title: task.title,
      date: new Date(task.dueDate),
      type: 'task' as const,
      standard: task.standard,
    }));

    const audits = state.audits.map(audit => ({
      id: audit.id,
      title: `${audit.type === 'internal' ? 'Auditoria interna' : 'Auditoria externa'} - ${audit.standard}`,
      date: new Date(audit.date),
      type: 'audit' as const,
      standard: audit.standard,
    }));

    return [...tasks, ...audits];
  });

  const filteredEvents = events.filter(event => {
    const matchesStandard = standardFilter === 'all' || event.standard === standardFilter;
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    return matchesStandard && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-700">Calendario</h2>
        <p className="mt-1 text-sm text-slate-400">
          Visualiza vencimientos y auditorias planificadas por norma.
        </p>
      </div>
      <div className="panel-card p-4">
        <CalendarFilters 
          onFilterStandard={setStandardFilter} 
          onFilterType={setTypeFilter} 
        />
      </div>
      <CalendarView 
        events={filteredEvents} 
        onDateSelect={(date) => {
          setSelectedDate(date);
          setIsEventModalOpen(true);
        }} 
      />
      {isEventModalOpen && selectedDate && (
        <EventModal 
          isOpen={isEventModalOpen} 
          onClose={() => setIsEventModalOpen(false)} 
          selectedDate={selectedDate} 
          events={filteredEvents.filter(event => {
            return new Date(event.date).toDateString() === selectedDate.toDateString();
          })} 
        />
      )}
    </div>
  );
};
