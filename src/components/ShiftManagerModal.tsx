// src/components/ShiftManagerModal.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { LockOpen, Lock, Camera, AlertCircle } from 'lucide-react';
import type { ShiftLog } from '../types';

interface ShiftManagerModalProps {
  isOpen: boolean;
  type: 'open' | 'close';
  activeShift?: ShiftLog | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShiftManagerModal({ isOpen, type, onClose, onSuccess }: ShiftManagerModalProps) {
  const [step, setStep] = useState<'initial' | 'counting'>('initial');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [securitySessionId, setSecuritySessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');

  // --- NEW: THE CACHE BUG FIX ---
  // Reset the modal state every time it opens so it forgets old numbers
  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setCashAmount('');
      setSecuritySessionId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // SCENARIO B: "Unlock Register" (Kicks drawer & Starts camera)
  const handleUnlock = async () => {
    setLoading(true);
    try {
      // 1. Kick the physical drawer
      await axios.post(`${API_URL}/api/printer/kick-drawer`, {}, { headers: { Authorization: `Bearer ${token}` } });
      
      // 2. Start the security camera to watch the cashier count
      const camRes = await axios.post(`${API_URL}/api/security/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (camRes.data && camRes.data.session_id) {
        setSecuritySessionId(camRes.data.session_id);
      }
      
      // Move to the counting step
      setStep('counting');
    } catch (error) {
      console.error("Failed to unlock register:", error);
      alert("Hardware error: Could not kick drawer or start camera.");
    } finally {
      setLoading(false);
    }
  };

  // CONFIRM OPEN (Saves the float, triggers 15s overhang)
  const handleOpenConfirm = async () => {
    if (!cashAmount || isNaN(Number(cashAmount))) return alert("Please enter a valid amount.");
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/shift/open`, {
        opening_cash: parseFloat(cashAmount),
        session_id: securitySessionId || "camera_bypassed"
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      onSuccess();
    } catch (error) {
      console.error("Failed to open shift:", error);
      alert("Failed to open register.");
    } finally {
      setLoading(false);
    }
  };

  // CONFIRM CLOSE (Calculates math, saves to DB)
    const handleCloseConfirm = async () => {
        if (!cashAmount || isNaN(Number(cashAmount))) return alert("Please enter a valid amount.");
        
        setLoading(true);
        try {
        // The drawer is already kicked open by handleUnlock, so we just send the data!
        const res = await axios.post(`${API_URL}/api/shift/close`, {
            actual_closing_cash: parseFloat(cashAmount),
            session_id: securitySessionId || "camera_bypassed" // <-- NEW: Send camera session to backend
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        const { over_short_amount } = res.data.shift;
        alert(`Shift Closed Successfully!\nDiscrepancy: RM ${over_short_amount.toFixed(2)}`);
        
        onSuccess();
        } catch (error) {
        console.error("Failed to close shift:", error);
        alert("Failed to close register.");
        } finally {
        setLoading(false);
        }
    };

  // --- UI RENDERING ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`p-6 text-white ${type === 'open' ? 'bg-blue-600' : 'bg-gray-800'}`}>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {type === 'open' ? <LockOpen size={24} /> : <Lock size={24} />}
            {type === 'open' ? 'Open Register' : 'Close Register'}
          </h2>
          <p className="text-sm opacity-80 mt-1">
            {type === 'open' ? 'Enter the morning float to begin trading.' : 'Count the till to end your shift.'}
          </p>
        </div>

        <div className="p-6">
          {step === 'initial' ? (
            <div className="text-center space-y-4">
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-left border border-yellow-200">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm">Unlocking the register will kick the cash drawer open and activate the security camera.</p>
              </div>
              <button 
                onClick={handleUnlock} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2"
              >
                <LockOpen size={20} /> Unlock & Count Cash
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {step === 'counting' && (
                <div className="flex items-center justify-center gap-2 text-red-600 font-semibold animate-pulse mb-4">
                  <Camera size={18} /> <span>Security Camera Recording...</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {type === 'open' ? 'Starting Cash (Float)' : 'Actual Cash in Drawer'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold">RM</span>
                  </div>
                  <input
                    type="number" step="0.01" autoFocus
                    className="w-full pl-10 pr-4 py-3 text-xl font-bold rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl">
                  Cancel
                </button>
                <button 
                  onClick={type === 'open' ? handleOpenConfirm : handleCloseConfirm} disabled={loading}
                  className={`flex-1 px-4 py-3 text-white font-bold rounded-xl ${type === 'open' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                >
                  {loading ? 'Processing...' : 'Confirm Amount'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}