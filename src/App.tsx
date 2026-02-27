import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

// Import your existing pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminProducts from './pages/AdminProducts';
import SalesReports from './pages/SalesReports';
import StockValuation from './pages/StockValuation';

// Import our new Lockdown UI (We will create this next)
import Lockdown from './pages/Lockdown';

function App() {
  const [isLockedDown, setIsLockedDown] = useState(false);

  useEffect(() => {
    // 🚨 The Global DRM Interceptor
    const interceptor = axios.interceptors.response.use(
      (response) => response, // If the request is successful, do nothing
      (error) => {
        // If the backend throws our specific DRM error code
        if (error.response && error.response.status === 402) {
          console.error("DRM Triggered: Subscription Expired");
          localStorage.removeItem('token'); // Destroy the active session
          setIsLockedDown(true);            // Trigger the lockdown UI
        }
        return Promise.reject(error);
      }
    );

    // Cleanup the interceptor if the app unmounts
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // 🛑 The Inescapable Trap
  if (isLockedDown) {
    return <Lockdown onUnlock={() => setIsLockedDown(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/reports" element={<SalesReports />} />
        <Route path="/admin/valuation" element={<StockValuation />} />
        {/* Catch-All Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;