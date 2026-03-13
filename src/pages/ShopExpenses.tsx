// src/pages/ShopExpenses.tsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, DollarSign, Calendar, FileText, Tag, Loader2, ArrowLeft, TrendingUp } from 'lucide-react';
import type { Expense } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// NEW: Interface to match the updated Go backend response
interface ExpenseReport {
  expenses: Expense[];
  total_expenses: number;
  gross_profit: number;
  standing_profit: number;
}

export default function ShopExpenses() {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  const [report, setReport] = useState<ExpenseReport | null>(null);
  
  // NEW: Date Filter State
  const [timeframe, setTimeframe] = useState('today'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [expenseType, setExpenseType] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Defaults to today
  const [description, setDescription] = useState('');

  // Pre-defined categories for the dropdown
  const expenseCategories = ['Utilities', 'Salary', 'Restock', 'Maintenance', 'Marketing', 'Petty Cash', 'Other'];

  // --- API CALLS ---
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query parameters for date filtering
      const params = new URLSearchParams({
        timeframe: timeframe,
        customStart: customStart,
        customEnd: customEnd
      });

      // Fetch the new ExpenseReport object
      const response = await axios.get(`${API_URL}/api/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
      alert('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [timeframe, customStart, customEnd]); // <-- Tells React exactly when to update this function

  // Auto-fetch when the timeframe dropdown changes
  useEffect(() => {
    if (timeframe !== 'custom') {
      fetchExpenses();
    }
  }, [timeframe, fetchExpenses]); // <-- Linter is now perfectly happy

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return alert('Please enter a valid amount.');

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/expenses`, {
        expense_type: expenseType,
        amount: parseFloat(amount),
        date: date,
        description: description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form and refresh list
      setAmount('');
      setDescription('');
      fetchExpenses();
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Failed to log expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExpenses(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense.');
    }
  };

  // --- UI RENDERING ---
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Financial Summary (P&L)
          </h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>

        {/* --- NEW: P&L DASHBOARD & DATE FILTERS --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={20} className="text-gray-500"/>
              Performance Timeframe
            </h2>
            
            {/* Date Filters */}
            <div className="flex items-center gap-3">
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {timeframe === 'custom' && (
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                  <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="p-1.5 bg-transparent border-none outline-none text-sm" />
                  <span className="text-gray-400 font-bold">to</span>
                  <input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="p-1.5 bg-transparent border-none outline-none text-sm" />
                  <button onClick={fetchExpenses} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm font-bold shadow-sm transition-colors">Apply</button>
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-5">
              
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Gross Profit (Sales)</p>
                  <h3 className="text-2xl font-bold text-blue-800">RM {report.gross_profit.toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-blue-200 text-blue-700 rounded-full"><TrendingUp size={24} /></div>
              </div>
              
              <div className="bg-red-50 p-5 rounded-xl border border-red-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Total Expenses</p>
                  <h3 className="text-2xl font-bold text-red-800">- RM {report.total_expenses.toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-red-200 text-red-700 rounded-full"><TrendingUp className="rotate-180" size={24} /></div>
              </div>

              <div className="bg-emerald-50 p-5 rounded-xl border-2 border-emerald-200 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">Standing Profit</p>
                  <h3 className="text-2xl font-bold text-emerald-800">RM {report.standing_profit.toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-emerald-200 text-emerald-700 rounded-full"><DollarSign size={24} /></div>
              </div>

            </div>
          )}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Log New Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            
            {/* Expense Type Dropdown */}
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-2"><Tag size={16}/> Category</label>
              <select 
                value={expenseType} 
                onChange={(e) => setExpenseType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-2"><DollarSign size={16}/> Amount (RM)</label>
              <input 
                type="number" step="0.01" min="0" required
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 150.00"
              />
            </div>

            {/* Date Input */}
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-2"><Calendar size={16}/> Date</label>
              <input 
                type="date" required
                value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-2"><FileText size={16}/> Note / Description</label>
              <textarea 
                rows={3}
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., May Electricity Bill"
              />
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Expenses Data Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h2 className="text-xl font-bold text-gray-800">Expense History</h2>
             <span className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full shadow-sm">
               Total: RM {(report?.total_expenses || 0).toFixed(2)}
             </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 border-b">Date</th>
                  <th className="p-4 border-b">Category</th>
                  <th className="p-4 border-b">Description</th>
                  <th className="p-4 border-b">Amount</th>
                  <th className="p-4 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!report?.expenses || report.expenses.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                      No expenses logged for this timeframe.
                    </td>
                  </tr>
                ) : (
                  report.expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-200">
                          {expense.expense_type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={expense.description}>
                        {expense.description || '-'}
                      </td>
                      <td className="p-4 font-bold text-red-600 whitespace-nowrap">
                        RM {expense.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}