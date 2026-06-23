import type { Task } from '../types/iso';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

type ApiTask = Omit<Task, 'dueDate'> & {
  dueDate: string;
};

const toTask = (task: ApiTask): Task => ({
  ...task,
  dueDate: new Date(task.dueDate),
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/iso${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listTasks(): Promise<Task[]> {
  const tasks = await request<ApiTask[]>('/tasks');
  return tasks.map(toTask);
}

export async function createTaskApi(payload: Omit<Task, 'id'>): Promise<Task> {
  const task = await request<ApiTask>('/tasks', {
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
  const task = await request<ApiTask>(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return toTask(task);
}

export async function updateTaskApi(
  taskId: string,
  updates: Partial<Omit<Task, 'id'>>
): Promise<Task> {
  const task = await request<ApiTask>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...updates,
      dueDate: updates.dueDate ? updates.dueDate.toISOString() : undefined,
    }),
  });

  return toTask(task);
}

export async function deleteTaskApi(taskId: string): Promise<void> {
  await request(`/tasks/${taskId}/delete`, {
    method: 'PATCH',
  });
}
