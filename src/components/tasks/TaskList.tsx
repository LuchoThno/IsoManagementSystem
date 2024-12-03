import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { Task } from '../../types/iso';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onStatusChange }) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
      {tasks.map((task) => (
        <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{task.description}</p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Assigned to: {task.assignedTo}</span>
                <span>Due: {format(task.dueDate, 'MMM d, yyyy')}</span>
                <span>Standard: {task.standard}</span>
              </div>
            </div>
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
              className="ml-4 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No tasks found matching your criteria.
        </div>
      )}
    </div>
  );
};