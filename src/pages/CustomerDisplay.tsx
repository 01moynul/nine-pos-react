// src/pages/CustomerDisplay.tsx

import { useEffect, useState, useRef } from 'react';
import type { CartItem } from '../types';

export default function CustomerDisplay() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [sstTax, setSstTax] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // --- NEW: Ref to track the bottom of the list ---
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('pos_cart_channel');

    channel.onmessage = (event) => {
      const data = event.data;
      setCart(data.items);
      setSubtotal(data.subtotal);
      setSstTax(data.sstTax);
      setGrandTotal(data.grandTotal);
    };

    return () => channel.close();
  }, []);

  // --- NEW: Auto-scroll effect ---
  // Every time the 'cart' updates, smoothly scroll to the bottom marker
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cart]);

  return (
    // CHANGED: Replaced 'min-h-screen' with 'h-screen overflow-hidden' to lock the screen size
    <div className="h-screen bg-gray-50 flex flex-col p-8 font-sans overflow-hidden">
      
      {/* Header Area (Fixed at top) */}
      <header className="mb-6 text-center shrink-0">
        <h1 className="text-4xl font-extrabold text-gray-800">Your Order</h1>
        <p className="text-gray-500 text-lg mt-2">Thank you for shopping with us!</p>
      </header>

      {/* Main Content: Cart Items (Scrollable Middle Section) */}
      {/* CHANGED: flex-1 ensures it takes up available middle space, overflow-y-auto enables scrolling */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-xl p-6 mb-6">
        {cart.length === 0 ? (
          <div className="flex items-center justify-center h-full text-2xl text-gray-400">
            Awaiting items...
          </div>
        ) : (
          <ul className="space-y-6">
            {cart.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-2xl border-b pb-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-blue-600 bg-blue-100 px-4 py-2 rounded-lg">
                    {item.quantity}x
                  </span>
                  <span className="font-semibold text-gray-800">{item.name}</span>
                </div>
                <span className="font-bold text-gray-800">
                  RM {(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
            {/* --- NEW: Invisible marker at the very bottom of the list for auto-scrolling --- */}
            <div ref={listEndRef} />
          </ul>
        )}
      </div>

      {/* Footer: Totals (Fixed at bottom) */}
      <div className="shrink-0 bg-gray-800 text-white rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-between text-xl mb-3 text-gray-300">
          <span>Subtotal</span>
          <span>RM {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xl mb-6 text-gray-300 border-b border-gray-600 pb-6">
          <span>SST (6%)</span>
          <span>RM {sstTax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-5xl font-extrabold text-green-400">
          <span>Total</span>
          <span>RM {grandTotal.toFixed(2)}</span>
        </div>
      </div>
      
    </div>
  );
}