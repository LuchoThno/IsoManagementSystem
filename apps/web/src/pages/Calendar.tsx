import React, { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { CalendarView } from '../components/calendar/CalendarView';
import { EventModal } from '../components/calendar/EventModal';
import { CalendarFilters } from '../components/calendar/CalendarFilters';
import {
  getCalendarSyncStatus,
  syncGoogleCalendar,
  type CalendarSyncStatus,
} from '../lib/calendarApi';
import { useISOStore } from '../store/useISOStore';
import type { ISOStandard } from '../types/iso';

export const Calendar: React.FC = () => {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'task' | 'audit' | 'all'>('all');
  const [syncStatus, setSyncStatus] = useState<CalendarSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  React.useEffect(() => {
    let mounted = true;

    void getCalendarSyncStatus()
      .then((status) => {
        if (mounted) {
          setSyncStatus(status);
        }
      })
      .catch(() => {
        if (mounted) {
          setSyncMessage('No fue posible consultar el estado de Google Calendar.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesStandard = standardFilter === 'all' || event.standard === standardFilter;
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    return matchesStandard && matchesType;
  });

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncGoogleCalendar();
      setSyncStatus(result);
      setSyncMessage(
        `Sincronización completada. Creados: ${result.created}, actualizados: ${result.updated}.`
      );
    } catch (error) {
      setSyncMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible sincronizar con Google Calendar.'
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f7fbff_38%,#edf5fb_100%)] shadow-sm">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  syncStatus?.configured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {syncStatus?.configured ? 'Sincronización activa' : 'Sincronización pendiente'}
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-700">Calendario</h2>
            <p className="mt-1 text-sm text-slate-400">
              Organiza vencimientos, auditorías y seguimiento operativo en un solo lugar.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="text-xs font-medium text-slate-400">
              {syncStatus?.configured ? 'Google Calendar conectado a Servasmar ISO' : 'Google Calendar no disponible'}
            </div>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncing || !syncStatus?.configured}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#39afd1] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(57,175,209,0.22)] transition hover:-translate-y-0.5 hover:bg-[#2f9abb] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar calendario'}
            </button>
          </div>
        </div>
      </div>
      {syncMessage ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {syncMessage}
        </div>
      ) : null}
      {syncStatus && !syncStatus.configured && syncStatus.missing.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Faltan variables para sincronizar: {syncStatus.missing.join(', ')}
        </div>
      ) : null}
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
