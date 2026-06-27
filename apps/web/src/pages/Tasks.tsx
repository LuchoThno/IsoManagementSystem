import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchBootstrap } from '../lib/api';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskModal } from '../components/tasks/TaskModal';
import type { Task, ISOStandard } from '../types/iso';
import {
  createTaskApi,
  deleteTaskApi,
  updateTaskApi,
} from '../lib/tasksApi';
import { useISOStore } from '../store/useISOStore';

export const Tasks: React.FC = () => {
  const hydrate = useISOStore((state) => state.hydrate);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');

  const refreshTasks = useCallback(async () => {
    const bootstrap = await fetchBootstrap();
    hydrate(bootstrap);
    setTasks(bootstrap.tasks);
  }, [hydrate]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        await refreshTasks();
      } catch {
        setLoadError('No fue posible cargar las tareas desde la API.');
      } finally {
        setLoading(false);
      }
    };

    void loadTasks();
  }, [refreshTasks]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStandard = standardFilter === 'all' || task.standard === standardFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesStandard;
  });

  const handleCreateTask = async (taskData: Omit<Task, 'id'>) => {
    const newTask = await createTaskApi(taskData);
    setTasks((current) => [...current, newTask]);
    await refreshTasks();
  };

  const handleEditTask = async (task: Task) => {
    setEditingTask(task);
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Eliminar la tarea "${task.title}"?`)) {
      return;
    }

    await deleteTaskApi(task.id);
    await refreshTasks();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-700">Tareas</h2>
          <p className="mt-1 text-sm text-slate-400">
            Orquesta acciones correctivas, responsables y fechas de vencimiento.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 rounded-lg bg-[#727cf5] px-4 py-2.5 text-white transition-colors hover:bg-[#636df0]"
        >
          <Plus className="w-5 h-5" />
          <span>Crear tarea</span>
        </button>
      </div>

      <div className="panel-card p-4">
        <TaskFilters
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          onFilterStatus={setStatusFilter}
          onFilterPriority={setPriorityFilter}
          onFilterStandard={setStandardFilter}
        />
      </div>

      {loadError ? (
        <div className="rounded-[28px] border border-dashed border-rose-200 bg-rose-50 py-14 text-center">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-rose-700">{loadError}</p>
            <p className="mt-2 text-sm text-rose-500">
              Revisa la API de tareas o la conexión de datos para continuar.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-slate-700">Cargando tareas...</p>
            <p className="mt-2 text-sm text-slate-400">
              Estamos consultando el módulo de tareas en la API.
            </p>
          </div>
        </div>
      ) : (
        <TaskList
          tasks={filteredTasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      )}

      <TaskModal
        isOpen={isCreateModalOpen}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      <TaskModal
        isOpen={Boolean(editingTask)}
        mode="edit"
        initialTask={editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={async (taskData) => {
          if (!editingTask) return;
          await updateTaskApi(editingTask.id, taskData);
          await refreshTasks();
        }}
      />
    </div>
  );
};
