import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchBootstrapShell } from '../lib/api';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskModal } from '../components/tasks/TaskModal';
import type { Task, ISOStandard } from '../types/iso';
import {
  createTaskApi,
  deleteTaskApi,
  listTasks,
  updateTaskApi,
} from '../lib/tasksApi';
import { useISOStore } from '../store/useISOStore';

export const Tasks: React.FC = () => {
  const tasks = useISOStore((state) => state.tasks);
  const bootstrapped = useISOStore((state) => state.bootstrapped);
  const hydrateShell = useISOStore((state) => state.hydrateShell);
  const replaceTasks = useISOStore((state) => state.replaceTasks);
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
    replaceTasks(await listTasks());
  }, [replaceTasks]);

  const refreshShell = useCallback(() => {
    void fetchBootstrapShell({ force: true })
      .then((data) => {
        hydrateShell(data);
      })
      .catch(() => {});
  }, [hydrateShell]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(!bootstrapped || tasks.length === 0);
        setLoadError(null);
        await refreshTasks();
      } catch {
        setLoadError('No fue posible cargar las tareas desde la API.');
      } finally {
        setLoading(false);
      }
    };

    void loadTasks();
  }, [bootstrapped, refreshTasks, tasks.length]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStandard = standardFilter === 'all' || task.standard === standardFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesStandard;
  });

  const handleCreateTask = async (taskData: Omit<Task, 'id'>) => {
    await createTaskApi(taskData);
    await refreshTasks();
    refreshShell();
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
    refreshShell();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-app-text">Tareas</h2>
          <p className="mt-1 text-sm text-app-muted">
            Orquesta acciones correctivas, responsables y fechas de vencimiento.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="app-button-primary inline-flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="h-5 w-5" />
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
        <div className="app-empty-state-danger">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-rose-700">{loadError}</p>
            <p className="mt-2 text-sm text-rose-500">
              Revisa la API de tareas o la conexión de datos para continuar.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="app-empty-state">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-app-text">Cargando tareas...</p>
            <p className="mt-2 text-sm text-app-muted">
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
          refreshShell();
        }}
      />
    </div>
  );
};
