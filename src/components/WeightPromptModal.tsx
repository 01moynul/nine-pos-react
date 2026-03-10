// src/components/WeightPromptModal.tsx
import { useState } from 'react';

// Define the properties this component expects to receive
interface WeightPromptModalProps {
  isOpen: boolean;           // Controls whether the modal is visible
  productName: string;       // The name of the item being weighed
  onConfirm: (weight: number) => void; // Function to run when 'Add' is clicked
  onClose: () => void;       // Function to run when 'Cancel' is clicked
}

export default function WeightPromptModal({ isOpen, productName, onConfirm, onClose }: WeightPromptModalProps) {
  // Store the input as a string so we can easily append numbers and decimals like "1.5"
  const [input, setInput] = useState('0');

  // If the modal is not open, do not render anything
  if (!isOpen) return null;

  // Handles logic for when a cashier taps a number or decimal on the pad
  const handlePadClick = (val: string) => {
    if (input === '0' && val !== '.') {
      setInput(val); // Replace initial '0' with the typed number
    } else if (val === '.' && input.includes('.')) {
      return; // Prevent adding a second decimal point (e.g., "1.5.2")
    } else {
      setInput(prev => prev + val); // Append the value
    }
  };

  // Clears the current input back to zero
  const handleClear = () => setInput('0');

  // Parses the string into a float64-compatible number and sends it back to the Dashboard
  const handleConfirm = () => {
    const weight = parseFloat(input);
    if (weight > 0) {
      onConfirm(weight);
      setInput('0'); // Reset the pad for the next use
    }
  };

  // Closes the modal without adding anything to the cart
  const handleCancel = () => {
    setInput('0');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-80 p-6 flex flex-col items-center">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Enter Weight</h2>
        <p className="text-sm text-gray-500 mb-4">{productName}</p>

        {/* The Digital Display Screen */}
        <div className="w-full bg-gray-100 rounded-lg p-4 mb-4 text-right border border-gray-200">
          <span className="text-3xl font-mono font-bold text-gray-800">{input}</span>
          <span className="text-gray-500 ml-2">kg</span>
        </div>

        {/* The Numpad Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'].map((num) => (
            <button
              key={num}
              onClick={() => handlePadClick(num)}
              className="bg-gray-50 hover:bg-gray-200 text-xl font-semibold text-gray-800 py-3 rounded-lg border border-gray-200 active:bg-gray-300 transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="bg-red-50 hover:bg-red-100 text-red-600 text-lg font-semibold py-3 rounded-lg border border-red-200 active:bg-red-200 transition-colors"
          >
            CLR
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}