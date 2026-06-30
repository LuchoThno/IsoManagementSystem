import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001/api';
  const proxyTarget = apiUrl.replace(/\/api\/?$/, '');

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@clerk/')) {
              return 'vendor-clerk';
            }

            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'vendor-react';
            }

            if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
              return 'vendor-realtime';
            }

            if (id.includes('date-fns')) {
              return 'vendor-date';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
