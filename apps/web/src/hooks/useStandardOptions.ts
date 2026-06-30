import { useQuery } from '@tanstack/react-query';
import { listStandards } from '../lib/standardsApi';
import { useISOStore } from '../store/useISOStore';

const defaultOptions = [
  { id: 'iso9001-default', code: 'ISO9001', title: 'ISO 9001:2015' },
  { id: 'iso14001-default', code: 'ISO14001', title: 'ISO 14001:2015' },
  { id: 'iso45001-default', code: 'ISO45001', title: 'ISO 45001:2018' },
];

export function useStandardOptions() {
  const standards = useISOStore((state) => state.standards);
  const documents = useISOStore((state) => state.documents);
  const tasks = useISOStore((state) => state.tasks);
  const audits = useISOStore((state) => state.audits);
  const { data } = useQuery({
    queryKey: ['standards'],
    queryFn: listStandards,
    staleTime: 60_000,
  });

  const source = standards.length > 0 ? standards : data ?? [];

  if (source.length > 0) {
    return source.map((standard) => ({
      id: standard.id,
      code: standard.code,
      title: standard.title,
    }));
  }

  const codes = Array.from(
    new Set([
      ...documents.map((document) => document.standard),
      ...tasks.map((task) => task.standard),
      ...audits.map((audit) => audit.standard),
    ].filter(Boolean))
  );

  if (codes.length > 0) {
    return codes.map((code) => ({
      id: `${code}-derived`,
      code,
      title: code,
    }));
  }

  return defaultOptions;
}
