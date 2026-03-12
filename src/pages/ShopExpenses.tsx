// src/pages/ShopExpenses.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, DollarSign, Calendar, FileText, Tag, Loader2, ArrowLeft } from 'lucide-react';
import type { Expense } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ShopExpenses() {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-3 bg-white hover:bg-gray-50 text-gray-800 rounded-full shadow-sm border border-gray-100 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <DollarSign className="text-red-500" size={32} />
            Shop Expenses Management
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Log New Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            
            {/* Expense Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Tag size={16}/> Category</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><DollarSign size={16}/> Amount (RM)</label>
              <input 
                type="number" step="0.01" min="0" required
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 150.00"
              />
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Calendar size={16}/> Date</label>
              <input 
                type="date" required
                value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><FileText size={16}/> Note / Description</label>
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
             <span className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full">
               Total: RM {expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
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
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 italic">No expenses recorded yet.</td>
                  </tr>
                ) : (
                  expenses.map(expense => (
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