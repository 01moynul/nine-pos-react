// src/pages/StockValuation.tsx

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Calendar, X, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';


// --- LOCAL INTERFACES ---
interface ValuationItem {
  name: string;
  quantity: number;
  cost_price: number;
  total_cost: number;
}

interface CategoryGroup {
  category_name: string;
  items: ValuationItem[];
  subtotal: number;
}

interface ValuationResponse {
  categories: CategoryGroup[];
  grand_total: number;
}

export default function StockValuation() {
  const navigate = useNavigate();
  const [data, setData] = useState<ValuationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState<string>(''); // NEW: Tracks the selected history date

  // --- NEW: Time Filter State ---
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  const { t } = useLanguage();

  const API_URL = import.meta.env.VITE_API_URL;

 // UPDATED: Now accepts date, startTime, and endTime
  const fetchValuation = useCallback(async (dateQuery: string = '', startQuery: string = '', endQuery: string = '') => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      let endpoint = `${API_URL}/api/reports/valuation`;
      
      // If a date is selected, switch to the history endpoint and append times if they exist
      if (dateQuery) {
        endpoint = `${API_URL}/api/reports/valuation/history?date=${dateQuery}`;
        if (startQuery) endpoint += `&startTime=${startQuery}`;
        if (endQuery) endpoint += `&endTime=${endQuery}`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error: unknown) {
      console.error("API call failed:", error);
      interface ApiError { response?: { data?: { error?: string } } }
      const apiError = error as ApiError;
      alert(apiError.response?.data?.error || "Failed to load valuation data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // COMBINED EFFECT: Triggers whenever the Date or Times change
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      alert("Access Denied: Admins only.");
      navigate('/dashboard');
      return;
    }
    // Pass all three variables to the fetcher
    fetchValuation(targetDate, startTime, endTime);
  }, [targetDate, startTime, endTime, fetchValuation, navigate]);

  // Currency Formatter
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount).replace('MYR', 'RM');
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-gray-500 font-medium">Calculating Inventory Valuation...</div>;
  }

  if (!data) return null;

  // We use a global counter to maintain the S/N across different category tables
  let globalSerialNumber = 1;

