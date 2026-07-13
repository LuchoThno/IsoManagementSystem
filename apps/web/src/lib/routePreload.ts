const preloaders = {
  '/': () => import('../pages/Dashboard'),
  '/documents': () => import('../pages/Documents'),
  '/tasks': () => import('../pages/Tasks'),
  '/automation': () => import('../pages/Automation'),
  '/audits': () => import('../pages/Audits'),
  '/calendar': () => import('../pages/Calendar'),
  '/alerts': () => import('../pages/Alerts'),
  '/chat': () => import('../pages/Chat'),
  '/communications': () => import('../pages/Communications'),
  '/settings': () => import('../pages/Settings'),
  '/settings/general': () => import('../pages/settings/SettingsGeneral'),
  '/settings/notifications': () => import('../pages/settings/SettingsNotifications'),
  '/settings/users': () => import('../pages/settings/SettingsUsers'),
  '/login': () => import('../pages/Login'),
} as const;

const preloadedRoutes = new Set<string>();

const resolvePreloader = (route: string) => {
  if (route in preloaders) {
    return preloaders[route as keyof typeof preloaders];
  }

  const normalized = route.replace(/\/+$/, '') || '/';

  if (normalized in preloaders) {
    return preloaders[normalized as keyof typeof preloaders];
  }

  return null;
};

export const preloadRoute = (route: string) => {
  if (preloadedRoutes.has(route)) {
    return;
  }

  const preloader = resolvePreloader(route);
  if (!preloader) {
    return;
  }

  preloadedRoutes.add(route);
  void preloader();
};
