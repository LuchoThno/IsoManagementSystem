import type { Task } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiTask = Omit<Task, 'dueDate'> & {
  dueDate: string;
};

const toTask = (task: ApiTask): Task => ({
  ...task,
  dueDate: new Date(task.dueDate),
});

export async function listTasks(): Promise<Task[]> {
  const tasks = await requestIsoApi<ApiTask[]>('/tasks');
  return tasks.map(toTask);
}

export async function createTaskApi(payload: Omit<Task, 'id'>): Promise<Task> {
  const task = await requestIsoApi<ApiTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      dueDate: payload.dueDate.toISOString(),
    }),
  });

  return toTask(task);
}

export async function updateTaskStatusApi(
  taskId: string,
  status: Task['status']
): Promise<Task> {
  const task = await requestIsoApi<ApiTask>(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return toTask(task);
}

export async function updateTaskApi(
  taskId: string,
  updates: Partial<Omit<Task, 'id'>>
): Promise<Task> {
  const task = await requestIsoApi<ApiTask>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...updates,
      dueDate: updates.dueDate ? updates.dueDate.toISOString() : undefined,
    }),
  });

  return toTask(task);
}

export async function deleteTaskApi(taskId: string): Promise<void> {
  await requestIsoApi(`/tasks/${taskId}/delete`, {
    method: 'PATCH',
  });
}
