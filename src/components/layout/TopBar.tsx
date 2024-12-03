import React from 'react';
import { Bell, User } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          ISO Management System
        </h1>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-full relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          
          <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
            <User className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};