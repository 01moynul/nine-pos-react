// src/pages/SalesReports.tsx

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, ShoppingBag, TrendingUp, Package, Clock } from 'lucide-react';

// --- INTERFACES ---
interface TopSellingItem {
  product_name: string;
  sold: number;
  revenue: number;
}

interface Sale {
    id: number;
    total_amount: number;
    sale_time: string;
    status: string;
}

interface ReportData {
  total_revenue: number;
  total_orders: number;
  top_selling: TopSellingItem[];
  recent_sales: Sale[]; // <--- Added this
}

export default function SalesReports() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Format Money: $1,234.56
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format Date: Nov 23, 2025, 2:30 PM
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
  };

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching reports", error);
      alert("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
      return <div className="p-8 flex justify-center text-gray-500">Loading analytics...</div>;
  }

  if (!data) return null;

  const aov = data.total_orders > 0 ? data.total_revenue / data.total_orders : 0;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-white rounded-full shadow hover:bg-gray-50">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sales Analytics</h1>
            <p className="text-sm text-gray-500">Real-time performance metrics</p>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-full"><DollarSign size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatMoney(data.total_revenue)}</h3>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><ShoppingBag size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                    <h3 className="text-2xl font-bold text-gray-800">{data.total_orders}</h3>
                </div>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><TrendingUp size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Avg. Order Value</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatMoney(aov)}</h3>
                </div>
            </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Package size={20} className="text-gray-500" /> Top Selling Products
                </h3>
            </div>
            <table className="w-full text-left">
                <thead className="bg-white text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-3">Product Name</th>
                        <th className="px-6 py-3">Units Sold</th>
                        <th className="px-6 py-3 text-right">Revenue Generated</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.top_selling?.length === 0 ? (
                        <tr><td colSpan={3} className="p-6 text-center text-gray-400">No sales data yet.</td></tr>
                    ) : (
                        data.top_selling?.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-800">{item.product_name}</td>
                                <td className="px-6 py-4 text-gray-600">{item.sold}</td>
                                <td className="px-6 py-4 text-right font-mono text-gray-800">{formatMoney(item.revenue)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* --- NEW: Recent Transactions Table --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Clock size={20} className="text-gray-500" /> Recent Transactions
                </h3>
            </div>
            <table className="w-full text-left">
                <thead className="bg-white text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Date & Time</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.recent_sales?.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-gray-500">#{sale.id}</td>
                            <td className="px-6 py-4 text-gray-800">{formatDate(sale.sale_time)}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                                    {sale.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-800">
                                {formatMoney(sale.total_amount)}
                            </td>
                        </tr>
                    ))}
                    {data.recent_sales?.length === 0 && (
                         <tr><td colSpan={4} className="p-6 text-center text-gray-400">No transactions found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

      </div>
    </div>
  );
}