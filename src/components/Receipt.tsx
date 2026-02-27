import { forwardRef } from 'react';
import type { CartItem } from '../types';

interface ReceiptProps {
  orderId: number | null;
  items: CartItem[];
  total: number;
  date: string;
}

// forwardRef allows the parent (Dashboard) to reference this DOM element for printing
const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ orderId, items, total, date }, ref) => {
  return (
    <div ref={ref} className="hidden print:block p-4 bg-white text-black font-mono text-sm w-[80mm] mx-auto">
      {/* HEADER */}
      <div className="text-center mb-4 border-b border-black pb-2">
        <h1 className="text-xl font-bold">Nine mini mart</h1>
        <p>A-0-3, PV5 Platinum Hill Condo, Jalan Melati Utama 3, Taman Melati Utama, 53100 Kuala Lumpur</p>
        <p>Tel: +60 17-847 4356</p>
      </div>

      {/* META INFO */}
      <div className="mb-4 text-xs">
        <p>Date: {date}</p>
        <p>Order #: {orderId || 'PENDING'}</p>
        <p>Cashier: Admin</p>
      </div>

      {/* ITEMS TABLE */}
      <div className="mb-4 border-b border-black pb-2">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="w-8">Qty</th>
              <th>Item</th>
              <th className="text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="align-top">{item.quantity}</td>
                <td className="align-top pr-2">{item.name}</td>
                <td className="align-top text-right">
                  {((item.price * item.quantity).toFixed(2))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS */}
      <div className="text-right space-y-1 mb-6">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>RM {items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>SST (6%):</span>
          <span>RM {items.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t border-black pt-1">
          <span>TOTAL:</span>
          <span>RM {total.toFixed(2)}</span>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-xs border-t border-black pt-2">
        <p>Thank you for your visit!</p>
        <p>Please come again.</p>
      </div>
    </div>
  );
});

export default Receipt;