import type { WorkflowExecution, WorkflowRule, WorkflowRunResult } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiWorkflowRule = Omit<WorkflowRule, 'createdAt' | 'updatedAt'> & {
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiWorkflowExecution = Omit<
  WorkflowExecution,
  'startedAt' | 'finishedAt' | 'createdAt' | 'updatedAt'
> & {
  startedAt: string;
  finishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiWorkflowRunResult = Omit<WorkflowRunResult, 'rule' | 'executions'> & {
  rule: ApiWorkflowRule | null;
  executions: ApiWorkflowExecution[];
};

const toWorkflowRule = (rule: ApiWorkflowRule): WorkflowRule => ({
  ...rule,
  createdAt: rule.createdAt ? new Date(rule.createdAt) : null,
  updatedAt: rule.updatedAt ? new Date(rule.updatedAt) : null,
});

const toWorkflowExecution = (execution: ApiWorkflowExecution): WorkflowExecution => ({
  ...execution,
  startedAt: new Date(execution.startedAt),
  finishedAt: execution.finishedAt ? new Date(execution.finishedAt) : null,
  createdAt: execution.createdAt ? new Date(execution.createdAt) : null,
  updatedAt: execution.updatedAt ? new Date(execution.updatedAt) : null,
});

export async function listWorkflowRules(): Promise<WorkflowRule[]> {
  const rules = await requestIsoApi<ApiWorkflowRule[]>('/workflows/rules');
  return rules.map(toWorkflowRule);
}

export async function listWorkflowExecutions(limit = 25): Promise<WorkflowExecution[]> {
  const executions = await requestIsoApi<ApiWorkflowExecution[]>(
    `/workflows/executions?limit=${limit}`
  );
  return executions.map(toWorkflowExecution);
}

export async function runUpcomingAuditWorkflow(): Promise<WorkflowRunResult> {
  const result = await requestIsoApi<ApiWorkflowRunResult>('/workflows/run-upcoming-audits', {
    method: 'POST',
  });

  return {
    ...result,
    rule: result.rule ? toWorkflowRule(result.rule) : null,
    executions: result.executions.map(toWorkflowExecution),
  };
}
