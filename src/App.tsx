import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { Tasks } from './pages/Tasks';
import { Audits } from './pages/Audits';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="audits" element={<Audits />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;