// --- FIX: Calculate local YYYY-MM-DD string to bypass UTC timezone drift ---
  const today = new Date();
  const maxLocalDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white print:m-0 print:p-0">
      
      {/* --- NON-PRINTABLE HEADER --- */}
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow hover:bg-gray-50">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inventory Report</h1>
              <p className="text-sm text-gray-500">
                {targetDate ? `Historical valuation for ${targetDate}` : "Live, real-time inventory cost analysis"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* The Date Picker Control */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-300">
                <Calendar size={18} className="text-gray-500" />
                <input
                    type="date"
                    value={targetDate}
                    max={maxLocalDate}
                    onChange={(e) => {
                    setTargetDate(e.target.value);
                    // Optional: Auto-clear times if the date is cleared
                    if (!e.target.value) { setStartTime(''); setEndTime(''); }
                    }}
                    className="border-none outline-none text-sm font-medium text-gray-700 bg-transparent cursor-pointer"
                />
                {targetDate && (
                    <button onClick={() => { setTargetDate(''); setStartTime(''); setEndTime(''); }} className="text-red-500 hover:text-red-700 ml-1" title="Clear All">
                    <X size={16} />
                    </button>
                )}
            </div>

            {/* NEW: The Time Picker Controls (Only visible if a date is chosen) */}
            {targetDate && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-300 transition-all">
                <Clock size={18} className="text-blue-500" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border-none outline-none text-sm font-medium text-gray-700 bg-transparent cursor-pointer"
                  title="Start Time"
                />
                <span className="text-gray-400 font-bold">-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border-none outline-none text-sm font-medium text-gray-700 bg-transparent cursor-pointer"
                  title="End Time"
                />
                {(startTime || endTime) && (
                  <button onClick={() => { setStartTime(''); setEndTime(''); }} className="text-red-500 hover:text-red-700 ml-1" title="Clear Times">
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50"
              disabled={!data || !data.categories || data.categories.length === 0}
            >
              <Printer size={20} /> Print A4 Report
            </button>
          </div>
        </div>

      {/* --- PRINTABLE A4 DOCUMENT --- */}
      <div className="max-w-4xl mx-auto bg-white p-10 shadow-lg rounded-xl print:shadow-none print:rounded-none print:p-0">
        
        {/* Document Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wider mb-2">MINI MART STOCK COUNT FORM</h1>
          <h2 className="text-xl font-semibold text-gray-700">(SECTION WISE VALUATION)</h2>
          <div className="flex justify-between mt-8 text-left border-b-2 border-gray-800 pb-4">
            <div>
              <p className="font-bold text-gray-800">Date: <span className="font-normal border-b border-gray-400 inline-block w-48 text-center">
                {targetDate ? targetDate : new Date().toLocaleDateString()}
              </span></p>
              <p className="font-bold text-gray-800 mt-2">Shop Name: <span className="font-normal border-b border-gray-400 inline-block w-40"></span></p>
            </div>
            <div>
              <p className="font-bold text-gray-800 mt-2">Generated By: <span className="font-normal border-b border-gray-400 inline-block w-48">{localStorage.getItem('username')}</span></p>
            </div>
          </div>
        </div>

        {/* Dynamic Category Tables */}
        {(!data.categories || data.categories.length === 0) ? (
          <div className="py-20 text-center text-gray-500 font-medium border-2 border-dashed border-gray-300 rounded-xl m-8 print:hidden">
            No inventory ledger records found for this selected date.
          </div>
        ) : (
          data.categories.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-10 page-break-inside-avoid">
              <h3 className="text-xl font-bold text-gray-800 mb-3 uppercase tracking-wide bg-gray-100 p-2 border-l-4 border-blue-600 print:bg-transparent print:border-gray-800">
                {group.category_name}
              </h3>
              <table className="w-full text-left border-collapse border border-gray-300">
                <thead className="bg-gray-100 print:bg-gray-200">
                  <tr>
                    <th className="p-2 border border-gray-300 w-12 text-center text-sm">S/N</th>
                    <th className="p-2 border border-gray-300 text-sm">Item Name</th>
                    <th className="p-2 border border-gray-300 w-24 text-center text-sm">Qty</th>
                    <th className="p-2 border border-gray-300 w-32 text-right text-sm">Billing Price</th>
                    <th className="p-2 border border-gray-300 w-32 text-right text-sm">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {group.items.map((item, itemIndex) => {
                    const currentSn = globalSerialNumber++;
                    return (
                      <tr key={itemIndex} className="even:bg-gray-50 print:even:bg-transparent">
                        <td className="p-2 border border-gray-300 text-center text-gray-600">{currentSn}</td>
                        <td className="p-2 border border-gray-300 font-medium text-gray-900">{item.name}</td>
                        <td className="p-2 border border-gray-300 text-center text-gray-800 font-bold">{item.quantity}</td>
                        <td className="p-2 border border-gray-300 text-right text-gray-600 font-mono">{formatMoney(item.cost_price)}</td>
                        <td className="p-2 border border-gray-300 text-right font-bold text-gray-900 font-mono">{formatMoney(item.total_cost)}</td>
                      </tr>
                    );
                  })}
                  {/* Category Subtotal Row */}
                  <tr className="bg-gray-50 print:bg-gray-100 border-t-2 border-gray-400">
                    <td colSpan={4} className="p-2 border border-gray-300 text-right font-bold text-gray-800">
                      {group.category_name} Subtotal:
                    </td>
                    <td className="p-2 border border-gray-300 text-right font-bold text-blue-800 font-mono print:text-black">
                      {formatMoney(group.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}

        {/* Grand Total Block */}
        <div className="mt-8 mb-16 p-6 border-4 border-gray-800 bg-gray-50 print:bg-transparent flex justify-between items-center page-break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-800 uppercase">Grand Total Valuation</h2>
          <span className="text-3xl font-black text-blue-700 font-mono print:text-black">
            {formatMoney(data.grand_total)}
          </span>
        </div>

        {/* --- SIGNATURE BLOCK (Page 41 of PDF) --- */}
        <div className="mt-16 pt-8 border-t-2 border-gray-800 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4 underline uppercase text-center">Stock Verification & Agreement</h2>
          
          <p className="text-gray-700 mb-8 italic text-center">
            {t('valuation_confirmation')}
          </p>
          
            <div className="grid grid-cols-2 gap-16 mt-12">
                <div className="space-y-8">
                <div className="border-b border-gray-400 pb-1">
                    <span className="font-bold text-sm text-gray-600">{t('seller_name')}:</span>
                </div>
                <div className="border-b border-gray-400 pb-1 pt-6">
                    <span className="font-bold text-sm text-gray-600">{t('signature')}:</span>
                </div>
                <div className="border-b border-gray-400 pb-1 pt-6">
                    <span className="font-bold text-sm text-gray-600">{t('date')}:</span>
                </div>
                </div>
                
                <div className="space-y-8">
                <div className="border-b border-gray-400 pb-1">
                    <span className="font-bold text-sm text-gray-600">{t('buyer_name')}:</span>
                </div>
                <div className="border-b border-gray-400 pb-1 pt-6">
                    <span className="font-bold text-sm text-gray-600">{t('signature')}:</span>
                </div>
                <div className="border-b border-gray-400 pb-1 pt-6">
                    <span className="font-bold text-sm text-gray-600">{t('date')}:</span>
                </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}