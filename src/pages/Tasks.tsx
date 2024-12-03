import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { useISOStore } from '../store/useISOStore';
import type { Task, ISOStandard } from '../types/iso';

export const Tasks: React.FC = () => {
  const tasks = useISOStore((state) => state.tasks);
  const addTask = useISOStore((state) => state.addTask);
  const updateTask = useISOStore((state) => state.updateTask);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStandard = standardFilter === 'all' || task.standard === standardFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesStandard;
  });

  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
    };
    addTask(newTask);
  };

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    updateTask(taskId, { status });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Task</span>
        </button>
      </div>

      <TaskFilters
        onSearch={setSearchQuery}
        onFilterStatus={setStatusFilter}
        onFilterPriority={setPriorityFilter}
        onFilterStandard={setStandardFilter}
      />

      <TaskList
        tasks={filteredTasks}
        onStatusChange={handleStatusChange}
      />

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
};