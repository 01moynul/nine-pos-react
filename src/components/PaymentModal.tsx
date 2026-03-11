// src/components/PaymentModal.tsx

import { useState } from 'react';
import { X, Printer, Monitor, QrCode, CreditCard, Banknote } from 'lucide-react'; // Using standard lucide icons

// These are the properties the Dashboard will pass to this modal
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: (method: string, amountTendered: number, shouldPrint: boolean) => void;
}

export default function PaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: PaymentModalProps) {
  // We track which screen of the modal we are on
  const [step, setStep] = useState<'select-method' | 'cash-input' | 'qr-confirm'>('select-method');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');

if (!isOpen) return null;

  const changeDue = parseFloat(tenderedAmount) - totalAmount;
  const isCashValid = parseFloat(tenderedAmount) >= totalAmount;

  // --- NEW: Reset state safely when closing the modal ---
  const handleClose = () => {
    setStep('select-method');
    setTenderedAmount('');
    onClose();
  };

  // Handles the final button clicks
  const handleFinalize = (shouldPrint: boolean) => {
    const finalTendered = paymentMethod === 'cash' ? parseFloat(tenderedAmount) : totalAmount;
    
    // Reset state safely for the next customer
    setStep('select-method');
    setTenderedAmount('');
    onConfirmPayment(paymentMethod, finalTendered, shouldPrint);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={handleClose} className="hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Total Display */}
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm font-semibold uppercase">Total Due</p>
            <p className="text-4xl font-bold text-blue-600">RM {totalAmount.toFixed(2)}</p>
          </div>

          {/* STEP 1: Select Payment Method */}
          {step === 'select-method' && (
            <div className="space-y-3">
              <h3 className="text-center text-gray-700 font-medium mb-4">Select Payment Method</h3>
              
              <button 
                onClick={() => { setPaymentMethod('cash'); setStep('cash-input'); }}
                className="w-full flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors font-bold text-lg"
              >
                 <Banknote size={24} /> Cash
              </button>

              <button 
                onClick={() => { setPaymentMethod('qr'); setStep('qr-confirm'); }}
                className="w-full flex items-center justify-center gap-3 p-4 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors font-bold text-lg"
              >
                 <QrCode size={24} /> QR Pay
              </button>

              <button 
                disabled
                className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100 text-gray-400 rounded-lg border border-gray-200 cursor-not-allowed font-bold text-lg"
              >
                 <CreditCard size={24} /> Card (Coming Soon)
              </button>
            </div>
          )}

          {/* STEP 2A: Cash Input Screen */}
          {step === 'cash-input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Amount Received (RM):</label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="w-full text-3xl p-3 border-2 border-gray-300 rounded-lg text-center focus:border-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              {tenderedAmount !== '' && (
                <div className={`p-4 rounded-lg text-center ${changeDue >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <p className="text-sm font-bold">Change Due:</p>
                  <p className="text-2xl font-bold">RM {changeDue >= 0 ? changeDue.toFixed(2) : '0.00'}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <button 
                  disabled={!isCashValid}
                  onClick={() => handleFinalize(true)}
                  className="p-3 bg-blue-600 text-white rounded-lg font-bold flex flex-col items-center justify-center disabled:opacity-50"
                >
                  <Printer size={20} className="mb-1"/> Print Receipt
                </button>
                <button 
                  disabled={!isCashValid}
                  onClick={() => handleFinalize(false)}
                  className="p-3 bg-gray-800 text-white rounded-lg font-bold flex flex-col items-center justify-center disabled:opacity-50"
                >
                  <Monitor size={20} className="mb-1"/> No Print (Drawer)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: QR Confirm Screen */}
          {step === 'qr-confirm' && (
            <div className="space-y-4">
               <div className="p-4 bg-purple-50 text-purple-800 rounded-lg text-center border border-purple-200">
                  <p className="font-bold">Awaiting QR Scan Confirmation...</p>
                  <p className="text-sm mt-1">Ensure customer has transferred exactly RM {totalAmount.toFixed(2)}</p>
               </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <button 
                  onClick={() => handleFinalize(true)}
                  className="p-3 bg-blue-600 text-white rounded-lg font-bold flex flex-col items-center justify-center"
                >
                  <Printer size={20} className="mb-1"/> Print Receipt
                </button>
                <button 
                  onClick={() => handleFinalize(false)}
                  className="p-3 bg-gray-800 text-white rounded-lg font-bold flex flex-col items-center justify-center"
                >
                  <Monitor size={20} className="mb-1"/> No Print (Drawer)
                </button>
              </div>
            </div>
          )}

          {/* Global Back Button (Only show if not on the first step) */}
          {step !== 'select-method' && (
            <button 
              onClick={() => setStep('select-method')}
              className="mt-4 w-full text-gray-500 font-bold hover:text-gray-800"
            >
              ← Go Back
            </button>
          )}

        </div>
      </div>
    </div>
  );
}