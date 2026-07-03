import React from 'react';
import { fetchAccessContext, type AccessContext } from '../lib/accessContext';

export function useAccessContext() {
  const [accessContext, setAccessContext] = React.useState<AccessContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadAccessContext = async () => {
      try {
        const nextContext = await fetchAccessContext();
        if (mounted) {
          setAccessContext(nextContext);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible resolver el contexto de acceso.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadAccessContext();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    accessContext,
    loading,
    error,
  };
}
