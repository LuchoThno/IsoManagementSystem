import React from 'react';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
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
  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-extrabold text-slate-700">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
                className={`rounded-xl p-3 ${
                  event.type === 'task'
                    ? 'border border-amber-100 bg-amber-50'
                    : 'border border-indigo-100 bg-indigo-50'
                }`}
              >
                <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-700">{event.title}</h4>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                  {event.type}
                </span>
              </div>
              <div className="mt-2 flex items-center text-sm text-slate-500">
                <Clock className="w-4 h-4 mr-1" />
                {format(new Date(event.date), 'h:mm a')}
              </div>
            </div>
          ))}

              {events.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No hay eventos programados para este dia
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
