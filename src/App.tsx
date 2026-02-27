// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminProducts from './pages/AdminProducts';
import SalesReports from './pages/SalesReports'; // <--- 1. Import this
import StockValuation from './pages/StockValuation';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        
        {/* 2. Add the Route */}
        <Route path="/admin/reports" element={<SalesReports />} />
        <Route path="/admin/valuation" element={<StockValuation />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;