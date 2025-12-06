import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import McpRegistriesPage from './pages/McpRegistriesPage';
import McpRegistryDetailsPage from './pages/McpRegistryDetailsPage';
import McpCatalogsPage from './pages/McpCatalogsPage';
import McpCatalogDetailsPage from './pages/McpCatalogDetailsPage';

// MCP Servers page is accessible via /gen-ai-studio/assets route

const McpRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="registries" replace />} />
    <Route path="/catalogs/:catalogName" element={<McpCatalogDetailsPage />} />
    <Route path="/catalogs" element={<McpCatalogsPage />} />
    <Route path="/registries/:name" element={<McpRegistryDetailsPage />} />
    <Route path="/registries" element={<McpRegistriesPage />} />
  </Routes>
);

export default McpRoutes;
