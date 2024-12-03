import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  AlertCircle,
  Calendar,
  Settings,
  ClipboardList,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/audits', icon: ClipboardList, label: 'Audits' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/alerts', icon: AlertCircle, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200">
      <nav className="mt-6 px-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-gray-700 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50'
              }`
            }
          >
            <Icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};