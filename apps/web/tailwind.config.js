/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          'surface-alt': 'var(--surface-alt)',
          'surface-strong': 'var(--surface-strong)',
          sidebar: 'var(--sidebar)',
          'sidebar-soft': 'var(--sidebar-soft)',
          primary: 'var(--primary)',
          'primary-strong': 'var(--primary-strong)',
          'primary-soft': 'var(--primary-soft)',
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          info: 'var(--info)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          border: 'var(--border)',
        },
      },
      borderRadius: {
        app: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
        pill: '999px',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        floating: 'var(--shadow-floating)',
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
