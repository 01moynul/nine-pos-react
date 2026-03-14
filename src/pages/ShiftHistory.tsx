// src/pages/ShiftHistory.tsx

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Video, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import type { ShiftLog } from '../types';

export default function ShiftHistory() {
    const navigate = useNavigate();
    const [shifts, setShifts] = useState<ShiftLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchShiftHistory = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/shift/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(response.data);
    } catch (err) {
      console.error("Failed to fetch shift history", err);
      setError("Failed to load shift audit logs.");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchShiftHistory();
  }, [fetchShiftHistory]);

  // Helper function to format money safely
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
  };

  // Helper function to format dates
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Active Now";
    return new Date(dateString).toLocaleString('en-MY', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Shift History...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* --- NEW: Back to Dashboard Button --- */}
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-200 shadow-sm"
            title="Back to Dashboard"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Lock className="text-blue-600" />
              Till Audit & Shift Ledger
            </h1>
            <p className="text-gray-500 mt-1">Review morning floats, closing cash, and security footage.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Shift Window</th>
                <th className="p-4 font-semibold">Staff</th>
                <th className="p-4 font-semibold text-blue-700">Initial Cash</th>
                <th className="p-4 font-semibold">Sales Breakdown</th>
                <th className="p-4 font-semibold">Expected Cash</th>
                <th className="p-4 font-semibold">Actual Cash</th>
                <th className="p-4 font-semibold">Over / Short</th>
                <th className="p-4 font-semibold text-center">Security Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No shift records found.</td>
                </tr>
              ) : (
                shifts.map((shift) => {
                  const isShort = shift.over_short_amount < 0;
                  const isPerfect = shift.over_short_amount === 0;
                  const isOpen = shift.status === 'open';

                  return (
                    <tr key={shift.id} className={`hover:bg-gray-50 ${isOpen ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{formatDate(shift.opened_at)}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          to {formatDate(shift.closed_at)}
                          {isOpen && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold ml-2 animate-pulse">LIVE</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-800">Op: {shift.opened_by}</div>
                        <div className="text-sm text-gray-500">Cl: {shift.closed_by || '---'}</div>
                      </td>
                      
                      {/* --- NEW: Initial Cash Column --- */}
                      <td className="p-4 font-mono font-bold text-blue-700 bg-blue-50/10 border-r border-gray-100">
                        {formatMoney(shift.opening_cash)}
                      </td>
                      {/* -------------------------------- */}

                      <td className="p-4">
                            <div className="text-xs font-bold text-gray-800 border-b pb-1 mb-1">
                            Total: {formatMoney(shift.total_cash + shift.total_qr + shift.total_card)} 
                            <span className="text-gray-500 font-normal ml-1">({shift.cash_count + shift.qr_count + shift.card_count})</span>
                            </div>
                            <div className="text-xs text-green-700 font-semibold">
                            Cash: {formatMoney(shift.total_cash)} <span className="text-gray-500 font-normal">({shift.cash_count})</span>
                            </div>
                            <div className="text-xs text-blue-600">
                            QR: {formatMoney(shift.total_qr)} <span className="text-gray-500 font-normal">({shift.qr_count})</span>
                            </div>
                            <div className="text-xs text-purple-600">
                            Card: {formatMoney(shift.total_card)} <span className="text-gray-500 font-normal">({shift.card_count})</span>
                            </div>
                      </td>
                      <td className="p-4 font-mono text-gray-700">
                        <div>{formatMoney(shift.expected_cash)}</div>
                        <div className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-gray-200 leading-tight">
                          (Float + Cash Sales)
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-900">
                        {isOpen ? '---' : formatMoney(shift.actual_closing_cash)}
                      </td>
                      <td className="p-4">
                        {isOpen ? (
                          <span className="text-gray-400">---</span>
                        ) : (
                          <div className={`flex items-center gap-1 font-bold ${isShort ? 'text-red-600' : isPerfect ? 'text-green-600' : 'text-blue-600'}`}>
                            {isShort ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                            {formatMoney(shift.over_short_amount)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-2 items-center">
                          {/* 1. Morning Float Video */}
                          {shift.opening_video_url && shift.opening_video_url !== "NO_VIDEO" && (
                            shift.opening_video_url.startsWith("PENDING") ? (
                              <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold whitespace-nowrap">Float Uploading...</span>
                            ) : (
                              <a 
                                href={shift.opening_video_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold transition-colors w-full"
                              >
                                <Video size={14} /> Float Video
                              </a>
                            )
                          )}

                          {/* 2. End-of-Day Count Video */}
                          {shift.closing_video_url && shift.closing_video_url !== "NO_VIDEO" && (
                            shift.closing_video_url.startsWith("PENDING") ? (
                              <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold whitespace-nowrap">Close Uploading...</span>
                            ) : (
                              <a 
                                href={shift.closing_video_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1 text-xs bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded-lg font-bold transition-colors w-full"
                              >
                                <Video size={14} /> End Video
                              </a>
                            )
                          )}

                          {/* Fallback if neither exist */}
                          {(!shift.opening_video_url || shift.opening_video_url === "NO_VIDEO") && (!shift.closing_video_url || shift.closing_video_url === "NO_VIDEO") && (
                            <span className="text-xs text-gray-400">No Video</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}