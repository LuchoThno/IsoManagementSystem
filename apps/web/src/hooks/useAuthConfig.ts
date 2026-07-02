import React from 'react';
import { fetchAuthConfig, type AuthConfig } from '../lib/authConfig';

export function useAuthConfig() {
  const [authConfig, setAuthConfig] = React.useState<AuthConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadAuthConfig = async () => {
      try {
        const nextConfig = await fetchAuthConfig();
        if (mounted) {
          setAuthConfig(nextConfig);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible resolver la configuración de autenticación.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadAuthConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    authConfig,
    loading,
    error,
  };
}
