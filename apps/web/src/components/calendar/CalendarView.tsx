import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import type { CalendarEvent } from '../../types/iso';

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onDateSelect }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (date: Date) => 
    events.filter(event => isSameDay(new Date(event.date), date));

  return (
    <div className="panel-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <h3 className="text-lg font-extrabold text-slate-700">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-slate-50 p-3 text-center text-xs font-extrabold uppercase tracking-wide text-slate-400">
            {day}
          </div>
        ))}
        
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`min-h-[110px] cursor-pointer bg-white p-3 hover:bg-slate-50 ${
                dayEvents.length > 0 ? 'bg-[#727cf5]/[0.04]' : ''
              }`}
            >
              <div className="text-sm font-extrabold text-slate-700">
                {format(day, 'd')}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={`rounded px-2 py-1 text-xs font-bold ${
                      event.type === 'task'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
