import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import McpRegistriesPage from './pages/McpRegistriesPage';
import McpServersPage from './pages/McpServersPage';

const McpRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/mcp/registries" replace />} />
    <Route path="/registries/*" element={<McpRegistriesPage />} />
    <Route path="/servers/*" element={<McpServersPage />} />
  </Routes>
);

export default McpRoutes;
