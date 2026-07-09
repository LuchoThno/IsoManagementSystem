import React from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import type { CalendarEvent } from '../../types/iso';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: CalendarEvent[];
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events,
}) => {
  React.useEffect(() => {
    if (!isOpen || !selectedDate) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, selectedDate]);

  if (!isOpen || !selectedDate) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Calendario operativo
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <p className="mt-2 text-sm text-white/75">
                Revisa auditorías y tareas programadas para la fecha seleccionada.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-5 flex items-center gap-3 rounded-[24px] border border-app-border bg-app-surface-alt/70 px-4 py-4">
            <div className="app-icon-chip">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-app-text">
                {events.length} {events.length === 1 ? 'evento registrado' : 'eventos registrados'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Vista consolidada para la operación del sistema.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {events.length > 0 ? (
              events.map((eventItem) => (
                <article
                  key={eventItem.id}
                  className={`rounded-[24px] border px-4 py-4 ${
                    eventItem.type === 'task'
                      ? 'border-amber-100 bg-amber-50'
                      : 'border-app-primary/10 bg-app-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-app-text">{eventItem.title}</p>
                      <div className="mt-2 flex items-center text-sm text-slate-500">
                        <Clock className="mr-1 h-4 w-4" />
                        {format(new Date(eventItem.date), 'h:mm a')}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {eventItem.type}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-app-border px-4 py-10 text-center text-sm text-slate-500">
                No hay eventos programados para este día.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-app-border bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <button type="button" onClick={onClose} className="app-button-secondary w-full">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
