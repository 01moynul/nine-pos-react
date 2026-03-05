// src/pages/SalesReports.tsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, ShoppingBag, TrendingUp, Package, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// --- INTERFACES ---
interface VoidedTransaction {
    id: number;
    session_id: string;
    total_value_lost: number;
    reason: string;
    security_video_url?: string;
    timestamp: string;
}
interface TopSellingItem {
  product_name: string;
  sold: number;
  revenue: number;
  profit: number; // <-- NEW: From Phase 3
}

// NEW: Added interface to handle the line items passed from our new GORM Preload
interface SaleItemData {
    id: number;
    product: { name: string };
    quantity: number;
    buy_price_rm: number;
    price_at_sale: number;
}

interface Sale {
    id: number;
    total_amount: number;
    sale_time: string;
    status: string;
    security_video_url?: string; 
    items?: SaleItemData[]; // <-- NEW: Contains the cart contents for the receipt and profit math
}

interface ReportData {
  total_revenue: number;
  total_profit: number; 
  total_orders: number;
  top_selling: TopSellingItem[];
  recent_sales: Sale[]; 
  voided_sales: VoidedTransaction[]; // NEW
}

export default function SalesReports() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  // --- Filter State (Task 3.2) ---
  const [timeframe, setTimeframe] = useState<string>('all'); 
  const API_URL = import.meta.env.VITE_API_URL; 

  // --- NEW: State for Digital Receipt Modal ---
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  // --- NEW: Helper to calculate exact profit per transaction dynamically ---
  const calculateSaleProfit = (sale: Sale) => {
      if (!sale.items || sale.items.length === 0) return 0;
      return sale.items.reduce((totalProfit, item) => {
          // Profit = (Sell Price - Buy Price) * Quantity
          const itemProfit = (item.price_at_sale - item.buy_price_rm) * item.quantity;
          return totalProfit + itemProfit;
      }, 0);
  };

  useEffect(() => {
    const fetchFilteredReports = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token'); 
        // Dynamically applies the URL and the Timeframe filter
        const response = await axios.get(`${API_URL}/api/reports?timeframe=${timeframe}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch reports:", error); // Satisfies linter requirements
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredReports();
  }, [timeframe, API_URL]); // Only re-runs when the timeframe button is clicked

  // Format Money: RM 1,234.56
  const formatMoney = (amount: number) => {
    const safeAmount = amount || 0; 
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(safeAmount);
  };

  // Format Date: Nov 23, 2025, 2:30 PM
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
  };

  // --- NEW FIX: The Google Drive URL Translator ---
  // This extracts the raw File ID and forces the Drive Web Player
  const getDrivePreviewUrl = (url?: string) => {
    if (!url) return "#";
    // Regex to find the 33-character Google Drive ID inside any link variation
    const match = url.match(/[-\w]{25,}/); 
    if (match && match[0]) {
        return `https://drive.google.com/file/d/${match[0]}/preview`;
    }
    return url; // Fallback just in case
  };

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
                <h1 className="text-2xl font-bold text-gray-800">{t('sales_analytics')}</h1>
                <p className="text-sm text-gray-500">{t('real_time_metrics')}</p>
            </div>
            </div>
        {/* --- NEW: Advanced Filtering UI (Task 3.2) --- */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100 inline-flex">
            <span className="text-sm font-semibold text-gray-500 ml-2 mr-2">Filter By:</span>
            
            <button 
                onClick={() => setTimeframe('today')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeframe === 'today' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`}
            >
                Today
            </button>
            <button 
                onClick={() => setTimeframe('7days')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeframe === '7days' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`}
            >
                7 Days
            </button>
            <button 
                onClick={() => setTimeframe('30days')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeframe === '30days' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`}
            >
                30 Days
            </button>
            <button 
                onClick={() => setTimeframe('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeframe === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`}
            >
                All Time
            </button>
        </div>
        
        {/* KPI Cards (Now merged into a 4-column grid!) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            
            {/* 1. Total Revenue Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-full"><DollarSign size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">{t('total_revenue')}</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatMoney(data.total_revenue)}</h3>
                </div>
            </div>

            {/* 2. NEW True Profit Card (Task 3.2) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><TrendingUp size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">True Profit</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{formatMoney(data.total_profit)}</h3>
                </div>
            </div>

            {/* 3. Total Orders Card (Restored to use ShoppingBag) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><ShoppingBag size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">{t('total_orders')}</p>
                    <h3 className="text-2xl font-bold text-gray-800">{data.total_orders}</h3>
                </div>
            </div>

            {/* 4. AOV Card (Restored to use the aov variable) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><DollarSign size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">{t('avg_order_value')}</p>
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
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                {/* NEW: Added Net Profit Header */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider font-bold">Net Profit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Security Audit</th>
                                {/* NEW: Action column for the receipt button */}
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.recent_sales?.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{sale.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Assuming you have a formatMoney helper, otherwise use your existing amount display */}
                                        RM {sale.total_amount.toFixed(2)}
                                    </td>
                                    {/* NEW: Calculate and display the profit using our new helper */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                                        RM {calculateSaleProfit(sale).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(sale.sale_time).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {sale.status}
                                        </span>
                                    </td>
                                    {/* NEW: Smart Security Engine Button (Task 2.4) */}
                                    <td className="px-6 py-4 text-center">
                                        {sale.security_video_url ? (
                                            <a 
                                                href={getDrivePreviewUrl(sale.security_video_url)} // <--- NEW FIX: Route through our translator
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                                            >
                                                Watch Video
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-sm">No Record</span>
                                        )}
                                    </td>
                                    {/* NEW: Button to trigger the Digital Receipt Modal */}
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setSelectedReceipt(sale)}
                                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium bg-indigo-50 px-3 py-1 rounded"
                                        >
                                            View Receipt
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data.recent_sales?.length === 0 && (
                                <tr><td colSpan={4} className="p-6 text-center text-gray-400">No transactions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* --- NEW: Security Audit - Voided Transactions (Task 2.4) --- */}
                <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                        <h3 className="font-bold text-red-800 flex items-center gap-2">
                            <Clock size={20} className="text-red-500" /> Security Audit: Voided & Canceled Carts
                        </h3>
                    </div>
                    <table className="w-full text-left">
                    <thead className="bg-white text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Reason</th>
                                <th className="px-6 py-3 text-right">Value Lost</th>
                                <th className="px-6 py-3 text-center">Security Video</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                            {data.voided_sales?.map((voided) => (
                                <tr key={voided.id} className="hover:bg-red-50/50">
                                    <td className="px-6 py-4 text-gray-800">{formatDate(voided.timestamp)}</td>
                                    <td className="px-6 py-4 font-medium text-red-600">{voided.reason}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                                        {formatMoney(voided.total_value_lost)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {voided.security_video_url && !voided.security_video_url.includes("PENDING_UPLOAD") ? (
                                            <a 
                                                href={getDrivePreviewUrl(voided.security_video_url)} // <--- NEW FIX: Route through our translator
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-bold shadow-sm"
                                            >
                                                Watch Audit
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Processing...</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.voided_sales?.length === 0 && (
                                <tr><td colSpan={4} className="p-6 text-center text-gray-400">No voided transactions found. Excellent!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
        </div>
      {/* --- NEW: Digital Receipt Modal --- */}
      {/* If selectedReceipt has data, we render this full-screen overlay */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative">
                
                {/* Close Button */}
                <button 
                    onClick={() => setSelectedReceipt(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                >
                    ✕
                </button>

                {/* Receipt Header */}
                <div className="text-center border-b pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Nine-POS</h2>
                    <p className="text-sm text-gray-500">Digital Receipt</p>
                    <p className="text-xs text-gray-400 mt-1">Transaction #{selectedReceipt.id}</p>
                    <p className="text-xs text-gray-400">{new Date(selectedReceipt.sale_time).toLocaleString()}</p>
                </div>

                {/* Receipt Line Items */}
                <div className="space-y-3 mb-6">
                    {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                        selectedReceipt.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{item.product.name}</p>
                                    <p className="text-xs text-gray-500">{item.quantity}x @ RM {item.price_at_sale.toFixed(2)}</p>
                                </div>
                                <div className="font-medium text-gray-800">
                                    RM {(item.quantity * item.price_at_sale).toFixed(2)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 italic text-center">No item details available for this legacy transaction.</p>
                    )}
                </div>

                {/* Receipt Totals */}
                <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>RM {selectedReceipt.total_amount.toFixed(2)}</span>
                    </div>
                    {/* Management Only: Show the hidden profit on the receipt */}
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Net Profit</span>
                        <span>RM {calculateSaleProfit(selectedReceipt).toFixed(2)}</span>
                    </div>
                </div>

            </div>
        </div>
      )}

    </div> // Final closing div of the SalesReports component
  );
}