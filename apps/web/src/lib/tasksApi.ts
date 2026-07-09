import type { Task } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

export type TaskUpsertPayload = Omit<Task, 'id'> & {
  changeSummary?: string;
};

type ApiTask = Omit<Task, 'dueDate' | 'changeLog'> & {
  dueDate: string;
  changeLog?: Array<
    Omit<NonNullable<Task['changeLog']>[number], 'date'> & {
      date: string;
    }
  >;
};

const toTask = (task: ApiTask): Task => ({
  ...task,
  dueDate: new Date(task.dueDate),
  changeLog: (task.changeLog ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
});

export async function listTasks(): Promise<Task[]> {
  const tasks = await requestIsoApi<ApiTask[]>('/tasks');
  return tasks.map(toTask);
}

export async function createTaskApi(payload: TaskUpsertPayload): Promise<Task> {
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
  updates: Partial<TaskUpsertPayload>
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
