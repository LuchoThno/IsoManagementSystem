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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold">
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
              className={`p-3 rounded-lg ${
                event.type === 'task'
                  ? 'bg-yellow-50 border border-yellow-100'
                  : 'bg-blue-50 border border-blue-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{event.title}</h4>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-white">
                  {event.type}
                </span>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                {format(new Date(event.date), 'h:mm a')}
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No events scheduled for this day
            </p>
          )}
        </div>
      </div>
    </div>
  );
};