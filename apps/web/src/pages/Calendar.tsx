import React, { useState } from 'react';
import { CalendarDays, Link2 } from 'lucide-react';
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
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-700">Calendario</h2>
          <p className="mt-1 text-sm text-slate-400">
            Visualiza vencimientos y auditorias planificadas por norma.
          </p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#39afd1]/10 p-3 text-[#39afd1]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-700">Google Calendar</h3>
              <p className="mt-1 text-sm text-slate-400">Integración recomendada</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Sincroniza auditorías y vencimientos con un calendario compartido usando
            `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`,
            `GOOGLE_CALENDAR_REFRESH_TOKEN` y `GOOGLE_CALENDAR_ID`.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            <Link2 className="h-3.5 w-3.5" />
            Entorno listo para conexión externa
          </div>
        </div>
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
