// src/types.ts

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;               // SellPriceRM
  cost_price: number;          // BuyPriceRM
  category: string;
  stock_quantity: number;      // Available stock
  stock_reserved: number;      // Omnichannel hold stock
  is_sst_applicable: boolean;  // Tax flag
  is_weighable?: boolean;      // NEW: Scale Integration flag
  image_url?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

// --- NEW: Shop Expenses Management ---
export interface Expense {
  id: number;
  expense_type: string;
  amount: number;
  date: string;
  description: string;
  logged_by: string;
  created_at: string;
}

// --- NEW: Till Management (Shop Opening/Closing) ---

export interface StoreSettings {
  id: number;
  enable_shift_tracking: boolean;
}

export interface ShiftLog {
  id: number;
  opened_at: string;
  closed_at: string | null;
  opened_by: string;
  closed_by: string;
  opening_cash: number;
  expected_cash: number;
  actual_closing_cash: number;
  over_short_amount: number;
  
  total_cash: number;
  cash_count: number; // <-- NEW
  total_qr: number;
  qr_count: number;   // <-- NEW
  total_card: number;
  card_count: number; // <-- NEW
  
  status: string;
  opening_video_url: string;
  closing_video_url: string;
}