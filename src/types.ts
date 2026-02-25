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
  image_url?: string;
}

export interface CartItem extends Product {
  quantity: number;
}