// src/components/PaymentModal.tsx

import { useState } from 'react';
import { X, Printer, Monitor, QrCode, CreditCard, Banknote } from 'lucide-react'; // Using standard lucide icons

// These are the properties the Dashboard will pass to this modal
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onProcessTransaction: (method: string, amountTendered: number) => Promise<boolean>;
  onFinalizeAndClear: (shouldPrint: boolean) => void;
}

export default function PaymentModal({ isOpen, onClose, totalAmount, onProcessTransaction, onFinalizeAndClear }: PaymentModalProps) {
  // We track which screen of the modal we are on
  const [step, setStep] = useState<'select-method' | 'cash-input' | 'qr-confirm' | 'receipt-prompt'>('select-method');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

if (!isOpen) return null;

  const changeDue = parseFloat(tenderedAmount) - totalAmount;
  const isCashValid = parseFloat(tenderedAmount) >= totalAmount;

  // --- NEW: Reset state safely when closing the modal ---
  const handleClose = () => {
    setStep('select-method');
    setTenderedAmount('');
    onClose();
  };

  // --- NEW: Step 1 of Checkout (Save DB & Open Drawer) ---
  const handleProcessPayment = async () => {
    setIsProcessing(true);
    const finalTendered = paymentMethod === 'cash' ? parseFloat(tenderedAmount) : totalAmount;
    
    // Call Dashboard's processTransaction API call
    const success = await onProcessTransaction(paymentMethod, finalTendered);
    
    setIsProcessing(false);
    if (success) {
      setStep('receipt-prompt');
    }
  };

  // --- NEW: Step 2 of Checkout (Print & Clear) ---
  const handleFinalChoice = (shouldPrint: boolean) => {
    setStep('select-method');
    setTenderedAmount('');
    onFinalizeAndClear(shouldPrint);
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

              <div className="pt-4 border-t">
                <button 
                  disabled={!isCashValid || isProcessing}
                  onClick={handleProcessPayment}
                  className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Payment & Open Drawer'}
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

              <div className="pt-4 border-t">
                <button 
                  disabled={isProcessing}
                  onClick={handleProcessPayment}
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Payment Received'}
                </button>
              </div>
            </div>
          )}

          {/* --- NEW STEP 3: Receipt & Change Prompt --- */}
          {step === 'receipt-prompt' && (
            <div className="space-y-6">
              <div className="p-6 bg-green-100 text-green-900 rounded-xl text-center border-2 border-green-300 shadow-inner">
                <p className="text-lg font-bold uppercase tracking-wide text-green-700 mb-2">Transaction Complete</p>
                {paymentMethod === 'cash' ? (
                  <>
                    <p className="text-gray-600 font-semibold mb-1">Change to return:</p>
                    <p className="text-6xl font-black tracking-tight">RM {changeDue >= 0 ? changeDue.toFixed(2) : '0.00'}</p>
                  </>
                ) : (
                  <p className="text-4xl font-black tracking-tight">RM 0.00 Change</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => handleFinalChoice(true)}
                  className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex flex-col items-center justify-center shadow-lg"
                >
                  <Printer size={28} className="mb-2"/> Print Receipt
                </button>
                <button 
                  onClick={() => handleFinalChoice(false)}
                  className="p-4 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold flex flex-col items-center justify-center shadow-lg"
                >
                  <Monitor size={28} className="mb-2"/> Next Customer
                </button>
              </div>
            </div>
          )}

          {/* Global Back Button (Only show if not on the first step or receipt prompt) */}
          {step !== 'select-method' && step !== 'receipt-prompt' && (
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