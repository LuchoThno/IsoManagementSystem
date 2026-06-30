import type { CorrectiveAction } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiCorrectiveAction = Omit<CorrectiveAction, 'dueDate' | 'createdAt' | 'updatedAt'> & {
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

const toCorrectiveAction = (action: ApiCorrectiveAction): CorrectiveAction => ({
  ...action,
  dueDate: action.dueDate ? new Date(action.dueDate) : null,
  createdAt: new Date(action.createdAt),
  updatedAt: new Date(action.updatedAt),
});

export async function listCorrectiveActions(): Promise<CorrectiveAction[]> {
  const actions = await requestIsoApi<ApiCorrectiveAction[]>('/corrective-actions');
  return actions.map(toCorrectiveAction);
}

export async function createCorrectiveActionApi(payload: {
  title: string;
  description?: string;
  sourceType: CorrectiveAction['sourceType'];
  sourceId: string;
  standardId?: string | null;
  auditId?: string | null;
  assignedTo?: string;
  dueDate?: Date | null;
  status?: CorrectiveAction['status'];
  priority?: CorrectiveAction['priority'];
  evidenceIds?: string[];
  verificationNotes?: string;
}) {
  const action = await requestIsoApi<ApiCorrectiveAction>('/corrective-actions', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      dueDate: payload.dueDate ? payload.dueDate.toISOString() : null,
    }),
  });

  return toCorrectiveAction(action);
}
