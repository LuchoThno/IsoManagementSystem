import type { Contract, ContractDocument, ContractObligation, PaginatedResult } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiContractDocument = Omit<ContractDocument, 'uploadedAt'> & {
  uploadedAt: string;
};

type ApiContractObligation = Omit<ContractObligation, 'dueDate' | 'createdAt' | 'updatedAt'> & {
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiContract = Omit<
  Contract,
  'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'obligations' | 'documents'
> & {
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  obligations?: ApiContractObligation[];
  documents?: ApiContractDocument[];
};

const toObligation = (obligation: ApiContractObligation): ContractObligation => ({
  ...obligation,
  dueDate: obligation.dueDate ? new Date(obligation.dueDate) : null,
  createdAt: obligation.createdAt ? new Date(obligation.createdAt) : undefined,
  updatedAt: obligation.updatedAt ? new Date(obligation.updatedAt) : undefined,
});

const toDocument = (document: ApiContractDocument): ContractDocument => ({
  ...document,
  uploadedAt: new Date(document.uploadedAt),
});

const toContract = (contract: ApiContract): Contract => ({
  ...contract,
  startDate: contract.startDate ? new Date(contract.startDate) : null,
  endDate: contract.endDate ? new Date(contract.endDate) : null,
  createdAt: new Date(contract.createdAt),
  updatedAt: new Date(contract.updatedAt),
  obligations: contract.obligations?.map(toObligation) ?? [],
  documents: contract.documents?.map(toDocument) ?? [],
});

export async function listContracts(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedResult<Contract>> {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set('page', String(params.page));
  }

  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }

  const path = query.size > 0 ? `/contracts?${query.toString()}` : '/contracts';
  const result = await requestIsoApi<PaginatedResult<ApiContract>>(path);

  return {
    ...result,
    items: result.items.map(toContract),
  };
}

export async function listContractObligations(contractId: string): Promise<ContractObligation[]> {
  const obligations = await requestIsoApi<ApiContractObligation[]>(`/contracts/${contractId}/obligations`);
  return obligations.map(toObligation);
}

export async function createContractApi(payload: {
  title: string;
  counterparty: string;
  identifier: string;
  status?: Contract['status'];
  startDate?: Date | null;
  endDate?: Date | null;
  standardIds?: string[];
  owner?: string;
  summary?: string;
  obligations?: Array<{
    standardId?: string | null;
    title: string;
    description?: string;
    sourceClause?: string;
    dueDate?: Date | null;
    status?: ContractObligation['status'];
    priority?: ContractObligation['priority'];
    owner?: string;
    evidenceIds?: string[];
  }>;
}) {
  const contract = await requestIsoApi<ApiContract>('/contracts', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      startDate: payload.startDate ? payload.startDate.toISOString() : null,
      endDate: payload.endDate ? payload.endDate.toISOString() : null,
      obligations: payload.obligations?.map((obligation) => ({
        ...obligation,
        dueDate: obligation.dueDate ? obligation.dueDate.toISOString() : null,
      })),
    }),
  });

  return toContract(contract);
}
